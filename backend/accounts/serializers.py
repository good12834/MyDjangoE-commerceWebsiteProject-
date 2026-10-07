"""Serializers for accounts app."""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Address

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "role",
            "phone", "avatar", "email_verified", "date_joined", "created_at",
        ]
        read_only_fields = ["id", "username", "email", "role", "date_joined", "created_at", "email_verified"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    wants_to_sell = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "password", "password2", "wants_to_sell"]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        wants_to_sell = validated_data.pop("wants_to_sell", False)
        user = User(
            username=validated_data["username"],
            email=validated_data["email"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=User.Role.SELLER if wants_to_sell else User.Role.CUSTOMER,
        )
        user.set_password(validated_data["password"])
        user.save()
        if wants_to_sell:
            from sellers.models import SellerProfile

            SellerProfile.objects.get_or_create(
                user=user,
                defaults={"store_name": f"{user.username}'s Store"},
            )
        return user


class ShopTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login that accepts username OR email and returns the user object."""

    def validate(self, attrs):
        username = attrs.get(self.username_field, "")
        if username and "@" in username and not User.objects.filter(username__iexact=username).exists():
            user = User.objects.filter(email__iexact=username).first()
            if user:
                attrs[self.username_field] = user.username
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user, context=self.context).data
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id", "label", "full_name", "phone", "line1", "line2",
            "city", "state", "postal_code", "country", "is_default",
        ]

    def create(self, validated_data):
        return Address.objects.create(user=self.context["request"].user, **validated_data)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(validators=[validate_password])

    def validate_token(self, value):
        if not User.objects.filter(password_reset_token=value).exists():
            raise serializers.ValidationError("Invalid or expired reset token.")
        return value

    def save(self):
        user = User.objects.get(password_reset_token=self.validated_data["token"])
        user.set_password(self.validated_data["password"])
        user.password_reset_token = ""
        user.save(update_fields=["password", "password_reset_token"])
        return user
