"""Sellers / marketplace vendors."""
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class SellerProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="seller_profile"
    )
    store_name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    bio = models.TextField(blank=True)
    logo = models.ImageField(upload_to="seller_logos/", blank=True, null=True)
    is_approved = models.BooleanField(default=True)
    payout_email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.store_name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.store_name)[:130]
            self.slug = base
            if SellerProfile.objects.exclude(pk=self.pk).filter(slug=self.slug).exists():
                from django.utils.crypto import get_random_string

                self.slug = f"{base}-{get_random_string(4).lower()}"
        super().save(*args, **kwargs)

    @property
    def product_count(self):
        return self.user.products.count()

    @property
    def total_revenue(self):
        from django.db.models import Sum

        total = (
            self.user.sales.aggregate(sum=Sum("line_total"))["sum"]
        )
        return total or 0
