from django.urls import path

from . import views

urlpatterns = [
    path("", views.CartView.as_view(), name="cart"),
    path("items/", views.CartItemListView.as_view(), name="cart-items"),
    path("items/<int:pk>/", views.CartItemDetailView.as_view(), name="cart-item-detail"),
    path("coupon/", views.ApplyCouponView.as_view(), name="apply-coupon"),
    path("coupon/clear/", views.ClearCouponView.as_view(), name="clear-coupon"),
    path("merge/", views.MergeCartView.as_view(), name="merge-cart"),
]
