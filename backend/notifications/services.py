"""Notification creation + realtime broadcast."""
import logging

logger = logging.getLogger(__name__)


def notify(user, ntype="generic", title="", body="", data=None):
    """Persist a notification; best-effort realtime push over Django Channels."""
    from .models import Notification

    notification = Notification.objects.create(
        user=user, ntype=ntype, title=title, body=body, data=data or {}
    )
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        layer = get_channel_layer()
        if layer is not None:
            async_to_sync(layer.group_send)(
                f"user_{user.pk}",
                {
                    "type": "notify",
                    "payload": {
                        "id": notification.pk,
                        "ntype": ntype,
                        "title": title,
                        "body": body,
                        "data": data or {},
                        "created_at": notification.created_at.isoformat(),
                    },
                },
            )
    except Exception as e:  # channels/redis optional
        logger.debug("WS notify skipped: %s", e)
    return notification
