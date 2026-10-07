from django.contrib import admin

from .models import Coupon, CouponUsage


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        "code", "discount_type", "value", "min_order_amount",
        "valid_to", "used_count", "usage_limit", "active",
    ]
    list_filter = ["active", "discount_type"]
    search_fields = ["code"]


admin.site.register(CouponUsage)
