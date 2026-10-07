"""User accounts, roles and addresses."""
import secrets
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user with ShopHub roles (customer / seller / admin)."""

    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        SELLER = "seller", "Seller"
        ADMIN = "admin", "Admin"

    email = models.EmailField("email address", unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone = models.CharField(max_length=32, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=64, blank=True)
    password_reset_token = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username

    @property
    def is_shop_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    def generate_token(self, field):
        token = secrets.token_urlsafe(32)
        setattr(self, field, token)
        self.save(update_fields=[field])
        return token


class Address(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="addresses"
    )
    label = models.CharField(max_length=50, default="Home")  # Home / Work / Other
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=32)
    line1 = models.CharField(max_length=255)
    line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default="United States")
    is_default = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "addresses"
        ordering = ["-is_default", "id"]

    def __str__(self):
        return f"{self.label} — {self.line1}, {self.city}"

    def save(self, *args, **kwargs):
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).exclude(
                pk=self.pk
            ).update(is_default=False)
        super().save(*args, **kwargs)
