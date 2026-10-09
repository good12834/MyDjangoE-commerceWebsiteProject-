"""Order services: checkout, status transitions, stock, coupon usage."""
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from cart.services import compute_totals
from coupons.models import Coupon, CouponUsage
from coupons.services import validate_coupon
from notifications.services import notify
from products.models import ProductVariant

from .models import DeliveryEstimate, Order, OrderItem, OrderStatusHistory


class CheckoutError(Exception):
    pass


def set_status(order, status, note="", by_user=None, save=True):
    """Move order to a new status; append history and notify the customer."""
    if status == order.status:
        return order
    order.status = status
    if status == Order.Status.DELIVERED:
        order.delivered_at = timezone.now()
    if save:
        order.save()
    OrderStatusHistory.objects.create(order=order, status=status, note=note)
    notify(
        order.user,
        ntype=f"order_{status}",
        title=f"Order {order.order_number} — {order.get_status_display()}",
        body=note or "Your order status was updated.",
        data={"order_id": order.pk, "order_number": order.order_number, "status": status},
    )
    return order


@transaction.atomic
def place_order(user, cart, address_data, delivery_method=Order.DeliveryMethod.STANDARD,
                payment_method="card"):
    """Validate the cart, create the order + items, decrement stock, record coupon usage."""
    items = list(
        cart.items.filter(saved_for_later=False).select_related("product", "variant", "product__category")
    )
    if not items:
        raise CheckoutError("Your cart is empty.")

    # ---- stock validation (re-checked atomically) ----
    for item in items:
        available = item.variant.stock if item.variant else item.product.total_stock
        if item.quantity > available:
            name = item.product.name
            if item.variant:
                parts = [p for p in (item.variant.color, item.variant.size) if p]
                name += f" ({'/'.join(parts)})"
            raise CheckoutError(f"Insufficient stock for {name}. Only {available} left.")

    # ---- coupon ----
    subtotal = sum((i.line_total for i in items), Decimal("0"))
    discount = Decimal("0")
    coupon_code = ""
    coupon = None
    if cart.coupon:
        coupon, discount, _ = validate_coupon(cart.coupon.code, subtotal, user)
        if discount > 0:
            coupon_code = cart.coupon.code

    totals = compute_totals(cart, delivery_method)
    totals["discount"] = discount
    totals["total"] = max(subtotal - discount, Decimal("0")) + totals["shipping"] + totals["tax"]

    order = Order.objects.create(
        user=user,
        delivery_method=delivery_method,
        subtotal=subtotal,
        discount=discount,
        shipping=totals["shipping"],
        tax=totals["tax"],
        total=totals["total"],
        coupon_code=coupon_code,
        **{f"ship_{k}": v for k, v in address_data.items()},
    )
    OrderStatusHistory.objects.create(order=order, status=Order.Status.PENDING,
                                      note="Order placed.")

    for item in items:
        OrderItem.objects.create(
            order=order,
            product=item.product,
            variant=item.variant,
            seller=item.product.seller,
            product_name=item.product.name,
            product_image=item.product.primary_image or "",
            variant_label="/".join(p for p in (item.variant.color, item.variant.size) if p) if item.variant else "",
            unit_price=item.unit_price,
            quantity=item.quantity,
            line_total=item.line_total,
        )
        # decrement stock
        if item.variant:
            variant = ProductVariant.objects.select_for_update().get(pk=item.variant.pk)
            variant.stock = max(variant.stock - item.quantity, 0)
            variant.save(update_fields=["stock"])
        else:
            product = item.product
            for v in product.variants.all():
                v.stock = 0  # no variant chosen: consume all (edge case)
                v.save(update_fields=["stock"])
        item.product.sold_count += item.quantity
        item.product.save(update_fields=["sold_count"])

    # ---- coupon usage ----
    if coupon and discount > 0:
        CouponUsage.objects.create(
            coupon=coupon, user=user, order=order, discount_amount=discount
        )
        coupon.used_count += 1
        coupon.save(update_fields=["used_count"])

    # ---- clear cart (keep saved-for-later) ----
    cart.items.filter(saved_for_later=False).delete()
    cart.coupon = None
    cart.save(update_fields=["coupon"])

    notify(
        user,
        ntype="order_placed",
        title=f"Order {order.order_number} confirmed ",
        body=f"Total ${order.total}. Estimated delivery: {DeliveryEstimate.eta_for(order).date() if DeliveryEstimate.eta_for(order) else '—'}",
        data={"order_id": order.pk, "order_number": order.order_number},
    )
    return order


def check_low_stock(variant):
    from django.conf import settings as s

    if 0 < variant.stock <= s.LOW_STOCK_THRESHOLD and variant.product.seller:
        notify(
            variant.product.seller,
            ntype="low_stock",
            title=f" Low stock: {variant.product.name}",
            body=f"{variant.color or 'Item'} / {variant.size or 'One size'} has only {variant.stock} left.",
            data={"product_id": variant.product.pk},
        )
