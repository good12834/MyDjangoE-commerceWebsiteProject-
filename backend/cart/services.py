"""Cart business logic."""
from decimal import Decimal

from django.conf import settings

from .models import Cart, CartItem


def resolve_cart(request, create=False):
    """Find the current cart for a request: user cart preferred, else device cart."""
    user = request.user if request.user.is_authenticated else None
    device_token = (request.headers.get("X-Cart-Token") or "").strip()

    if user:
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart
    if create and device_token:
        cart, _ = Cart.objects.get_or_create(device_token=device_token, defaults={})
        return cart
    if device_token:
        return Cart.objects.filter(device_token=device_token).first()
    return None


def compute_totals(cart, delivery_method="standard"):
    """Compute subtotal / discount / shipping / tax / total for a cart."""
    active_items = cart.items.filter(saved_for_later=False).select_related("product", "variant")
    subtotal = sum((item.line_total for item in active_items), Decimal("0"))

    discount = Decimal("0")
    coupon_code = None
    if cart.coupon:
        from coupons.services import validate_coupon

        _, discount, _ = validate_coupon(
            cart.coupon.code, subtotal, getattr(cart, "user", None)
        )
        if discount > 0:
            coupon_code = cart.coupon.code
        else:
            coupon_code = cart.coupon.code  # keep shown but not applied

    discounted = max(subtotal - discount, Decimal("0"))
    base_shipping = (
        Decimal("0")
        if discounted >= Decimal(str(settings.FREE_SHIPPING_THRESHOLD))
        else Decimal(str(settings.SHIPPING_FLAT_RATE))
    )
    delivery_surcharge = {
        "standard": Decimal("0"),
        "express": Decimal("9.99"),
        "same_day": Decimal("19.99"),
    }.get(delivery_method, Decimal("0"))
    shipping = base_shipping + delivery_surcharge
    tax = (discounted * Decimal(str(settings.TAX_RATE))).quantize(Decimal("0.01"))
    total = discounted + shipping + tax
    return {
        "subtotal": subtotal,
        "discount": discount,
        "shipping": shipping,
        "tax": tax,
        "total": total,
        "coupon_code": coupon_code,
        "free_shipping_threshold": Decimal(str(settings.FREE_SHIPPING_THRESHOLD)),
    }


def merge_device_cart_into_user(device_token, user):
    """After login: move anonymous cart items into the user's cart."""
    if not device_token:
        return
    device_cart = Cart.objects.filter(device_token=device_token).first()
    if not device_cart:
        return
    user_cart, _ = Cart.objects.get_or_create(user=user)
    # list() first: we reassign each row's cart FK inside the loop,
    # so iterating the live queryset would skip rows.
    for item in list(device_cart.items.all()):
        existing = CartItem.objects.filter(
            cart=user_cart, product=item.product, variant=item.variant
        ).first()
        if existing:
            existing.quantity += item.quantity
            existing.saved_for_later = existing.saved_for_later or item.saved_for_later
            existing.save(update_fields=["quantity", "saved_for_later"])
            item.delete()
        else:
            item.cart = user_cart
            item.save(update_fields=["cart"])
    if device_cart.coupon and not user_cart.coupon:
        user_cart.coupon = device_cart.coupon
        user_cart.save(update_fields=["coupon"])
    device_cart.delete()
