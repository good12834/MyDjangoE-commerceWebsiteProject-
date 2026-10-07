"""Shopping cart (supports logged-in and anonymous device carts)."""
from django.conf import settings
from django.db import models


class Cart(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.CASCADE, related_name="carts",
    )
    device_token = models.CharField(max_length=64, blank=True, db_index=True)
    coupon = models.ForeignKey(
        "coupons.Coupon", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="carts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user"], condition=models.Q(user__isnull=False), name="one_cart_per_user"),
        ]

    def __str__(self):
        owner = self.user.username if self.user else f"device:{self.device_token[:8]}"
        return f"Cart({owner})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="cart_items")
    variant = models.ForeignKey(
        "products.ProductVariant", null=True, blank=True, on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    saved_for_later = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-added_at"]
        unique_together = [("cart", "product", "variant")]

    def __str__(self):
        return f"{self.quantity} × {self.product.name}"

    @property
    def unit_price(self):
        return self.variant.effective_price if self.variant else self.product.price

    @property
    def line_total(self):
        return self.unit_price * self.quantity

    def available_stock(self):
        return self.variant.stock if self.variant else self.product.total_stock
