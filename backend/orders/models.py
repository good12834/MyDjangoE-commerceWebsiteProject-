"""Orders and tracking."""
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Order Placed"
        PAID = "paid", "Payment Confirmed"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for Delivery"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    class DeliveryMethod(models.TextChoices):
        STANDARD = "standard", "Standard (3-5 days)"
        EXPRESS = "express", "Express (1-2 days)"
        SAME_DAY = "same_day", "Same Day"

    ORDER_FLOW = [
        Status.PENDING, Status.PAID, Status.PROCESSING,
        Status.SHIPPED, Status.OUT_FOR_DELIVERY, Status.DELIVERED,
    ]

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    delivery_method = models.CharField(
        max_length=20, choices=DeliveryMethod.choices, default=DeliveryMethod.STANDARD
    )

    # Address snapshot
    ship_full_name = models.CharField(max_length=120)
    ship_phone = models.CharField(max_length=32)
    ship_line1 = models.CharField(max_length=255)
    ship_line2 = models.CharField(max_length=255, blank=True)
    ship_city = models.CharField(max_length=100)
    ship_state = models.CharField(max_length=100)
    ship_postal_code = models.CharField(max_length=20)
    ship_country = models.CharField(max_length=100)

    # Money
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    shipping = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    coupon_code = models.CharField(max_length=32, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        if not self.order_number:
            from django.utils.crypto import get_random_string

            self.order_number = f"SH{get_random_string(8, '0123456789')}"
        super().save(*args, **kwargs)

    @property
    def status_index(self):
        try:
            return self.ORDER_FLOW.index(self.status)
        except ValueError:
            return -1


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "products.Product", null=True, on_delete=models.SET_NULL, related_name="order_items"
    )
    variant = models.ForeignKey(
        "products.ProductVariant", null=True, blank=True, on_delete=models.SET_NULL
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="sales",
    )
    # Snapshots so history survives product edits/deletes
    product_name = models.CharField(max_length=255)
    product_image = models.CharField(max_length=500, blank=True)
    variant_label = models.CharField(max_length=100, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} × {self.product_name}"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="history")
    status = models.CharField(max_length=20, choices=Order.Status.choices)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name_plural = "order status histories"


class DeliveryEstimate:
    """Helper for ETA display."""

    DAYS = {"standard": 5, "express": 2, "same_day": 0}

    @classmethod
    def eta_for(cls, order):
        days = cls.DAYS.get(order.delivery_method, 5)
        if order.status == Order.Status.DELIVERED:
            return order.delivered_at
        return timezone.now() + timezone.timedelta(days=days)
