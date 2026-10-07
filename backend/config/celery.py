"""Celery application — uses Redis broker when CELERY_BROKER_URL is set,
otherwise tasks run eagerly (synchronously) in-process for easy local dev."""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("shophub")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
