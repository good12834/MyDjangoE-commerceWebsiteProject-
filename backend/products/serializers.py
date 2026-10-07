"""Catalog serializers."""
from rest_framework import serializers

from .models import Brand, Category, Product, ProductImage, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    """Category payload.

    ``image`` falls back to the nearest ancestor's photo so that subcategories —
    which have no photo of their own — always render a real, topically-correct
    picture instead of an empty tile.  ``product_count`` rolls up the whole
    subtree (see ``Category.product_count``) and ``depth``/``has_children`` let the
    UI build a nested menu without a second request.
    """

    product_count = serializers.IntegerField(read_only=True)
    image = serializers.SerializerMethodField()
    depth = serializers.SerializerMethodField()
    has_children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "icon", "image", "parent", "product_count",
            "depth", "has_children",
        ]

    def get_image(self, obj):
        node = obj
        seen = set()
        while node is not None and node.pk not in seen:
            seen.add(node.pk)
            if node.image:
                return node.image.url
            node = node.parent
        return None

    def get_depth(self, obj):
        depth, node = 0, obj.parent
        while node is not None:
            depth += 1
            node = node.parent
        return depth

    def get_has_children(self, obj):
        # ``children`` is prefetched by the viewset; fall back to a cheap exists().
        prefetched = getattr(obj, "_prefetched_objects_cache", None)
        if prefetched is not None and "children" in prefetched:
            return any(child.is_active for child in obj.children.all())
        return obj.children.filter(is_active=True).exists()


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo"]


class ProductVariantSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(
        source="effective_price", max_digits=10, decimal_places=2, read_only=True
    )
    low_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ["id", "color", "size", "stock", "sku", "price", "low_stock"]

    def get_low_stock(self, obj):
        from django.conf import settings

        return 0 < obj.stock <= settings.LOW_STOCK_THRESHOLD


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt", "order"]


class ProductCardSerializer(serializers.ModelSerializer):
    """Lightweight product payload used in grids/lists."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True, default=None)
    seller_store = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    discount_pct = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "slug", "name", "price", "compare_price", "discount_pct",
            "image", "rating_avg", "rating_count", "sold_count", "view_count",
            "category_name", "category_slug", "brand_name", "seller_store",
            "colors", "sizes", "in_stock", "is_featured",
            "flash_sale_end", "created_at",
        ]

    def get_image(self, obj):
        return obj.primary_image

    def get_seller_store(self, obj):
        if obj.seller and hasattr(obj.seller, "seller_profile"):
            return obj.seller.seller_profile.store_name
        return None


class ProductDetailSerializer(ProductCardSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    description = serializers.CharField(read_only=True)
    specs = serializers.JSONField(read_only=True)
    material = serializers.CharField(read_only=True)
    shipping_info = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    sku = serializers.CharField(read_only=True)
    total_stock = serializers.IntegerField(read_only=True)

    class Meta(ProductCardSerializer.Meta):
        fields = ProductCardSerializer.Meta.fields + [
            "description", "images", "variants", "specs", "material",
            "shipping_info", "total_stock", "status", "sku",
        ]


class ProductWriteSerializer(serializers.ModelSerializer):
    """Create/update used by sellers and admins."""

    images = serializers.ListField(
        child=serializers.CharField(allow_blank=True), required=False, write_only=True,
        help_text="List of image URLs (or base64 data URIs) to attach.",
    )

    class Meta:
        model = Product
        fields = [
            "name", "description", "category", "brand", "price", "compare_price",
            "sku", "material", "colors", "sizes", "specs", "shipping_info",
            "status", "is_featured", "flash_sale_end", "images",
        ]

    def create(self, validated_data):
        image_urls = validated_data.pop("images", [])
        user = self.context["request"].user
        if not user.is_shop_admin:
            validated_data["seller"] = user
        product = Product.objects.create(**validated_data)
        self._attach_images(product, image_urls)
        return product

    def update(self, instance, validated_data):
        image_urls = validated_data.pop("images", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if image_urls is not None:
            instance.images.all().delete()
            self._attach_images(instance, image_urls)
        return instance

    @staticmethod
    def _attach_images(product, urls):
        from django.core.files.base import ContentFile
        import base64
        import uuid

        for i, url in enumerate(urls):
            if not url:
                continue
            if url.startswith("data:"):
                # base64 upload: data:image/png;base64,....
                try:
                    header, b64 = url.split(",", 1)
                    ext = header.split("/")[1].split(";")[0] or "png"
                    ProductImage.objects.create(
                        product=product,
                        image=ContentFile(base64.b64decode(b64), name=f"{uuid.uuid4().hex}.{ext}"),
                        order=i,
                    )
                except Exception:
                    continue
            else:
                ProductImage.objects.create(product=product, image=url, order=i)
