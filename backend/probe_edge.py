"""Edge-case probe: anonymous cart without token, stripe checkout, payment status, misc."""
import sys
import uuid

import requests

BASE = "http://127.0.0.1:8000/api"


def show(label, r, expect=(200, 201, 400, 401, 403, 404)):
    flag = "OK " if r.status_code in expect else "ERR"
    print(f"[{flag}] {label} -> {r.status_code}")
    print("      ", r.text[:300].replace("\n", " "))
    return r


def main():
    # 1. anonymous GET /cart/ WITHOUT the X-Cart-Token header
    show("GET /cart/ (no token)", requests.get(f"{BASE}/cart/", timeout=15))

    # 2. anonymous POST /cart/items/ WITHOUT token
    show(
        "POST /cart/items/ (no token)",
        requests.post(
            f"{BASE}/cart/items/",
            json={"product_id": 1, "quantity": 1},
            timeout=15,
        ),
    )

    # 3. PATCH a nonexistent cart item
    show(
        "PATCH /cart/items/999999/",
        requests.patch(
            f"{BASE}/cart/items/999999/",
            headers={"X-Cart-Token": "nope"},
            json={"quantity": 2},
            timeout=15,
        ),
        expect=(200, 400, 404),
    )

    # 4. stripe checkout with a non-empty cart (no stripe keys configured)
    token = f"probe2-{uuid.uuid4().hex[:8]}"
    h = {"X-Cart-Token": token}
    pid = requests.get(f"{BASE}/products/", timeout=15).json()["results"][0]["id"]
    r = requests.post(
        f"{BASE}/cart/items/",
        headers={**h, "Content-Type": "application/json"},
        json={"product_id": pid, "quantity": 1},
        timeout=15,
    )
    print(f"[{'OK ' if r.status_code in (200, 201) else 'ERR'}] add item -> {r.status_code}")

    uname = f"probe2{uuid.uuid4().hex[:6]}"
    auth = requests.post(
        f"{BASE}/auth/register/",
        json={
            "username": uname,
            "email": f"{uname}@example.com",
            "password": "Str0ngPass!23",
            "password2": "Str0ngPass!23",
        },
        timeout=15,
    ).json()
    ah = {"Authorization": f"Bearer {auth['access']}", **h, "Content-Type": "application/json"}

    address = {
        "full_name": "Probe Two",
        "phone": "+15550101",
        "line1": "2 Test Street",
        "city": "Testville",
        "state": "CA",
        "postal_code": "90210",
        "country": "United States",
    }
    show(
        "POST /orders/checkout/ (stripe, no keys)",
        requests.post(
            f"{BASE}/orders/checkout/",
            headers=ah,
            json={"address": address, "delivery_method": "express", "payment_method": "stripe"},
            timeout=25,
        ),
        expect=(200, 201, 400),
    )

    # 5. payment status for an order id that does not belong to us / doesn't exist
    ah_only = {"Authorization": ah["Authorization"]}
    show("GET /payments/status/999999/", requests.get(f"{BASE}/payments/status/999999/", headers=ah_only, timeout=15), expect=(200, 404))

    # 6. checkout with no address
    # add item again (cart was cleared)
    requests.post(
        f"{BASE}/cart/items/",
        headers={**h, "Content-Type": "application/json"},
        json={"product_id": pid, "quantity": 1},
        timeout=15,
    )
    show(
        "POST /orders/checkout/ (missing address)",
        requests.post(
            f"{BASE}/orders/checkout/",
            headers=ah,
            json={"delivery_method": "standard", "payment_method": "card"},
            timeout=20,
        ),
        expect=(200, 201, 400),
    )

    # 7. coupons list endpoint used by cart hint
    show("GET /coupons/validate/", requests.get(f"{BASE}/coupons/", timeout=15), expect=(200, 401, 403, 404))
    return 0


if __name__ == "__main__":
    sys.exit(main())
