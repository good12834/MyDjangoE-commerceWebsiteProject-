#!/usr/bin/env bash
# Build script for Render NATIVE Python runtime (manual Web Service).
# Use this ONLY if you are NOT using the Docker Blueprint (render.yaml).
# Dashboard settings for a manual service:
#   Root Directory : backend
#   Build Command  : bash build.sh
#   Start Command  : bash start-native.sh
set -o errexit
set -o pipefail

# Render sets the CWD to the Root Directory (backend/) before running this.
pip install --upgrade pip
pip install -r requirements.txt

# Collect admin / DRF / Swagger static so WhiteNoise can serve it.
python manage.py collectstatic --no-input
