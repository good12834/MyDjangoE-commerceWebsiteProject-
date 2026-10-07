from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Address, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "role", "email_verified", "date_joined"]
    list_filter = ["role", "email_verified"]
    search_fields = ["username", "email"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("ShopHub", {"fields": ("role", "phone", "avatar", "email_verified")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("ShopHub", {"fields": ("email", "role")}),
    )


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ["user", "label", "city", "country", "is_default"]
    search_fields = ["user__username", "city"]
