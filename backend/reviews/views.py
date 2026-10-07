"""Review API."""
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product
from products.serializers import ProductCardSerializer

from .models import Review, ReviewVote
from .serializers import RatingSummarySerializer, ReviewSerializer


class ProductReviewsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        qs = product.reviews.filter(is_approved=True).select_related("user")
        star = request.query_params.get("star")
        if star:
            qs = qs.filter(rating=int(star))
        agg = qs.aggregate(avg=Avg("rating"), count=Count("id"))
        dist = dict(qs.values_list("rating").annotate(c=Count("id")))
        summary = RatingSummarySerializer({
            "average": round(agg["avg"] or 0, 2),
            "count": agg["count"],
            "distribution": {str(s): dist.get(s, 0) for s in range(1, 6)},
        }).data
        page_qs = list(qs)
        page_size = 10
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        slice_ = page_qs[(page - 1) * page_size: page * page_size]
        return Response({
            "summary": summary,
            "results": ReviewSerializer(slice_, many=True).data,
            "total": len(page_qs),
            "page": page,
        })

    def post(self, request, product_id):
        if not request.user.is_authenticated:
            return Response({"detail": "Log in to review."}, status=401)
        product = get_object_or_404(Product, pk=product_id)
        existing = Review.objects.filter(product=product, user=request.user).first()
        if existing:
            serializer = ReviewSerializer(existing, data=request.data, partial=True)
        else:
            serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(product=product, user=request.user)
        return Response(ReviewSerializer(review).data, status=201 if not existing else 200)


class ReviewVoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        review = get_object_or_404(Review, pk=pk)
        helpful = bool(request.data.get("helpful", True))
        vote, created = ReviewVote.objects.get_or_create(
            review=review, user=request.user, defaults={"helpful": helpful}
        )
        if not created:
            if vote.helpful == helpful:
                vote.delete()
            else:
                vote.helpful = helpful
                vote.save(update_fields=["helpful"])
        review.helpful_count = review.votes.filter(helpful=True).count()
        review.not_helpful_count = review.votes.filter(helpful=False).count()
        review.save(update_fields=["helpful_count", "not_helpful_count"])
        return Response({
            "helpful_count": review.helpful_count,
            "not_helpful_count": review.not_helpful_count,
        })


class MyReviewsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Review.objects.filter(user=request.user).select_related("product")
        return Response(ReviewSerializer(qs, many=True).data)


class ReviewModerationView(APIView):
    """Sellers and admins can hide/unhide reviews on their products."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        review = get_object_or_404(Review.objects.select_related("product"), pk=pk)
        user = request.user
        allowed = user.is_shop_admin or (
            review.product.seller_id == user.pk
        )
        if not allowed:
            return Response({"detail": "Not allowed."}, status=403)
        review.is_approved = bool(request.data.get("is_approved", True))
        review.save(update_fields=["is_approved"])
        # recalc product rating
        agg = review.product.reviews.filter(is_approved=True).aggregate(avg=Avg("rating"), count=Count("id"))
        review.product.rating_avg = agg["avg"] or 0
        review.product.rating_count = agg["count"]
        review.product.save(update_fields=["rating_avg", "rating_count"])
        return Response(ReviewSerializer(review).data)
