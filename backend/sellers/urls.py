from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("profile", views.SellerProfileViewSet, basename="seller-profile")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", views.SellerDashboardView.as_view(), name="seller-dashboard"),
    path("products/", views.SellerProductsView.as_view(), name="seller-products"),
]
