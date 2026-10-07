"""Celery background tasks (run eagerly without a broker, via Redis when configured)."""
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def send_order_confirmation_email(order_id):
    from orders.models import Order

    order = Order.objects.filter(pk=order_id).select_related("user").first()
    if not order:
        return
    lines = "\n".join(f"  {i.quantity} × {i.product_name} — ${i.line_total}" for i in order.items.all())
    send_mail(
        f"Your ShopHub order {order.order_number} is confirmed ",
        (
            f"Hi {order.ship_full_name},\n\n"
            f"Order: {order.order_number}\nTotal: ${order.total}\n\nItems:\n{lines}\n\n"
            f"Thank you for shopping with ShopHub!"
        ),
        settings.DEFAULT_FROM_EMAIL,
        [order.user.email],
        fail_silently=True,
    )
    logger.info("Order confirmation email sent for %s", order.order_number)


@shared_task
def send_status_email(order_id, status_label):
    from orders.models import Order

    order = Order.objects.filter(pk=order_id).select_related("user").first()
    if not order:
        return
    send_mail(
        f"Order {order.order_number} — {status_label}",
        f"Hi {order.ship_full_name},\n\nYour order {order.order_number} is now: {status_label}.\n",
        settings.DEFAULT_FROM_EMAIL,
        [order.user.email],
        fail_silently=True,
    )


@shared_task
def notify_low_inventory():
    """Notify sellers when stock <= threshold."""
    from django.db.models import Sum

    from notifications.services import notify
    from products.models import Product

    for product in Product.objects.filter(status=Product.Status.ACTIVE).prefetch_related("variants"):
        stock = product.variants.aggregate(s=Sum("stock"))["s"] or 0
        if 0 < stock <= settings.LOW_STOCK_THRESHOLD and product.seller:
            notify(
                product.seller,
                ntype="low_stock",
                title=f" Low stock: {product.name}",
                body=f"Only {stock} units left. Time to restock!",
                data={"product_id": product.pk},
            )


@shared_task
def expire_coupons():
    from coupons.models import Coupon

    now = timezone.now()
    deactivated = Coupon.objects.filter(active=True, valid_to__lt=now).update(active=False)
    logger.info("Deactivated %s expired coupons", deactivated)
    return deactivated


@shared_task
def refresh_flash_sales():
    """Clear expired flash-sale markers so they disappear from the storefront."""
    from products.models import Product

    count = Product.objects.filter(flash_sale_end__lt=timezone.now()).update(flash_sale_end=None)
    return count


@shared_task
def abandoned_cart_reminders():
    """Email users whose carts sat untouched for 24h+ (simple heuristic: updated_at)."""
    from datetime import timedelta

    from cart.models import Cart

    cutoff = timezone.now() - timedelta(hours=24)
    for cart in Cart.objects.filter(updated_at__lt=cutoff, user__isnull=False).prefetch_related("items"):
        if not cart.items.filter(saved_for_later=False).exists():
            continue
        send_mail(
            "You left something in your ShopHub cart ",
            "Your cart is waiting — come back and complete your order!",
            settings.DEFAULT_FROM_EMAIL,
            [cart.user.email],
            fail_silently=True,
        )
