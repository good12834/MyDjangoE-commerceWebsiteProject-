"""Order API."""
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.services import resolve_cart
from payments.services import initiate_payment

from .models import Order
from .serializers import CheckoutSerializer, OrderDetailSerializer, OrderListSerializer
from .services import CheckoutError, place_order, set_status


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        cart = resolve_cart(request)
        if cart is None or not cart.items.filter(saved_for_later=False).exists():
            return Response({"detail": "Your cart is empty."}, status=400)
        try:
            order = place_order(
                user=request.user,
                cart=cart,
                address_data=serializer.validated_data["resolved_address"],
                delivery_method=serializer.validated_data["delivery_method"],
                payment_method=serializer.validated_data["payment_method"],
            )
        except CheckoutError as e:
            return Response({"detail": str(e)}, status=400)

        payment_result = initiate_payment(order, serializer.validated_data["payment_method"])
        order_data = OrderDetailSerializer(order).data
        order_data["payment"] = payment_result
        return Response(order_data, status=status.HTTP_201_CREATED)


class OrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Order.objects.filter(user=request.user).prefetch_related("items")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(OrderListSerializer(qs, many=True).data)


class OrderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.prefetch_related("items", "history"), pk=pk, user=request.user
        )
        return Response(OrderDetailSerializer(order).data)


class OrderCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)
        if order.status not in (Order.Status.PENDING, Order.Status.PAID, Order.Status.PROCESSING):
            return Response({"detail": "Order can no longer be cancelled."}, status=400)
        set_status(order, Order.Status.CANCELLED, note="Cancelled by customer.")
        # restock
        for item in order.items.all():
            if item.variant:
                item.variant.stock += item.quantity
                item.variant.save(update_fields=["stock"])
            elif item.product:
                pass
        return Response(OrderDetailSerializer(order).data)


class OrderAdvanceView(APIView):
    """Move an order one step along the delivery flow (admin/seller demo tool)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        user = request.user
        if not (user.is_shop_admin or (hasattr(user, "seller_profile"))):
            return Response({"detail": "Not allowed."}, status=403)
        if user.seller_profile and not user.is_shop_admin:
            # sellers may only advance their own orders
            if not order.items.filter(seller=user).exists():
                return Response({"detail": "Not your order."}, status=403)
        idx = order.status_index
        if idx < 0 or idx >= len(Order.ORDER_FLOW) - 1:
            return Response({"detail": "Order is already delivered or not trackable."}, status=400)
        next_status = Order.ORDER_FLOW[idx + 1]
        notes = {
            "paid": "Payment confirmed.",
            "processing": "We're preparing your items.",
            "shipped": "Your package is on its way ",
            "out_for_delivery": "Arriving today!",
            "delivered": "Delivered. Enjoy your purchase!",
        }
        set_status(order, next_status, note=notes.get(next_status, ""))
        return Response(OrderDetailSerializer(order).data)
