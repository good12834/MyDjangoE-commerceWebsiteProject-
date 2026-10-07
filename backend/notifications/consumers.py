"""Realtime notification consumer (Django Channels)."""
import json

from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if user is None or user.is_anonymous:
            await self.close()
            return
        self.group_name = f"user_{user.pk}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notify(self, event):
        await self.send(text_data=json.dumps({"kind": "notification", "payload": event["payload"]}))

    async def receive(self, text_data=None, bytes_data=None):
        # clients may send pings
        try:
            data = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            return
        if data.get("type") == "ping":
            await self.send(text_data=json.dumps({"kind": "pong"}))
