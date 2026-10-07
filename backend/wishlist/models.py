"""Wishlist."""
import uuid

from django.conf import settings
from django.db import models


class Wishlist(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wishlist")
    share_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Wishlist of {self.user.username}"


class WishlistItem(models.Model):
    wishlist = models.ForeignKey(Wishlist, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="wishlist_items")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("wishlist", "product")]
        ordering = ["-added_at"]

    def __str__(self):
        return f"{self.product.name} in {self.wishlist}"
