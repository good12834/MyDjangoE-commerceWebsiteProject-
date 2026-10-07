"""Cart API."""
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from coupons.services import validate_coupon

from .models import CartItem
from .serializers import AddItemSerializer, CartItemSerializer, CartSerializer
from .services import compute_totals, merge_device_cart_into_user, resolve_cart


class CartView(APIView):
    """GET current cart (creates one when X-Cart-Token present or logged in)."""

    def get(self, request):
        cart = resolve_cart(request, create=True)
        return Response(CartSerializer(cart).data)


class CartItemListView(APIView):
    def post(self, request):
        """Add to cart with stock validation."""
        cart = resolve_cart(request, create=True)
        if cart is None:
            return Response(
                {"detail": "Provide an X-Cart-Token header for anonymous carts."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AddItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from products.models import Product, ProductVariant

        product = get_object_or_404(Product, pk=data["product_id"], status=Product.Status.ACTIVE)
        variant = None
        if data.get("variant_id"):
            variant = get_object_or_404(ProductVariant, pk=data["variant_id"], product=product)
            available = variant.stock
        else:
            available = product.total_stock

        item = CartItem.objects.filter(cart=cart, product=product, variant=variant).first()
        current_qty = item.quantity if item else 0
        new_qty = current_qty + data["quantity"]
        if new_qty > available:
            return Response(
                {"detail": f"Only {available} in stock.", "available": available},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if item:
            item.quantity = new_qty
            item.save(update_fields=["quantity"])
        else:
            item = CartItem.objects.create(
                cart=cart, product=product, variant=variant, quantity=data["quantity"]
            )
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    def patch(self, request, pk):
        cart = resolve_cart(request)
        if cart is None:
            return Response({"detail": "Cart not found."}, status=404)
        item = CartItem.objects.filter(pk=pk, cart=cart).first()
        if item is None:
            # Stale ID (already removed / merged into another cart) — resync client.
            return Response(
                {"detail": "Item no longer in cart.", "cart": CartSerializer(cart).data},
                status=404,
            )
        quantity = request.data.get("quantity")
        if quantity is not None:
            quantity = int(quantity)
            if quantity < 1:
                item.delete()
                return Response(CartSerializer(cart).data)
            elif quantity > item.available_stock():
                return Response({"detail": f"Only {item.available_stock()} in stock."}, status=400)
            else:
                item.quantity = quantity
                item.save(update_fields=["quantity"])
        if "saved_for_later" in request.data:
            item.saved_for_later = bool(request.data["saved_for_later"])
            item.save(update_fields=["saved_for_later"])
        return Response(CartSerializer(cart).data)

    def delete(self, request, pk):
        cart = resolve_cart(request)
        if cart is None:
            return Response({}, status=200)
        item = CartItem.objects.filter(pk=pk, cart=cart).first()
        if item is None:
            # Idempotent delete: stale/double-clicked IDs resync instead of 404-spam.
            return Response(CartSerializer(cart).data, status=200)
        item.delete()
        return Response(CartSerializer(cart).data)


class ApplyCouponView(APIView):
    def post(self, request):
        cart = resolve_cart(request, create=True)
        code = (request.data.get("code") or "").strip()
        if not code:
            return Response({"detail": "Enter a coupon code."}, status=400)
        cart_items = cart.items.filter(saved_for_later=False)
        subtotal = sum((i.line_total for i in cart_items), 0)
        from decimal import Decimal

        coupon, discount, error = validate_coupon(code, Decimal(str(subtotal)), request.user)
        if error and discount <= 0:
            return Response({"detail": error}, status=400)
        cart.coupon = coupon
        cart.save(update_fields=["coupon"])
        return Response({"detail": f"Coupon {coupon.code} applied.", "totals": compute_totals(cart)})


class ClearCouponView(APIView):
    def delete(self, request):
        cart = resolve_cart(request)
        if cart and cart.coupon:
            cart.coupon = None
            cart.save(update_fields=["coupon"])
        return Response(CartSerializer(cart).data if cart else {})


class MergeCartView(APIView):
    """Called right after login with the anonymous X-Cart-Token."""

    def post(self, request):
        token = request.headers.get("X-Cart-Token", "") or request.data.get("device_token", "")
        merge_device_cart_into_user(token.strip(), request.user)
        cart = resolve_cart(request, create=True)
        return Response(CartSerializer(cart).data)
