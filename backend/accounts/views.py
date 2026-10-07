"""Auth & account views."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from notifications.services import notify

from .models import Address
from .serializers import (
    AddressSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    ShopTokenObtainPairSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = user.generate_token("email_verification_token")
        verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
        send_mail(
            "Verify your ShopHub account",
            f"Hi {user.username},\n\nConfirm your email: {verify_url}",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,
        )
        notify(
            user,
            ntype="welcome",
            title="Welcome to ShopHub! ",
            body="Use coupon WELCOME10 at checkout for 10% off your first order.",
        )
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = ShopTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        user = User.objects.filter(email_verification_token=token).first()
        if not user:
            return Response({"detail": "Invalid verification token."}, status=400)
        user.email_verified = True
        user.email_verification_token = ""
        user.save(update_fields=["email_verified", "email_verification_token"])
        return Response({"detail": "Email verified successfully."})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        if user:
            token = user.generate_token("password_reset_token")
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"
            send_mail(
                "Reset your ShopHub password",
                f"Hi {user.username},\n\nReset your password: {reset_url}\n\nIf you didn't request this, ignore this email.",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        # Always 200 to avoid leaking which emails exist
        return Response({"detail": "If that email exists, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated. You can now log in."})
