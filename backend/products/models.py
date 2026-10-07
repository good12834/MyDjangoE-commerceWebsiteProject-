"""Catalog: categories, brands, products, images, variants, browsing history."""
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    icon = models.CharField(max_length=10, blank=True)  # emoji
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def descendant_ids(self):
        """This category's id plus the ids of every category beneath it."""
        ids = [self.pk]
        frontier = [self.pk]
        while frontier:
            children = list(
                Category.objects.filter(parent_id__in=frontier).values_list("pk", flat=True)
            )
            if not children:
                break
            ids.extend(children)
            frontier = children
        return ids

    @property
    def product_count(self):
        """Active products in this category *and* all of its subcategories.

        Uses the ``product_count_direct`` / ``product_count_children`` annotations
        when the queryset provides them (see ``CategoryViewSet``) to avoid an
        N+1 query storm; otherwise falls back to a recursive lookup.
        """
        direct = getattr(self, "product_count_direct", None)
        if direct is not None:
            return direct + getattr(self, "product_count_children", 0)
        return Product.objects.filter(
            category_id__in=self.descendant_ids(), status=Product.Status.ACTIVE
        ).count()


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    logo = models.ImageField(upload_to="brands/", blank=True, null=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DRAFT = "draft", "Draft"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    brand = models.ForeignKey(Brand, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="products",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Original price shown struck-through when higher than price.",
    )
    sku = models.CharField(max_length=64, blank=True)
    material = models.CharField(max_length=100, blank=True)
    colors = models.JSONField(default=list, blank=True)   # ["Black", "White"]
    sizes = models.JSONField(default=list, blank=True)    # ["S", "M", "L"]
    specs = models.JSONField(default=dict, blank=True)    # {"Weight": "300g"}
    shipping_info = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    is_featured = models.BooleanField(default=False)
    flash_sale_end = models.DateTimeField(null=True, blank=True)
    rating_avg = models.FloatField(default=0)
    rating_count = models.PositiveIntegerField(default=0)
    sold_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["price"]),
            models.Index(fields=["-rating_avg"]),
            models.Index(fields=["-sold_count"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:240]
            self.slug = base
            if Product.objects.filter(slug=self.slug).exists():
                from django.utils.crypto import get_random_string

                self.slug = f"{base}-{get_random_string(6).lower()}"
        super().save(*args, **kwargs)

    @property
    def discount_pct(self):
        if self.compare_price and self.compare_price > self.price:
            return round((1 - float(self.price) / float(self.compare_price)) * 100)
        return 0

    @property
    def total_stock(self):
        return sum(v.stock for v in self.variants.all()) if self.pk else 0

    @property
    def in_stock(self):
        return self.total_stock > 0

    @property
    def primary_image(self):
        img = self.images.first()
        return img.image.url if img and img.image else None


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    alt = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"Image for {self.product.name}"


class ProductVariant(models.Model):
    """Inventory unit: combination of color and size."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    color = models.CharField(max_length=50, blank=True)
    size = models.CharField(max_length=50, blank=True)
    stock = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=64, blank=True)
    price_override = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    class Meta:
        unique_together = [("product", "color", "size")]

    def __str__(self):
        return f"{self.product.name} — {self.color or '-'} / {self.size or '-'}"

    @property
    def effective_price(self):
        return self.price_override if self.price_override is not None else self.product.price


class ProductView(models.Model):
    """Browsing history row — one per user/product pair (deduped, refreshed)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                             on_delete=models.CASCADE, related_name="product_views")
    session_key = models.CharField(max_length=64, blank=True, db_index=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="views")
    viewed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "product")]

    def __str__(self):
        return f"{self.product} viewed"


class SearchHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                             on_delete=models.CASCADE, related_name="searches")
    session_key = models.CharField(max_length=64, blank=True, db_index=True)
    query = models.CharField(max_length=255, db_index=True)
    results_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "search histories"
        ordering = ["-created_at"]
