"""Coupon API."""
from decimal import Decimal

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Coupon
from .serializers import CouponSerializer
from .services import validate_coupon


class ValidateCouponView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code = (request.data.get("code") or "").strip()
        subtotal = Decimal(str(request.data.get("subtotal") or "0"))
        user = request.user if request.user.is_authenticated else None
        coupon, discount, error = validate_coupon(code, subtotal, user)
        if coupon is None or (error and discount <= 0):
            return Response({"valid": False, "detail": error}, status=400)
        return Response({
            "valid": True,
            "code": coupon.code,
            "discount": discount,
            "description": coupon.description,
            "detail": error or "Coupon applied.",
        })


class ActiveCouponsView(APIView):
    """Public list of coupons currently running (for banners/flash pages)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.utils import timezone

        qs = Coupon.objects.filter(active=True, valid_from__lte=timezone.now()).filter(
            valid_to__isnull=True
        ) | Coupon.objects.filter(active=True, valid_to__gt=timezone.now())
        return Response(CouponSerializer(qs.distinct(), many=True).data)
