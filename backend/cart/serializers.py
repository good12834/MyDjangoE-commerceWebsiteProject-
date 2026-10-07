"""Cart serializers."""
from django.conf import settings
from rest_framework import serializers

from products.serializers import ProductCardSerializer

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductCardSerializer(read_only=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    variant_label = serializers.SerializerMethodField()
    available_stock = serializers.SerializerMethodField()
    variant_id = serializers.IntegerField(source="variant.id", read_only=True, default=None)

    class Meta:
        model = CartItem
        fields = [
            "id", "product", "variant_id", "variant_label", "quantity",
            "unit_price", "line_total", "saved_for_later", "available_stock",
            "added_at",
        ]
        read_only_fields = ["added_at"]

    def get_variant_label(self, obj):
        if not obj.variant:
            return ""
        parts = [p for p in (obj.variant.color, obj.variant.size) if p]
        return " / ".join(parts)

    def get_available_stock(self, obj):
        return obj.available_stock()


class CartTotalsSerializer(serializers.Serializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2)
    shipping = serializers.DecimalField(max_digits=12, decimal_places=2)
    tax = serializers.DecimalField(max_digits=12, decimal_places=2)
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    coupon_code = serializers.CharField(allow_null=True)
    free_shipping_threshold = serializers.DecimalField(max_digits=12, decimal_places=2)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    totals = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "totals", "item_count", "updated_at"]

    def get_item_count(self, obj):
        return obj.items.filter(saved_for_later=False).count()

    def get_totals(self, obj):
        from .services import compute_totals

        return compute_totals(obj)


class AddItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, default=1)
