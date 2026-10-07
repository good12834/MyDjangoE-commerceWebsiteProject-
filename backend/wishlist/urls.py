from django.urls import path

from . import views

urlpatterns = [
    path("", views.WishlistView.as_view(), name="wishlist"),
    path("add/", views.WishlistAddView.as_view(), name="wishlist-add"),
    path("items/<int:product_id>/", views.WishlistItemDetailView.as_view(), name="wishlist-item"),
    path("items/<int:product_id>/move-to-cart/", views.WishlistMoveToCartView.as_view(), name="wishlist-move"),
    path("toggle/", views.WishlistToggleView.as_view(), name="wishlist-toggle"),
    path("share/<uuid:token>/", views.SharedWishlistView.as_view(), name="wishlist-shared"),
]
