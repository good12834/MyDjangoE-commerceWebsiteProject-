"""Product reviews with verified purchases and helpful votes."""
from django.conf import settings
from django.db import models


class Review(models.Model):
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    title = models.CharField(max_length=150, blank=True)
    body = models.TextField(blank=True)
    verified_purchase = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)  # moderation switch
    helpful_count = models.PositiveIntegerField(default=0)
    not_helpful_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("product", "user")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.rating} stars - {self.product.name} by {self.user.username}"

    def save(self, *args, **kwargs):
        from orders.models import OrderItem

        if self.pk is None and not self.verified_purchase:
            self.verified_purchase = OrderItem.objects.filter(
                order__user=self.user, product=self.product,
                order__status__in=["paid", "processing", "shipped", "out_for_delivery", "delivered"],
            ).exists()
        super().save(*args, **kwargs)
        self.product.rating_avg = (
            self.product.reviews.filter(is_approved=True).aggregate(
                avg=models.Avg("rating")
            )["avg"] or 0
        )
        self.product.rating_count = self.product.reviews.filter(is_approved=True).count()
        self.product.save(update_fields=["rating_avg", "rating_count"])


class ReviewImage(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="review_images/")


class ReviewVote(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    helpful = models.BooleanField(default=True)

    class Meta:
        unique_together = [("review", "user")]
