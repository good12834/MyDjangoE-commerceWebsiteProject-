"""Admin analytics API."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order, OrderItem
from products.models import Category, Product

User = get_user_model()


def admin_permission(request):
    return request.user.is_authenticated and request.user.is_shop_admin


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not admin_permission(request):
            return Response({"detail": "Admin access required."}, status=403)

        now = timezone.now()
        today = now.date()
        orders = Order.objects.exclude(status=Order.Status.CANCELLED)
        revenue = orders.aggregate(s=Sum("total"))["s"] or 0
        total_orders = orders.count()
        customers = User.objects.filter(role=User.Role.CUSTOMER).count()
        products = Product.objects.filter(status=Product.Status.ACTIVE).count()

        # ---- 30-day sales series ----
        series = []
        for i in range(29, -1, -1):
            day = today - timedelta(days=i)
            day_orders = orders.filter(created_at__date=day)
            series.append({
                "date": day.isoformat(),
                "revenue": float(day_orders.aggregate(s=Sum("total"))["s"] or 0),
                "orders": day_orders.count(),
            })

        # ---- top products ----
        top_products = list(
            OrderItem.objects.values("product__name", "product_id")
            .annotate(
                units=Sum("quantity"),
                revenue=Sum("line_total"),
            )
            .order_by("-revenue")[:8]
        )

        # ---- top categories ----
        top_categories = list(
            OrderItem.objects.values("product__category__name")
            .annotate(revenue=Sum("line_total"), units=Sum("quantity"))
            .order_by("-revenue")[:6]
        )

        # ---- inventory ----
        low_stock = []
        for p in Product.objects.prefetch_related("variants").filter(
            status=Product.Status.ACTIVE
        ):
            stock = p.total_stock
            if 0 < stock <= 5:
                low_stock.append({"id": p.pk, "name": p.name, "stock": stock})
        out_of_stock = [
            {"id": p.pk, "name": p.name}
            for p in Product.objects.prefetch_related("variants").filter(status=Product.Status.ACTIVE)
            if p.total_stock == 0
        ][:10]
        low_stock = sorted(low_stock, key=lambda x: x["stock"])[:10]

        # ---- customers ----
        new_customers_30d = User.objects.filter(date_joined__gte=now - timedelta(days=30)).count()
        returning = (
            orders.values("user").annotate(n=Count("id")).filter(n__gt=1).count()
        )
        top_customers = list(
            orders.values("user__username")
            .annotate(spent=Sum("total"), orders_count=Count("id"))
            .order_by("-spent")[:8]
        )

        # ---- recent orders ----
        recent = Order.objects.select_related("user").order_by("-created_at")[:10]
        recent_orders = [
            {
                "order_number": o.order_number,
                "customer": o.user.username,
                "status": o.status,
                "total": float(o.total),
                "date": o.created_at.isoformat(),
            }
            for o in recent
        ]

        # ---- status breakdown ----
        status_breakdown = {
            row["status"]: row["n"]
            for row in Order.objects.values("status").annotate(n=Count("id"))
        }

        return Response({
            "kpi": {
                "revenue": float(revenue),
                "orders": total_orders,
                "customers": customers,
                "products": products,
                "revenue_this_month": float(
                    orders.filter(created_at__month=today.month, created_at__year=today.year)
                    .aggregate(s=Sum("total"))["s"] or 0
                ),
                "avg_order_value": float(orders.aggregate(a=Avg("total"))["a"] or 0),
            },
            "sales_by_day": series,
            "top_products": top_products,
            "top_categories": top_categories,
            "inventory": {"low_stock": low_stock, "out_of_stock": out_of_stock},
            "customers": {
                "new_30d": new_customers_30d,
                "returning": returning,
                "top": top_customers,
            },
            "recent_orders": recent_orders,
            "status_breakdown": status_breakdown,
        })
