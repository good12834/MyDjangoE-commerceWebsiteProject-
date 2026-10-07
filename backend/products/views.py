"""Catalog views."""
from django.db.models import Count, FloatField, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from orders.models import OrderItem  # noqa: E402  (safe: no circular import at runtime)
from reviews.models import Review

from .filters import ProductFilter
from .models import Brand, Category, Product, ProductView, SearchHistory
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductCardSerializer,
    ProductDetailSerializer,
    ProductWriteSerializer,
)


def session_key(request):
    return request.headers.get("X-Cart-Token", "")[:64]


class ProductViewSet(viewsets.ModelViewSet):
    """Public catalog + seller/admin write access."""

    queryset = (
        Product.objects.select_related("category", "brand", "seller")
        .prefetch_related("images", "variants")
        .filter(status=Product.Status.ACTIVE)
    )
    permission_classes = [AllowAny]
    # Product detail pages are addressed by slug (e.g. /product/novabook-pro-14/).
    lookup_field = "slug"
    filterset_class = ProductFilter
    search_fields = ["name", "description", "brand__name", "category__name"]
    ordering_fields = [
        "price", "created_at", "rating_avg", "sold_count", "view_count",
    ]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductCardSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated()]
        return super().get_permissions()

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        ordering = self.request.query_params.get("ordering", "")
        if not ordering:
            # Default: featured first, then newest
            qs = qs.order_by("-is_featured", "-created_at")
        if "discount" in ordering:
            qs = qs.filter(compare_price__isnull=False).order_by("-compare_price", "price")
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.view_count += 1
        instance.save(update_fields=["view_count"])
        if request.user.is_authenticated:
            ProductView.objects.update_or_create(
                user=request.user, product=instance, defaults={}
            )
        else:
            key = session_key(request)
            if key:
                ProductView.objects.update_or_create(
                    session_key=key, product=instance, defaults={}
                )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def trending(self, request):
        qs = self.get_queryset().annotate(rank=Coalesce("sold_count", 0) + Coalesce("view_count", 0))
        page = self.paginate_queryset(qs.order_by("-rank"))
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @action(detail=False, methods=["get"])
    def flash_sale(self, request):
        now = timezone.now()
        qs = self.get_queryset().filter(flash_sale_end__gt=now).order_by("flash_sale_end")
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @action(detail=False, methods=["get"])
    def new_arrivals(self, request):
        page = self.paginate_queryset(self.get_queryset().order_by("-created_at")[:24])
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @action(detail=False, methods=["get"])
    def best_sellers(self, request):
        page = self.paginate_queryset(self.get_queryset().order_by("-sold_count")[:24])
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def recently_viewed(self, request):
        views = (
            ProductView.objects.filter(user=request.user)
            .select_related("product")
            .prefetch_related("images", "variants")
            .order_by("-viewed_at")[:20]
        )
        products = [v.product for v in views]
        return Response(ProductCardSerializer(products, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def recommended(self, request):
        """Content-based recommendations from the user's signals:
        purchase history + wishlist + browsing history."""
        from wishlist.models import WishlistItem

        ordered_ids = []
        seen = set()

        def add_ids(qs):
            for pid in qs.values_list("pk", flat=True):
                if pid not in seen:
                    seen.add(pid)
                    ordered_ids.append(pid)

        # 1) Frequently bought together: items from orders the user made
        bought_ids = list(
            OrderItem.objects.filter(order__user=request.user).values_list("product_id", flat=True)
        )
        if bought_ids:
            co_bought = (
                OrderItem.objects.filter(order__user=request.user)
                .exclude(product_id__in=bought_ids)
                .values("product_id")
                .annotate(n=Count("id"))
                .order_by("-n")
            )
            add_ids(Product.objects.filter(pk__in=[c["product_id"] for c in co_bought]))
            # 2) Same categories as purchased items
            cats = Product.objects.filter(pk__in=bought_ids).values_list("category_id", flat=True)
            add_ids(
                Product.objects.filter(category_id__in=cats, status=Product.Status.ACTIVE)
                .exclude(pk__in=bought_ids).order_by("-sold_count")
            )
        # 3) Wishlisted categories
        wish_cats = list(
            WishlistItem.objects.filter(wishlist__user=request.user).values_list("product__category_id", flat=True)
        )
        if wish_cats:
            add_ids(
                Product.objects.filter(category_id__in=wish_cats, status=Product.Status.ACTIVE)
                .order_by("-rating_avg")
            )
        # 4) Browsing history categories
        view_cats = list(
            ProductView.objects.filter(user=request.user).values_list("product__category_id", flat=True)
        )
        if view_cats:
            add_ids(
                Product.objects.filter(category_id__in=view_cats, status=Product.Status.ACTIVE)
                .order_by("-view_count")
            )
        # 5) Global fallback
        add_ids(self.get_queryset().order_by("-sold_count"))

        products = (
            Product.objects.filter(pk__in=ordered_ids[:24], status=Product.Status.ACTIVE)
            .select_related("category", "brand").prefetch_related("images", "variants")
        )
        by_id = {p.pk: p for p in products}
        candidates = [by_id[pid] for pid in ordered_ids if pid in by_id]
        return Response(ProductCardSerializer(candidates[:24], many=True).data)

    @action(detail=True, methods=["get"])
    def related(self, request, slug=None):
        product = self.get_object()
        qs = self.get_queryset().filter(category=product.category).exclude(pk=product.pk)
        qs = qs.order_by("-rating_avg", "-sold_count")[:8]
        return Response(ProductCardSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def frequently_bought_together(self, request, slug=None):
        """Products most often co-purchased with this one."""
        product = self.get_object()
        product_orders = OrderItem.objects.filter(product_id=product.pk).values_list("order_id", flat=True)
        qs = (
            OrderItem.objects.filter(order_id__in=product_orders)
            .exclude(product_id=product.pk)
            .values("product_id")
            .annotate(times=Count("id"))
            .order_by("-times")[:6]
        )
        products = Product.objects.filter(
            pk__in=[row["product_id"] for row in qs], status=Product.Status.ACTIVE
        ).select_related("category", "brand").prefetch_related("images", "variants")
        return Response(ProductCardSerializer(products, many=True).data)

    @action(detail=False, methods=["get"])
    def search_suggest(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"products": [], "categories": [], "brands": []})
        products = self.get_queryset().filter(name__icontains=q)[:6]
        categories = Category.objects.filter(name__icontains=q)[:4]
        brands = Brand.objects.filter(name__icontains=q)[:4]
        return Response({
            "products": [{"id": p.pk, "name": p.name, "slug": p.slug, "price": str(p.price)} for p in products],
            "categories": CategorySerializer(categories, many=True).data,
            "brands": BrandSerializer(brands, many=True).data,
        })

    @action(detail=False, methods=["post"])
    def track_search(self, request):
        q = (request.data.get("q") or "").strip()[:255]
        count = int(request.data.get("results_count") or 0)
        if q:
            SearchHistory.objects.create(
                user=request.user if request.user.is_authenticated else None,
                session_key=session_key(request),
                query=q,
                results_count=count,
            )
        return Response({"ok": True})

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def search_history(self, request):
        qs = SearchHistory.objects.filter(user=request.user).values("query", "created_at")[:10]
        return Response(list(qs))


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        Category.objects.filter(is_active=True)
        .select_related("parent")
        .prefetch_related("children")
        .annotate(
            product_count_direct=Count(
                "products", filter=Q(products__status=Product.Status.ACTIVE), distinct=True
            ),
            product_count_children=Count(
                "children__products",
                filter=Q(children__products__status=Product.Status.ACTIVE),
                distinct=True,
            ),
        )
    )
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    # Reference list (nav menus, filters, dropdowns) — always return the full array.
    pagination_class = None
    lookup_field = "slug"
    search_fields = ["name"]

    @action(detail=True, methods=["get"])
    def tree(self, request, slug=None):
        roots = CategoryViewSet.queryset.filter(parent__isnull=True)
        data = CategorySerializer(roots, many=True).data
        return Response(data)


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [AllowAny]
    # Reference list (filter sidebars, dropdowns) — always return the full array.
    pagination_class = None
    lookup_field = "slug"
    search_fields = ["name"]
