#!/usr/bin/env python
"""ShopHub backend development launcher.

Usage (from the backend/ folder):

    python run.py                 # serves http://127.0.0.1:8000/
    python run.py 0.0.0.0:8001    # custom host:port

Why this exists: the project's dependencies live in backend/.venv, so plain
`python manage.py runserver` fails unless the venv is active. This script
re-executes itself with the venv interpreter whenever it isn't already running
under it, then starts the server -- so a single `python run.py` always works,
with no `source .venv/Scripts/activate` and no absolute paths (which break in
Git Bash because the project folder name contains "!").

The venv is preferred even if some other interpreter happens to have Django
installed (e.g. via `pip install django` into user site-packages), because only
the venv has the full requirement set (celery, channels, DRF, ...).
"""
import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
VENV_PYTHON = BASE_DIR / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def django_available():
    try:
        import django  # noqa: F401
    except ImportError:
        return False
    return True


def run_with_venv():
    """Re-run this script using the venv interpreter. Returns False if absent."""
    if not VENV_PYTHON.exists():
        return False

    env = dict(os.environ)
    # Drop any stray Python env vars that would override the venv.
    for key in ("PYTHONHOME", "PYTHONPATH"):
        env.pop(key, None)

    print(f"[run.py] Using venv interpreter: {VENV_PYTHON}", flush=True)
    try:
        result = subprocess.run([str(VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]], env=env)
    except KeyboardInterrupt:
        return True
    sys.exit(result.returncode)


def in_venv():
    try:
        return Path(sys.executable).resolve() == VENV_PYTHON.resolve()
    except OSError:
        return False


def main():
    os.chdir(BASE_DIR)  # keep relative paths (db.sqlite3, media/, .env) correct

    addr = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1:8000"

    # Always prefer the project venv when it exists. The venv has the project's
    # FULL dependency set (celery, channels, DRF, ...). A Django install
    # elsewhere -- e.g. user site-packages via `pip install django` -- does NOT
    # include those, and would crash later with "No module named 'celery'".
    if VENV_PYTHON.exists() and not in_venv():
        if run_with_venv():
            return

    if not django_available():
        print(
            "[run.py] Django is not installed and no virtualenv was found at\n"
            f"         {VENV_PYTHON}\n"
            "         Create one and install dependencies:\n"
            "           python -m venv .venv\n"
            "           .venv/Scripts/python -m pip install -r requirements.txt",
            file=sys.stderr,
        )
        sys.exit(1)

    # manage.py normally sets this; we replicate it since we bypass manage.py.
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    from django.core.management import execute_from_command_line

    # The autoreloader re-runs this script in a child process; only announce once.
    if os.environ.get("RUN_MAIN") != "true":
        print(f"[run.py] Starting Django (ASGI/Daphne) on http://{addr}/  --  Ctrl+C to stop", flush=True)
    execute_from_command_line(["manage.py", "runserver", addr])


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)