from django.contrib import admin

from .models import Brand, Category, Product, ProductImage, ProductVariant


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name", "category", "brand", "price", "total_stock_display",
        "rating_avg", "sold_count", "status", "is_featured",
    ]
    list_filter = ["status", "is_featured", "category", "brand"]
    search_fields = ["name", "sku"]
    inlines = [ProductImageInline, ProductVariantInline]
    readonly_fields = ["rating_avg", "rating_count", "sold_count", "view_count"]

    @admin.display(description="Stock")
    def total_stock_display(self, obj):
        return obj.total_stock


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "icon", "is_active"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
