# syntax=docker/dockerfile:1
# ShopHub Django backend — Render Docker image.
# Using an explicit Dockerfile (instead of Render's native Python runtime) gives
# us full, deterministic control over the interpreter and every build step.
# Python is pinned to 3.12 to match backend/.python-version and Render support.

FROM python:3.12-slim

# Stream logs, skip .pyc files, don't cache wheels (smaller image), default port.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=10000

# Runtime libraries needed by the prebuilt wheels we install:
#   - libpq5    -> psycopg (PostgreSQL client, used via DATABASE_URL on Render)
#   - libjpeg   -> Pillow (product image handling)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 libjpeg62-turbo \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so this layer is cached unless requirements change.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the application code.
COPY . .

# Collect static files (Django admin, DRF browsable API, Swagger docs) so
# WhiteNoise can serve them in production. Needs no database.
RUN python manage.py collectstatic --no-input

# start.sh applies migrations, seeds demo data on first boot, then execs Daphne
# (the ASGI server bundled with Channels) on the port Render assigns.
CMD ["bash", "start.sh"]
