"""Wishlist API."""
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product
from products.serializers import ProductCardSerializer

from .models import Wishlist, WishlistItem
from .serializers import WishlistSerializer


def get_wishlist(user):
    wishlist, _ = Wishlist.objects.get_or_create(user=user)
    return wishlist


class WishlistView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(WishlistSerializer(get_wishlist(request.user)).data)


class WishlistAddView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        wishlist = get_wishlist(request.user)
        product = get_object_or_404(Product, pk=request.data.get("product_id"))
        item, created = WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)
        if not created:
            return Response({"detail": "Already in wishlist."}, status=200)
        return Response({"detail": "Added to wishlist."}, status=201)


class WishlistItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, product_id):
        wishlist = get_wishlist(request.user)
        WishlistItem.objects.filter(wishlist=wishlist, product_id=product_id).delete()
        return Response(WishlistSerializer(wishlist).data)


class WishlistToggleView(APIView):
    """Convenience: add if missing, remove if present. Returns whether it's in the wishlist."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        wishlist = get_wishlist(request.user)
        product = get_object_or_404(Product, pk=request.data.get("product_id"))
        item = WishlistItem.objects.filter(wishlist=wishlist, product=product).first()
        if item:
            item.delete()
            return Response({"in_wishlist": False})
        WishlistItem.objects.create(wishlist=wishlist, product=product)
        return Response({"in_wishlist": True})


class WishlistMoveToCartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, product_id):
        wishlist = get_wishlist(request.user)
        item = get_object_or_404(WishlistItem, wishlist=wishlist, product_id=product_id)
        from cart.services import resolve_cart
        from products.models import ProductVariant

        variant = None
        if request.data.get("variant_id"):
            variant = ProductVariant.objects.filter(
                pk=request.data["variant_id"], product=item.product
            ).first()
        cart = resolve_cart(request, create=True)
        from cart.models import CartItem

        existing = CartItem.objects.filter(cart=cart, product=item.product, variant=variant).first()
        if existing:
            existing.quantity += 1
            existing.save(update_fields=["quantity"])
        else:
            CartItem.objects.create(cart=cart, product=item.product, variant=variant, quantity=1)
        item.delete()
        return Response({"detail": "Moved to cart."}, status=200)


class SharedWishlistView(APIView):
    """Public read-only wishlist page for sharing."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        wishlist = get_object_or_404(Wishlist, share_token=token)
        items = wishlist.items.select_related("product__category", "product__brand")
        return Response({
            "owner": wishlist.user.username,
            "products": ProductCardSerializer(
                [i.product for i in items], many=True, context=self.get_serializer_context()
            ).data,
        })
