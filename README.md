# ShopHub — Django E-Commerce Platform

A full-featured e-commerce web application with a **Django REST Framework** backend and a **React + Vite** frontend. It ships with a rich demo dataset, JWT authentication, anonymous carts, real-time notifications over WebSockets, seller & admin dashboards, and an optional Stripe payment integration.

## Tech Stack

**Backend** (`backend/`)

| Layer | Technology |
|---|---|
| Framework | Django 5.x + Django REST Framework |
| Auth | SimpleJWT (access/refresh, rotation + blacklist) |
| Real-time | Django Channels + Daphne (ASGI), WebSocket notifications |
| Tasks | Celery (eager by default; Redis broker optional) |
| API docs | drf-spectacular (OpenAPI + Swagger UI) |
| Database | SQLite (default) or MySQL via `DB_ENGINE` |
| Payments | Mock gateway (default) or Stripe |

**Frontend** (`frontend/`)

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 6 |
| Styling | Tailwind CSS 4 |
| Data fetching | TanStack React Query 5 + Axios |
| Routing | React Router 7 |
| Extras | Framer Motion, Lucide icons, Recharts (dashboards) |

## Features

- **Catalog** — products, variants, images, categories (nested), brands, search & filtering
- **Cart & checkout** — anonymous cart (via `x-cart-token`) merging into authenticated checkout
- **Orders** — checkout, order history, order detail, shipping/tax rules
- **Payments** — mock gateway by default; Stripe when `STRIPE_SECRET_KEY` is set
- **Coupons** — validation, active coupons, seeded promo codes (e.g. `WELCOME10`)
- **Reviews** — product reviews, verified-purchase flags, helpfulness votes
- **Wishlist** — add/remove items and share via public token link
- **Notifications** — REST list/read + **real-time WebSocket** updates (`/ws/notifications/`)
- **Seller dashboard** — store profile, products, sales analytics
- **Admin analytics** — KPI dashboard (Recharts) backed by `/api/admin/dashboard/`
- **Roles** — `ADMIN`, `SELLER`, `CUSTOMER` with role-based access
- **Background jobs** (Celery) — low-stock alerts, coupon expiry, flash-sale refresh, abandoned-cart reminders

## Project Structure

```
├── backend/
│   ├── config/            # settings, root URLs, ASGI/WSGI
│   ├── accounts/          # register, login, JWT, profiles, addresses
│   ├── products/          # products, categories, brands, images, variants
│   ├── cart/              # cart + cart items
│   ├── wishlist/          # wishlist + share tokens
│   ├── coupons/           # coupon validation
│   ├── orders/            # checkout, orders
│   ├── payments/          # mock/Stripe payment flows
│   ├── reviews/           # reviews + votes
│   ├── notifications/     # notifications + WebSocket consumer
│   ├── sellers/           # seller profiles & dashboard
│   ├── analytics/         # admin dashboard, Celery tasks, seed command
│   ├── requirements.txt
│   ├── .env.example       # copy to .env
│   ├── run.py             # dev launcher (auto-activates .venv)
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── pages/         # 15 pages (shop, cart, checkout, dashboards…)
│   │   ├── components/    # Navbar, Footer, BottomNav, UI pieces
│   │   ├── context/       # AuthContext, CartContext
│   │   ├── hooks/         # data hooks (incl. notifications)
│   │   └── lib/           # axios client (lib/api.js), utils
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ / npm
- (Optional) MySQL, Redis, Stripe account

### 1. Backend setup

```bash
cd backend

# Create & activate a virtualenv (Windows)
python -m venv .venv
.venv\Scripts\activate

# ...or on macOS/Linux
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Apply migrations
python manage.py migrate

# Load demo data (catalog, users, orders, reviews, coupons, photos)
python manage.py seed_demo
```

Start the API server (ASGI/Daphne):

```bash
python run.py                # http://127.0.0.1:8000/
python run.py 0.0.0.0:8001   # custom host:port
```

> `run.py` re-executes itself with `backend/.venv`'s interpreter, so it works
> even without manually activating the virtualenv.

### 2. Frontend setup

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

The frontend calls the API at `http://127.0.0.1:8000/api` by default.
Override with environment variables if needed:

```bash
# frontend/.env
VITE_API_BASE=http://127.0.0.1:8000/api
VITE_API_ORIGIN=http://127.0.0.1:8000
```

## Demo Accounts

Created by `python manage.py seed_demo`:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@12345` |
| Customer | `demo` | `Demo@12345` |
| Seller | `technova` | `Seller@12345` |
| Seller | `urbanoak` | `Seller@12345` |

Try coupon code **`WELCOME10`** at checkout.

## Useful URLs

| URL | Description |
|---|---|
| http://localhost:5173 | Frontend (Vite dev server) |
| http://127.0.0.1:8000/api/docs/ | Swagger UI (interactive API docs) |
| http://127.0.0.1:8000/api/schema/ | OpenAPI schema |
| http://127.0.0.1:8000/admin/ | Django admin |
| `ws://127.0.0.1:8000/ws/notifications/` | Notifications WebSocket |

### Main API endpoints

```
/api/auth/          register, login, refresh, profile, addresses
/api/products/      products (filter/search), /api/categories/, /api/brands/
/api/cart/          cart + items (anonymous via X-Cart-Token header)
/api/wishlist/      wishlist + share links
/api/coupons/       validate, active
/api/orders/        checkout, order list/detail
/api/payments/      pay/{order_id}/, status/{order_id}/
/api/reviews/       reviews + votes
/api/notifications/ list, mark read (+ WebSocket)
/api/sellers/       seller profile, dashboard
/api/admin/         admin analytics dashboard
```

## Environment Variables

All configuration lives in `backend/.env` (see `backend/.env.example`).
Everything has a working default — the app runs out of the box on SQLite with
a mock payment gateway, in-memory cache, eager Celery, and console email.

| Variable | Default | Purpose |
|---|---|---|
| `DJANGO_SECRET_KEY` | dev placeholder | Set a real key in production |
| `DJANGO_DEBUG` | `1` | `0` to disable debug |
| `DJANGO_ALLOWED_HOSTS` | `*` | Comma-separated hosts |
| `DB_ENGINE` | `sqlite` | `sqlite` or `mysql` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` | — | MySQL credentials |
| `REDIS_URL` | unset | Enables Redis cache |
| `CELERY_BROKER_URL` | unset | Enables real Celery worker/beat |
| `EMAIL_*` | console backend | SMTP settings for real emails |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | unset | Enables Stripe (else mock gateway) |
| `CORS_ALLOWED_ORIGINS` | `localhost:5173` | Allowed frontend origins |
| `FRONTEND_URL` | `http://localhost:5173` | Links in emails/payment redirects |
| `LOW_STOCK_THRESHOLD` | `5` | Stock level triggering alerts |
| `FREE_SHIPPING_THRESHOLD` | `150` | Cart subtotal for free shipping |
| `SHIPPING_FLAT_RATE` | `9.99` | Standard shipping cost |
| `TAX_RATE` | `0.08` | Order tax rate |
| `JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS` | `60` / `7` | Token lifetimes |

## Running Tests

```bash
cd backend
python manage.py test
```

Tests exist for all core apps: `accounts`, `products`, `cart`, `wishlist`,
`coupons`, `orders`, `payments`, `reviews`, `notifications`, `sellers`,
`analytics`.

## Production Notes

- Set `DJANGO_DEBUG=0`, a strong `DJANGO_SECRET_KEY`, and explicit `DJANGO_ALLOWED_HOSTS`.
- Switch to MySQL (`DB_ENGINE=mysql`) and Redis (`REDIS_URL`, `CELERY_BROKER_URL`), then run a Celery worker + beat for periodic tasks.
- Use real SMTP (`EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`) and Stripe keys.
- Swap the in-memory channel layer for `channels_redis` (see comment in `config/settings.py`).
- Collect static files with `python manage.py collectstatic`.


