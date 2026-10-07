from rest_framework import serializers

from .models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "code", "description", "discount_type", "value",
            "min_order_amount", "max_discount", "valid_to",
        ]
