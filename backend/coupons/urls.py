from django.urls import path

from . import views

urlpatterns = [
    path("validate/", views.ValidateCouponView.as_view(), name="coupon-validate"),
    path("active/", views.ActiveCouponsView.as_view(), name="coupons-active"),
]
