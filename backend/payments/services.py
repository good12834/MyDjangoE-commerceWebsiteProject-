"""Payment providers: mock gateway (default) and Stripe (when key configured)."""
import logging

from django.conf import settings
from django.utils import timezone

from orders.models import Order
from orders.services import set_status

from .models import Payment

logger = logging.getLogger(__name__)


def _complete(order: Order, payment: Payment):
    payment.status = Payment.Status.COMPLETED
    payment.completed_at = timezone.now()
    payment.save(update_fields=["status", "completed_at"])
    set_status(order, Order.Status.PAID, note="Payment confirmed.")
    from analytics.tasks import send_order_confirmation_email  # celery task (eager w/o broker)

    send_order_confirmation_email.delay(order.pk)


def initiate_payment(order: Order, method: str = "card") -> dict:
    """Create a Payment for the order and run the chosen provider.

    Returns a dict consumed by the frontend:
      { status, provider, redirect_url?, payment_id, reference }
    """
    payment, _ = Payment.objects.get_or_create(
        order=order,
        defaults={"provider": method, "amount": order.total},
    )
    payment.provider = method
    payment.amount = order.total
    payment.save(update_fields=["provider", "amount"])

    if method == "stripe" and settings.USE_STRIPE:
        return _stripe_checkout(order, payment)

    # Simulated/Tokenized gateway: instant successful authorization without storing raw card details
    import uuid

    prefix = {
        "card": "CARD",
        "paypal": "PAYPAL",
        "apple_pay": "APPLEPAY",
        "google_pay": "GOOGLEPAY",
        "mock": "MOCK",
        "stripe": "STRIPE",
    }.get(method, "PAY")

    payment.reference = f"{prefix}-{uuid.uuid4().hex[:10].upper()}"
    payment.raw_response = {"gateway": method, "simulated": True, "tokenized": True}
    payment.save(update_fields=["reference", "raw_response"])
    _complete(order, payment)
    return {
        "status": "completed",
        "provider": method,
        "payment_id": payment.pk,
        "reference": payment.reference,
    }


def _stripe_checkout(order: Order, payment: Payment) -> dict:
    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=f"{settings.FRONTEND_URL}/order-success/{order.pk}?paid=1",
            cancel_url=f"{settings.FRONTEND_URL}/checkout?cancelled=1",
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": f"ShopHub order {order.order_number}"},
                        "unit_amount": int(order.total * 100),
                    },
                    "quantity": 1,
                }
            ],
            metadata={"order_id": order.pk},
        )
    except Exception as e:  # pragma: no cover - network/keys
        logger.error("Stripe session creation failed: %s", e)
        payment.status = Payment.Status.FAILED
        payment.save(update_fields=["status"])
        return {"status": "failed", "provider": "stripe", "detail": str(e)}

    payment.reference = session.id
    payment.raw_response = {"session_id": session.id}
    payment.save(update_fields=["reference", "raw_response"])
    return {
        "status": "pending",
        "provider": "stripe",
        "redirect_url": session.url,
        "payment_id": payment.pk,
        "reference": session.id,
    }


def handle_stripe_webhook(payload: bytes, sig_header: str) -> bool:
    """Verify + process a Stripe webhook; returns True if it was an order completion."""
    import stripe

    if not settings.STRIPE_WEBHOOK_SECRET:
        return False
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        logger.error("Stripe webhook verification failed: %s", e)
        return False

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        order_id = session.get("metadata", {}).get("order_id")
        if order_id:
            order = Order.objects.filter(pk=order_id).first()
            if order:
                payment = getattr(order, "payment", None)
                if payment:
                    payment.raw_response = session
                    payment.save(update_fields=["raw_response"])
                _complete(order, payment)
                return True
    return False
