from rest_framework import serializers

from products.serializers import ProductCardSerializer

from .models import Wishlist, WishlistItem


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductCardSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "added_at"]


class WishlistSerializer(serializers.ModelSerializer):
    items = WishlistItemSerializer(many=True, read_only=True)
    product_ids = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = ["id", "items", "product_ids", "share_token"]

    def get_product_ids(self, obj):
        return list(obj.items.values_list("product_id", flat=True))
