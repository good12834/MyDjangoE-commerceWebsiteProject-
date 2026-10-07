"""Seller serializers."""
from django.db.models import Sum
from rest_framework import serializers

from accounts.models import User
from products.serializers import ProductCardSerializer

from .models import SellerProfile


class SellerProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id", "store_name", "slug", "bio", "logo", "is_approved",
            "payout_email", "username", "product_count", "created_at",
        ]
        read_only_fields = ["is_approved", "username", "product_count", "created_at"]


class SellerDashboardSerializer(serializers.Serializer):
    revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    orders = serializers.IntegerField()
    products = serializers.IntegerField()
    customers = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    recent_orders = serializers.ListField()
    top_products = serializers.ListField()
    sales_by_day = serializers.ListField()
