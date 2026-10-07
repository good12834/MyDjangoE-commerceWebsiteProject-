from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="user.username", read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id", "product", "rating", "title", "body", "author", "avatar",
            "verified_purchase", "helpful_count", "not_helpful_count",
            "created_at", "is_approved",
        ]
        read_only_fields = ["author", "verified_purchase", "helpful_count", "not_helpful_count"]

    def get_avatar(self, obj):
        return obj.user.avatar.url if obj.user.avatar else None

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be 1-5.")
        return value


class RatingSummarySerializer(serializers.Serializer):
    average = serializers.FloatField()
    count = serializers.IntegerField()
    distribution = serializers.DictField()
