from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path("addresses/", include([
        path("", views.AddressViewSet.as_view({"get": "list", "post": "create"}), name="addresses"),
        path("<int:pk>/", views.AddressViewSet.as_view({
            "get": "retrieve", "patch": "partial_update", "put": "update",
            "delete": "destroy",
        }), name="address-detail"),
    ])),
    path("verify-email/<str:token>/", views.VerifyEmailView.as_view(), name="verify-email"),
    path("password/reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path("password/reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
