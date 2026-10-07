from django.urls import path

from . import views

urlpatterns = [
    path("pay/<int:order_id>/", views.PayOrderView.as_view(), name="pay-order"),
    path("status/<int:order_id>/", views.PaymentStatusView.as_view(), name="payment-status"),
    path("stripe/webhook/", views.stripe_webhook, name="stripe-webhook"),
]
