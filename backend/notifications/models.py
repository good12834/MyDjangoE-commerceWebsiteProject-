"""Notifications."""
from django.conf import settings
from django.db import models


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    ntype = models.CharField(max_length=32, default="generic")  # order_placed, order_shipped, flash_sale...
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    data = models.JSONField(default=dict, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "read"])]

    def __str__(self):
        return self.title
