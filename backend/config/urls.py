"""ShopHub API root URL configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def healthz(request):
    """Liveness probe for Render.

    Deliberately DB-free and never SSL-redirected (see SECURE_REDIRECT_EXEMPT in
    settings.py) so the platform health check is fast and never flaps.
    """
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("healthz/", healthz, name="healthz"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/products/", include("products.urls")),
    path("api/categories/", include("products.urls_categories")),
    path("api/brands/", include("products.urls_brands")),
    path("api/cart/", include("cart.urls")),
    path("api/wishlist/", include("wishlist.urls")),
    path("api/coupons/", include("coupons.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/reviews/", include("reviews.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/sellers/", include("sellers.urls")),
    path("api/admin/", include("analytics.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
