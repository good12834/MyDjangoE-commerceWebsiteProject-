"""Coupon system."""
from decimal import Decimal

from django.db import models
from django.utils import timezone


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENT = "percent", "Percentage"
        FIXED = "fixed", "Fixed amount"

    code = models.CharField(max_length=32, unique=True)
    description = models.CharField(max_length=255, blank=True)
    discount_type = models.CharField(
        max_length=10, choices=DiscountType.choices, default=DiscountType.PERCENT
    )
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Cap for percentage coupons.",
    )
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code

    def is_valid(self):
        now = timezone.now()
        if not self.active:
            return False, "This coupon is inactive."
        if self.valid_from and now < self.valid_from:
            return False, "This coupon is not active yet."
        if self.valid_to and now > self.valid_to:
            return False, "This coupon has expired."
        if self.usage_limit is not None and self.used_count >= self.usage_limit:
            return False, "This coupon has reached its usage limit."
        return True, "Valid"

    def compute_discount(self, subtotal: Decimal) -> Decimal:
        """Return the discount amount for a given subtotal (validated coupon)."""
        if subtotal < self.min_order_amount:
            return Decimal("0")
        if self.discount_type == self.DiscountType.PERCENT:
            discount = subtotal * self.value / Decimal("100")
            if self.max_discount is not None:
                discount = min(discount, self.max_discount)
        else:
            discount = min(self.value, subtotal)
        return discount.quantize(Decimal("0.01"))

    def allowed_for_user(self, user):
        if user.is_authenticated:
            return not CouponUsage.objects.filter(coupon=self, user=user).exists()
        return True


class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="usages")
    user = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="coupon_usages"
    )
    order = models.ForeignKey("orders.Order", null=True, blank=True, on_delete=models.SET_NULL)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)
