"""Order serializers."""
from rest_framework import serializers

from .models import DeliveryEstimate, Order, OrderItem, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "product", "product_slug", "product_name", "product_image",
            "variant_label", "unit_price", "quantity", "line_total",
        ]

    def get_product_slug(self, obj):
        return obj.product.slug if obj.product else ""


class StatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ["status", "note", "created_at"]


class OrderListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()
    first_item_image = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "total", "created_at",
            "item_count", "first_item_image", "delivery_method", "coupon_code",
        ]

    def get_item_count(self, obj):
        return obj.items.count()

    def get_first_item_image(self, obj):
        return obj.items.first().product_image if obj.items.exists() else ""


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    history = StatusHistorySerializer(many=True, read_only=True)
    eta = serializers.SerializerMethodField()
    status_flow = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "delivery_method", "address",
            "subtotal", "discount", "shipping", "tax", "total", "coupon_code",
            "items", "history", "eta", "status_flow", "payment",
            "created_at", "delivered_at",
        ]

    def get_eta(self, obj):
        eta = DeliveryEstimate.eta_for(obj)
        return eta.isoformat() if eta else None

    def get_status_flow(self, obj):
        return [s for s in Order.ORDER_FLOW]

    def get_payment(self, obj):
        payment = getattr(obj, "payment", None)
        if not payment:
            return None
        return {
            "id": payment.pk,
            "provider": payment.provider,
            "status": payment.status,
            "amount": payment.amount,
            "currency": payment.currency,
            "reference": payment.reference,
            "created_at": payment.created_at,
            "completed_at": payment.completed_at,
        }

    def get_address(self, obj):
        return {
            "full_name": obj.ship_full_name, "phone": obj.ship_phone,
            "line1": obj.ship_line1, "line2": obj.ship_line2,
            "city": obj.ship_city, "state": obj.ship_state,
            "postal_code": obj.ship_postal_code, "country": obj.ship_country,
        }


class CheckoutSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(required=False)
    address = serializers.DictField(required=False)
    delivery_method = serializers.ChoiceField(choices=Order.DeliveryMethod.choices, default="standard")
    payment_method = serializers.ChoiceField(
        choices=["card", "paypal", "apple_pay", "google_pay"],
        default="card",
    )

    ADDRESS_REQUIRED = [
        "full_name", "phone", "line1", "city", "state", "postal_code",
    ]

    def validate(self, attrs):
        address = None
        if attrs.get("address_id"):
            from accounts.models import Address

            address_obj = Address.objects.filter(
                pk=attrs["address_id"], user=self.context["request"].user
            ).first()
            if not address_obj:
                raise serializers.ValidationError({"address_id": "Address not found."})
            address = {
                "full_name": address_obj.full_name, "phone": address_obj.phone,
                "line1": address_obj.line1, "line2": address_obj.line2,
                "city": address_obj.city, "state": address_obj.state,
                "postal_code": address_obj.postal_code, "country": address_obj.country,
            }
        elif attrs.get("address"):
            address = attrs["address"]
            missing = [f for f in self.ADDRESS_REQUIRED if not address.get(f)]
            if missing:
                raise serializers.ValidationError(
                    {"address": f"Missing required fields: {', '.join(missing)}"}
                )
        else:
            raise serializers.ValidationError("Provide address_id or a full address object.")
        attrs["resolved_address"] = address
        return attrs
