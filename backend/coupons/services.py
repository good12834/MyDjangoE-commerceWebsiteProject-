"""Coupon validation logic."""
from decimal import Decimal

from .models import Coupon


def validate_coupon(code: str, subtotal: Decimal, user=None):
    """Returns (coupon, discount, error_message)."""
    try:
        coupon = Coupon.objects.get(code__iexact=code.strip())
    except Coupon.DoesNotExist:
        return None, Decimal("0"), "Coupon not found."

    ok, msg = coupon.is_valid()
    if not ok:
        return coupon, Decimal("0"), msg

    if subtotal < coupon.min_order_amount:
        return (
            coupon,
            Decimal("0"),
            f"Minimum purchase of ${coupon.min_order_amount} required.",
        )

    if user is not None and not coupon.allowed_for_user(user):
        return coupon, Decimal("0"), "You have already used this coupon."

    discount = coupon.compute_discount(subtotal)
    if discount <= 0:
        return coupon, Decimal("0"), "Coupon does not apply to this order."

    return coupon, discount, ""
