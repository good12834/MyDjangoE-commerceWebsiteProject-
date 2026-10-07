"""Product filtering."""
import django_filters
from django.db.models import F, Q, Sum

from .models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(method="filter_category")
    brand = django_filters.CharFilter(method="filter_brand")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    size = django_filters.CharFilter(method="filter_size")
    color = django_filters.CharFilter(method="filter_color")
    material = django_filters.CharFilter(lookup_expr="icontains")
    min_rating = django_filters.NumberFilter(field_name="rating_avg", lookup_expr="gte")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock")
    on_sale = django_filters.BooleanFilter(method="filter_on_sale")
    featured = django_filters.BooleanFilter(field_name="is_featured")
    seller = django_filters.CharFilter(method="filter_seller")
    flash_sale = django_filters.BooleanFilter(method="filter_flash_sale")

    class Meta:
        model = Product
        fields = []

    def filter_category(self, qs, name, value):
        # Accept a category slug or id; include child categories.
        from .models import Category

        try:
            cat = Category.objects.get(slug=value)
        except Category.DoesNotExist:
            try:
                cat = Category.objects.get(pk=value)
            except (Category.DoesNotExist, ValueError):
                return qs
        ids = cat.descendant_ids()
        return qs.filter(category_id__in=ids)

    def filter_brand(self, qs, name, value):
        slugs = [v.strip() for v in value.split(",") if v.strip()]
        return qs.filter(brand__slug__in=slugs)

    def filter_size(self, qs, name, value):
        sizes = [v.strip() for v in value.split(",") if v.strip()]
        q = Q()
        for s in sizes:
            q |= Q(sizes__icontains=s)
        return qs.filter(q)

    def filter_color(self, qs, name, value):
        colors = [v.strip() for v in value.split(",") if v.strip()]
        q = Q()
        for c in colors:
            q |= Q(colors__icontains=c)
        return qs.filter(q)

    def filter_in_stock(self, qs, name, value):
        if value:
            return qs.annotate(stock_total=Sum("variants__stock")).filter(stock_total__gt=0)
        return qs

    def filter_on_sale(self, qs, name, value):
        if value:
            return qs.filter(compare_price__isnull=False, compare_price__gt=F("price"))
        return qs

    def filter_flash_sale(self, qs, name, value):
        from django.utils import timezone

        if value:
            return qs.filter(flash_sale_end__gt=timezone.now())
        return qs

    def filter_seller(self, qs, name, value):
        return qs.filter(seller__seller_profile__slug=value)
