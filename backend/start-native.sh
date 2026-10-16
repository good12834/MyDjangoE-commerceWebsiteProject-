#!/usr/bin/env bash
# Start script for Render NATIVE Python runtime (manual Web Service).
# Dashboard Start Command: bash start-native.sh  (Root Directory: backend)
# 1. Apply migrations (idempotent, needs DATABASE_URL).
# 2. Seed demo data only when the catalog is empty (first deploy only) — the
#    Docker start.sh has the same guard; without it a fresh native service
#    boots with an empty catalog and every product page 404s.
# 3. Launch Daphne (ASGI) — serves both HTTP API + WebSocket notifications.
#    (Your app uses Django Channels, so Daphne — not gunicorn — is required.)
set -o errexit
set -o pipefail

echo "==> Applying database migrations"
python manage.py migrate --no-input

echo "==> Seeding demo data (first deploy only)"
if python manage.py shell -c "from products.models import Product; import sys; sys.exit(0 if Product.objects.exists() else 1)"; then
    echo "    Catalog already populated — skipping seed."
else
    python manage.py seed_demo
fi

echo "==> Starting Daphne (ASGI) on port ${PORT:-10000}"
exec daphne -b 0.0.0.0 -p "${PORT:-10000}" config.asgi:application
