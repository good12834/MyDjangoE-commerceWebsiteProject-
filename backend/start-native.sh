#!/usr/bin/env bash
# Start script for Render NATIVE Python runtime (manual Web Service).
# Dashboard Start Command: bash start-native.sh  (Root Directory: backend)
# 1. Apply migrations (idempotent, needs DATABASE_URL).
# 2. Launch Daphne (ASGI) — serves both HTTP API + WebSocket notifications.
#    (Your app uses Django Channels, so Daphne — not gunicorn — is required.)
set -o errexit
set -o pipefail

echo "==> Applying database migrations"
python manage.py migrate --no-input

echo "==> Starting Daphne (ASGI) on port ${PORT:-10000}"
exec daphne -b 0.0.0.0 -p "${PORT:-10000}" config.asgi:application
