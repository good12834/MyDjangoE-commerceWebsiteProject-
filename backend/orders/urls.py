from django.urls import path

from . import views

urlpatterns = [
    path("checkout/", views.CheckoutView.as_view(), name="checkout"),
    path("", views.OrderListView.as_view(), name="orders"),
    path("<int:pk>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/cancel/", views.OrderCancelView.as_view(), name="order-cancel"),
    path("<int:pk>/advance/", views.OrderAdvanceView.as_view(), name="order-advance"),
]
