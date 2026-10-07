from django.contrib import admin

from .models import Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product_name", "unit_price", "quantity", "line_total"]


class HistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ["status", "note", "created_at"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "status", "total", "created_at"]
    list_filter = ["status", "delivery_method"]
    search_fields = ["order_number", "user__username"]
    inlines = [OrderItemInline, HistoryInline]
    readonly_fields = ["order_number", "subtotal", "discount", "shipping", "tax", "total"]
