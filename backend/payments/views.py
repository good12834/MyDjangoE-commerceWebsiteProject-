"""Payment API."""
from django.conf import settings
from django.http import HttpResponse
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from orders.services import set_status

from .models import Payment
from .services import handle_stripe_webhook, initiate_payment


class PayOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        order = Order.objects.filter(pk=order_id, user=request.user).first()
        if not order:
            return Response({"detail": "Order not found."}, status=404)
        if order.status not in (Order.Status.PENDING, Order.Status.CANCELLED):
            return Response({"detail": "Order already paid."}, status=400)
        method = request.data.get("method", "card")
        result = initiate_payment(order, method)
        return Response(result)


class PaymentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        order = Order.objects.filter(pk=order_id, user=request.user).first()
        if not order:
            return Response({"detail": "Order not found."}, status=404)
        payment = getattr(order, "payment", None)
        return Response({
            "order_status": order.status,
            "payment_status": payment.status if payment else None,
            "provider": payment.provider if payment else None,
        })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def stripe_webhook(request):
    ok = handle_stripe_webhook(request.body, request.headers.get("Stripe-Signature", ""))
    if ok or not settings.STRIPE_WEBHOOK_SECRET:
        return HttpResponse(status=200)
    return HttpResponse(status=400)
