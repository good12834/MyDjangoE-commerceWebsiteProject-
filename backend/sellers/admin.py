from django.contrib import admin

from .models import SellerProfile


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ["store_name", "user", "is_approved", "product_count"]
    list_filter = ["is_approved"]
    search_fields = ["store_name", "user__username"]
