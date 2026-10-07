"""Authenticate websocket connections using a SimpleJWT token in the query string."""
from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import User


@database_sync_to_async
def get_user(token):
    try:
        access = AccessToken(token)
        return User.objects.get(pk=access["user_id"])
    except (TokenError, KeyError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        token = None
        query = scope.get("query_string", b"").decode()
        for part in query.split("&"):
            if part.startswith("token="):
                token = part[6:]
                break
        scope["user"] = await get_user(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
