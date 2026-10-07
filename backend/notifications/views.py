"""Notification API."""
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification


class NotificationSerializerMixin:
    pass


def serialize(n):
    return {
        "id": n.pk, "ntype": n.ntype, "title": n.title, "body": n.body,
        "data": n.data, "read": n.read, "created_at": n.created_at.isoformat(),
    }


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)
        unread_only = request.query_params.get("unread") == "1"
        if unread_only:
            qs = qs.filter(read=False)
        return Response({
            "results": [serialize(n) for n in qs[:50]],
            "unread_count": Notification.objects.filter(user=request.user, read=False).count(),
        })


class MarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        qs = Notification.objects.filter(user=request.user, read=False)
        if pk is not None:
            qs = Notification.objects.filter(user=request.user, pk=pk)
        qs.update(read=True)
        return Response({"ok": True})
