from django.contrib import admin

from .models import Review, ReviewVote


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["product", "user", "rating", "verified_purchase", "is_approved", "created_at"]
    list_filter = ["rating", "verified_purchase", "is_approved"]
    search_fields = ["product__name", "user__username"]


admin.site.register(ReviewVote)
