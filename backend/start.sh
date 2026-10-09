#!/usr/bin/env bash
# Container entrypoint for the ShopHub Django backend on Render.
# 1. Apply database migrations (idempotent).
# 2. Seed demo data only when the catalog is empty (first deploy only).
# 3. Launch Daphne (ASGI) to serve the HTTP API + WebSockets on $PORT.
set -o errexit
set -o pipefail

# Guarantee we run from the app root regardless of the container's CWD.
cd /app

echo "==> Applying database migrations"
python manage.py migrate --no-input

echo "==> Seeding demo data (first deploy only)"
# Seed only when no products exist yet, so restarts/redeploys never duplicate data.
if python manage.py shell -c "from products.models import Product; import sys; sys.exit(0 if Product.objects.exists() else 1)"; then
    echo "    Catalog already populated — skipping seed."
else
    python manage.py seed_demo
fi

echo "==> Starting Daphne (ASGI) on port ${PORT:-10000}"
# exec so Daphne becomes PID 1 and receives Render's start/stop signals.
exec daphne -b 0.0.0.0 -p "${PORT:-10000}" config.asgi:application
