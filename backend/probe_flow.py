"""Throwaway end-to-end probe of cart -> checkout -> payment against a running server."""
import json
import sys
import uuid

import requests

BASE = "http://127.0.0.1:8000/api"
CART_TOKEN = f"probe-{uuid.uuid4().hex[:12]}"


def step(label, resp, want=None):
    ok = resp.status_code in (want or (200, 201))
    body = resp.text[:400]
    print(f"[{'OK ' if ok else 'ERR'}] {label} -> {resp.status_code}")
    if not ok:
        print("      ", body)
    try:
        return ok, resp.json()
    except Exception:
        return ok, {}


def main():
    results = requests.get(f"{BASE}/products/", timeout=15).json()["results"]
    pid = results[0]["id"]
    h = {"X-Cart-Token": CART_TOKEN}

    step("GET /cart/ (anonymous)", requests.get(f"{BASE}/cart/", headers=h, timeout=15))

    ok, data = step(
        "POST /cart/items/",
        requests.post(
            f"{BASE}/cart/items/",
            headers={**h, "Content-Type": "application/json"},
            json={"product_id": pid, "quantity": 2},
            timeout=15,
        ),
        want=(200, 201),
    )
    item_id = data["items"][0]["id"] if data.get("items") else None

    step(
        "PATCH /cart/items/<id>/ qty",
        requests.patch(
            f"{BASE}/cart/items/{item_id}/",
            headers={**h, "Content-Type": "application/json"},
            json={"quantity": 3},
            timeout=15,
        ),
    )
    step(
        "POST /cart/coupon/",
        requests.post(
            f"{BASE}/cart/coupon/",
            headers={**h, "Content-Type": "application/json"},
            json={"code": "WELCOME10"},
            timeout=15,
        ),
    )

    # register + login
    uname = f"probe{uuid.uuid4().hex[:8]}"
    ok, auth = step(
        "POST /auth/register/",
        requests.post(
            f"{BASE}/auth/register/",
            json={
                "username": uname,
                "email": f"{uname}@example.com",
                "password": "Str0ngPass!23",
                "password2": "Str0ngPass!23",
            },
            timeout=15,
        ),
        want=(200, 201),
    )
    if not ok:
        return 1
    auth_h = {"Authorization": f"Bearer {auth['access']}", **h}

    step("POST /cart/merge/", requests.post(f"{BASE}/cart/merge/", headers=auth_h, timeout=15))
    ok, cart = step("GET /cart/ (authed)", requests.get(f"{BASE}/cart/", headers=auth_h, timeout=15))
    print("      cart items:", cart.get("item_count"), "totals:", cart.get("totals"))

    address = {
        "full_name": "Probe Tester",
        "phone": "+15550100",
        "line1": "1 Test Street",
        "city": "Testville",
        "state": "CA",
        "postal_code": "90210",
        "country": "United States",
    }
    ok, order = step(
        "POST /orders/checkout/",
        requests.post(
            f"{BASE}/orders/checkout/",
            headers={**auth_h, "Content-Type": "application/json"},
            json={"address": address, "delivery_method": "standard", "payment_method": "mock"},
            timeout=20,
        ),
        want=(200, 201),
    )
    if not ok:
        return 1
    print("      order:", order.get("order_number"), "total:", order.get("total"),
          "payment:", order.get("payment"))
    oid = order.get("id")

    ok, status = step(
        "GET /payments/status/<id>/",
        requests.get(f"{BASE}/payments/status/{oid}/", headers=auth_h, timeout=15),
    )
    print("      ", status)

    # try paying again (should be a clean 400, not a 500)
    r = requests.post(
        f"{BASE}/payments/pay/{oid}/",
        headers={**auth_h, "Content-Type": "application/json"},
        json={"method": "mock"},
        timeout=15,
    )
    print(f"[{'OK ' if r.status_code in (200, 400) else 'ERR'}] POST /payments/pay/<id>/ (again) -> {r.status_code}")
    print("      ", r.text[:300])

    # stripe path without keys configured should not 500
    ok, order2 = step(
        "POST /orders/checkout/ (stripe)",
        requests.post(
            f"{BASE}/orders/checkout/",
            headers={**auth_h, "Content-Type": "application/json"},
            json={"address": address, "delivery_method": "express", "payment_method": "stripe"},
            timeout=20,
        ),
        want=(200, 201),
    )
    if ok:
        print("      payment:", order2.get("payment"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
