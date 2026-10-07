"""Seller API: dashboard + product/order management."""
from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product
from products.serializers import ProductCardSerializer, ProductWriteSerializer

from .models import SellerProfile
from .serializers import SellerDashboardSerializer, SellerProfileSerializer


def seller_stats(user):
    """Aggregate revenue/orders/customers for a seller's products."""
    sales = user.sales.all()
    revenue = sales.aggregate(sum=Sum("line_total"))["sum"] or 0
    orders = sales.values("order").distinct().count()
    customers = sales.values("order__user").distinct().exclude(order__user=None).count()
    return revenue, orders, customers


class SellerProfileViewSet(viewsets.ModelViewSet):
    serializer_class = SellerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SellerProfile.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        profile, _ = SellerProfile.objects.get_or_create(
            user=request.user,
            defaults={"store_name": f"{request.user.username}'s Store"},
        )
        return Response(SellerProfileSerializer(profile).data)


class SellerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        products = Product.objects.filter(seller=user).select_related("category", "brand").prefetch_related("images", "variants")
        revenue, orders, customers = seller_stats(user)
        low_stock = [v for v in products if v.total_stock and v.total_stock <= 5]
        pending_orders = user.sales.filter(order__status__in=["pending", "paid"]).values("order").distinct().count()

        # last 14 days sales series
        today = timezone.now().date()
        series = []
        for i in range(13, -1, -1):
            day = today - timedelta(days=i)
            day_total = (
                user.sales.filter(order__created_at__date=day).aggregate(sum=Sum("line_total"))["sum"]
                or 0
            )
            series.append({"date": day.isoformat(), "revenue": float(day_total)})

        top = sorted(products, key=lambda p: p.sold_count, reverse=True)[:5]
        recent_orders = (
            user.sales.select_related("order", "order__user").order_by("-order__created_at")[:10]
        )
        seen = set()
        recent = []
        for sale in recent_orders:
            if sale.order_id in seen:
                continue
            seen.add(sale.order_id)
            recent.append({
                "order_number": sale.order.order_number,
                "customer": sale.order.user.username if sale.order.user else "—",
                "status": sale.order.status,
                "total": float(sale.order.total),
                "date": sale.order.created_at.isoformat(),
            })
        data = {
            "revenue": revenue,
            "orders": orders,
            "products": products.count(),
            "customers": customers,
            "low_stock_count": len(low_stock),
            "pending_orders": pending_orders,
            "recent_orders": recent,
            "top_products": ProductCardSerializer(top, many=True).data,
            "sales_by_day": series,
        }
        return Response(SellerDashboardSerializer(data).data)


class SellerProductsView(APIView):
    """Full product management for the seller's own products."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        include_all = request.query_params.get("all") == "1"
        qs = Product.objects.filter(seller=request.user)
        if not include_all:
            qs = qs.exclude(status=Product.Status.ARCHIVED)
        qs = qs.select_related("category", "brand").prefetch_related("images", "variants")
        return Response(ProductCardSerializer(qs, many=True).data)

    def post(self, request):
        serializer = ProductWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        product = serializer.save(seller=request.user)
        return Response(ProductCardSerializer(product).data, status=201)
