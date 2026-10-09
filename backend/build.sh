#!/usr/bin/env bash
# Render build script for the ShopHub Django backend.
# Render's native Python runtime installs requirements.txt BEFORE this runs.
set -o errexit

echo "==> Collecting static files"
python manage.py collectstatic --no-input

echo "==> Applying database migrations"
python manage.py migrate --no-input

echo "==> Seeding demo data (first deploy only)"
# Only seed when the catalog is empty so redeploys never duplicate data.
if python manage.py shell -c "from products.models import Product; import sys; sys.exit(0 if Product.objects.exists() else 1)"; then
    echo "    Catalog already populated — skipping seed."
else
    python manage.py seed_demo
fi

echo "==> Build complete"
