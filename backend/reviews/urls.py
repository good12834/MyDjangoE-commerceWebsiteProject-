from django.urls import path

from . import views

urlpatterns = [
    path("products/<int:product_id>/", views.ProductReviewsView.as_view(), name="product-reviews"),
    path("votes/<int:pk>/", views.ReviewVoteView.as_view(), name="review-vote"),
    path("me/", views.MyReviewsView.as_view(), name="my-reviews"),
    path("<int:pk>/moderate/", views.ReviewModerationView.as_view(), name="review-moderate"),
]
