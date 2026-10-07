"""Seed ShopHub with realistic demo data: catalog, users, orders, reviews, coupons."""
import random
from datetime import timedelta

from django.core.files.base import ContentFile
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Address, User
from coupons.models import Coupon
from orders.models import Order, OrderItem, OrderStatusHistory
from payments.models import Payment
from products.models import Brand, Category, Product, ProductImage, ProductVariant
from reviews.models import Review

random.seed(42)

NOW = timezone.now()

# ----------------------------------------------------------------- catalog
CATEGORIES = [
    ("Men's Fashion", "", ["Shirts", "Hoodies", "Jackets"]),
    ("Women's Fashion", "", ["Dresses", "Tops", "Outerwear"]),
    ("Electronics", "", ["Phones", "Laptops", "Audio", "Wearables"]),
    ("Shoes", "", ["Sneakers", "Boots", "Sandals"]),
    ("Home & Living", "", ["Furniture", "Kitchen", "Decor"]),
    ("Sports & Fitness", "", ["Gym Gear", "Outdoor"]),
    ("Beauty", "", ["Skincare", "Makeup"]),
    ("Gaming", "", ["Consoles", "Accessories"]),
]

BRANDS = [
    "Nike", "Adidas", "Apple", "Samsung", "Sony", "TechNova",
    "UrbanOak", "ZenFit", "GlowUp", "Aurora",
]

# name, category, subcategory, brand, price, compare_price, colors, sizes, material, emoji, featured
PRODUCTS = [
    # Men's Fashion
    ("Classic Oxford Shirt", "Men's Fashion", "Shirts", "UrbanOak", 49.99, 69.99, ["White", "Blue", "Beige"], ["S", "M", "L", "XL"], "100% Cotton", "", True),
    ("Performance Polo", "Men's Fashion", "Shirts", "ZenFit", 34.99, None, ["Black", "Navy"], ["M", "L", "XL"], "Poly Blend", "", False),
    ("Everyday Fleece Hoodie", "Men's Fashion", "Hoodies", "UrbanOak", 59.99, 79.99, ["Gray", "Black", "Olive"], ["S", "M", "L", "XL"], "Cotton Fleece", "", True),
    ("Denim Trucker Jacket", "Men's Fashion", "Jackets", "UrbanOak", 89.99, 119.99, ["Blue", "Black"], ["M", "L", "XL"], "Denim", "", False),
    ("Merino Crew Sweater", "Men's Fashion", "Shirts", "Aurora", 74.99, None, ["Charcoal", "Cream"], ["S", "M", "L"], "Merino Wool", "", False),
    # Women's Fashion
    ("Summer Wrap Dress", "Women's Fashion", "Dresses", "Aurora", 64.99, 84.99, ["Red", "Floral", "Black"], ["XS", "S", "M", "L"], "Viscose", "", True),
    ("Silk Blend Blouse", "Women's Fashion", "Tops", "Aurora", 54.99, None, ["Ivory", "Blush"], ["S", "M", "L"], "Silk Blend", "", False),
    ("Oversized Puffer Coat", "Women's Fashion", "Outerwear", "UrbanOak", 129.99, 169.99, ["Black", "Camel"], ["S", "M", "L"], "Recycled Poly", "", True),
    ("Ribbed Knit Top", "Women's Fashion", "Tops", "GlowUp", 29.99, 39.99, ["White", "Sage", "Black"], ["XS", "S", "M", "L"], "Ribbed Cotton", "", False),
    # Electronics
    ("NovaBook Pro 14", "Electronics", "Laptops", "TechNova", 1299.99, 1499.99, ["Space Gray", "Silver"], [], "Aluminum", "", True),
    ("Pulse X5 Smartphone", "Electronics", "Phones", "TechNova", 799.99, 899.99, ["Black", "Titanium"], ["128GB", "256GB"], "Glass & Metal", "", True),
    ("EchoSound Studio Headphones", "Electronics", "Audio", "Sony", 249.99, 299.99, ["Black", "White"], [], "Protein Leather", "", False),
    ("BassDrop Wireless Earbuds", "Electronics", "Audio", "Sony", 89.99, 119.99, ["Black", "Blue"], [], "ABS", "", True),
    ("PulseFit Smartwatch 3", "Electronics", "Wearables", "ZenFit", 199.99, 249.99, ["Black", "Rose Gold"], ["41mm", "45mm"], "Aluminum", "", True),
    ("NovaTab 11 Tablet", "Electronics", "Phones", "Samsung", 449.99, None, ["Gray"], ["64GB", "128GB"], "Aluminum", "", False),
    # Shoes
    ("AirFlex Running Shoes", "Shoes", "Sneakers", "Nike", 129.99, 159.99, ["Black", "White", "Red"], ["7", "8", "9", "10", "11", "12"], "Knit Mesh", "", True),
    ("CloudStep Trainers", "Shoes", "Sneakers", "Adidas", 99.99, 129.99, ["White", "Navy"], ["7", "8", "9", "10", "11"], "Mesh & Suede", "", True),
    ("TrailBlazer Hiking Boots", "Shoes", "Boots", "ZenFit", 149.99, None, ["Brown", "Black"], ["8", "9", "10", "11", "12"], "Leather", "", False),
    ("Coastline Sandals", "Shoes", "Sandals", "UrbanOak", 39.99, 54.99, ["Tan", "Black"], ["7", "8", "9", "10"], "Cork & Leather", "", False),
    ("Retro Court Sneakers", "Shoes", "Sneakers", "Nike", 109.99, None, ["White", "Green"], ["7", "8", "9", "10", "11"], "Leather", "", False),
    # Home & Living
    ("Scandinavian Lounge Chair", "Home & Living", "Furniture", "UrbanOak", 349.99, 449.99, ["Walnut", "Oak"], [], "Wood & Fabric", "", True),
    ("Chef's Knife Set", "Home & Living", "Kitchen", "Aurora", 119.99, 149.99, ["Steel"], [], "Stainless Steel", "", False),
    ("Aroma Diffuser Lamp", "Home & Living", "Decor", "GlowUp", 44.99, 59.99, ["White", "Bamboo"], [], "Ceramic", "", False),
    ("Linen Bed Sheet Set", "Home & Living", "Decor", "Aurora", 89.99, 119.99, ["White", "Sage", "Clay"], ["Queen", "King"], "Linen", "", False),
    ("CopperMug Espresso Machine", "Home & Living", "Kitchen", "TechNova", 299.99, 379.99, ["Copper", "Black"], [], "Steel", "", True),
    # Sports & Fitness
    ("ProGrip Yoga Mat", "Sports & Fitness", "Gym Gear", "ZenFit", 39.99, 49.99, ["Purple", "Teal", "Gray"], [], "TPE", "", False),
    ("AdjustFlex Dumbbells", "Sports & Fitness", "Gym Gear", "ZenFit", 249.99, 299.99, ["Black"], [], "Steel & Nylon", "", True),
    ("TrailRun Hydration Pack", "Sports & Fitness", "Outdoor", "Adidas", 59.99, None, ["Orange", "Black"], [], "Ripstop Nylon", "", False),
    ("SpeedRope Pro", "Sports & Fitness", "Gym Gear", "ZenFit", 19.99, 29.99, ["Red", "Black"], [], "Steel Cable", "", False),
    # Beauty
    ("GlowUp Vitamin C Serum", "Beauty", "Skincare", "GlowUp", 34.99, 44.99, [], ["30ml", "50ml"], "Organic", "", True),
    ("HydraBoost Moisturizer", "Beauty", "Skincare", "GlowUp", 29.99, None, [], ["50ml"], "Organic", "", False),
    ("Velvet Matte Lipstick", "Beauty", "Makeup", "Aurora", 19.99, 24.99, ["Ruby", "Nude", "Coral"], [], "Mineral", "", False),
    # Gaming
    ("Nitro X Console", "Gaming", "Consoles", "TechNova", 499.99, 549.99, ["White", "Black"], [], "Matte Polymer", "", True),
    ("StrikeMaster Wireless Mouse", "Gaming", "Accessories", "TechNova", 79.99, 99.99, ["Black", "White"], [], "ABS", "", False),
    ("KeyForce RGB Keyboard", "Gaming", "Accessories", "TechNova", 129.99, 159.99, ["Black"], ["TKL", "Full"], "Aluminum", "", True),
    ("GameVault Headset", "Gaming", "Accessories", "Sony", 99.99, 129.99, ["Black", "Red"], [], "Mesh & PU", "", False),
]


def svg_placeholder(title, emoji, c1, c2, fname):
    """Generate a pretty gradient SVG product placeholder."""
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="100%" stop-color="{c2}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="640" fill="url(#g)" rx="24"/>
  <circle cx="320" cy="270" r="150" fill="rgba(255,255,255,0.18)"/>
  <text x="320" y="330" font-size="150" text-anchor="middle">{emoji}</text>
  <text x="320" y="520" font-size="34" font-family="Segoe UI, sans-serif" font-weight="600"
        fill="#ffffff" text-anchor="middle">{title}</text>
</svg>"""
    return ContentFile(svg.encode("utf-8"), name=fname)


GRADIENTS = [
    ("#6366f1", "#8b5cf6"), ("#0ea5e9", "#6366f1"), ("#f43f5e", "#f97316"),
    ("#10b981", "#0ea5e9"), ("#f59e0b", "#ef4444"), ("#8b5cf6", "#ec4899"),
    ("#14b8a6", "#22c55e"), ("#3b82f6", "#06b6d4"),
]

REVIEW_TEXTS = [
    (5, "Absolutely love it!", "Exceeded my expectations. Great quality and fast shipping."),
    (5, "Best purchase this year", "I use it every single day. Highly recommend!"),
    (4, "Very good, minor quirks", "Really solid overall. Packaging could be better."),
    (4, "Great value for money", "Feels premium for the price. Would buy again."),
    (3, "Decent but not perfect", "Does the job. Slightly smaller than I expected."),
    (5, "Exactly as described", "Smooth checkout, arrived in two days. Verified quality."),
    (2, "Not for me", "Quality is fine but it didn't suit my needs."),
]

FIRST_NAMES = ["Ava", "Liam", "Mia", "Noah", "Zoe", "Ethan", "Luna", "Owen", "Ivy", "Leo"]
LAST_NAMES = ["Chen", "Patel", "Kim", "Garcia", "Nguyen", "Smith", "Ali", "Rossi", "Dubois", "Novak"]


ADDRESS_POOL = [
    {"label": "Home", "full_name": "", "phone": "+1 555 0100", "line1": "221B Baker Street",
     "city": "New York", "state": "NY", "postal_code": "10001", "country": "United States"},
    {"label": "Work", "full_name": "", "phone": "+1 555 0200", "line1": "42 Innovation Way",
     "city": "Austin", "state": "TX", "postal_code": "78701", "country": "United States"},
]


def seed_users():
    """Create admin, sellers and demo customers. Returns keyed users."""
    users = {}
    admin, _ = User.objects.get_or_create(
        username="admin",
        defaults={"email": "admin@shophub.dev", "role": User.Role.ADMIN,
                  "first_name": "Alex", "last_name": "Admin", "email_verified": True,
                  "is_staff": True, "is_superuser": True},
    )
    admin.set_password("Admin@12345")
    admin.save()
    users["admin"] = admin

    for username, email, store in [
        ("technova", "technova@shophub.dev", "TechNova Store"),
        ("urbanoak", "urbanoak@shophub.dev", "UrbanOak Collective"),
    ]:
        seller, _ = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "role": User.Role.SELLER, "email_verified": True},
        )
        seller.set_password("Seller@12345")
        seller.save()
        from sellers.models import SellerProfile

        SellerProfile.objects.get_or_create(
            user=seller,
            defaults={"store_name": store, "bio": f"Official {store} — quality guaranteed."},
        )
        users[username] = seller

    demo, _ = User.objects.get_or_create(
        username="demo",
        defaults={"email": "demo@shophub.dev", "role": User.Role.CUSTOMER,
                  "first_name": "John", "last_name": "Doe", "email_verified": True},
    )
    demo.set_password("Demo@12345")
    demo.save()
    users["demo"] = demo

    customers = [demo]
    for i in range(8):
        username = f"customer{i + 1}"
        first, last = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
        customer, created = User.objects.get_or_create(
            username=username,
            defaults={"email": f"{username}@example.com", "role": User.Role.CUSTOMER,
                      "first_name": first, "last_name": last, "email_verified": True},
        )
        if created:
            customer.set_password("Customer@12345")
            customer.save()
            addr = dict(random.choice(ADDRESS_POOL))
            addr["full_name"] = f"{first} {last}"
            Address.objects.create(user=customer, **addr)
        customers.append(customer)
    users["customers"] = customers
    return users


def seed_catalog(users):
    """Create categories, brands, products with images + variants."""
    sellers = [users["technova"], users["urbanoak"]]
    categories = {}
    subcategories = {}
    for name, icon, subs in CATEGORIES:
        cat, _ = Category.objects.get_or_create(name=name, defaults={"icon": icon})
        categories[name] = cat
        for sub in subs:
            child, _ = Category.objects.get_or_create(
                name=sub, defaults={"parent": cat, "icon": ""}
            )
            subcategories[(name, sub)] = child

    brands = {}
    for name in BRANDS:
        brands[name], _ = Brand.objects.get_or_create(name=name)

    products = []
    for idx, (name, cat, sub, brand, price, compare, colors, sizes, material, emoji, featured) in enumerate(PRODUCTS):
        # Products belong to their *subcategory* (e.g. "Shirts"); the parent
        # category is reached through Category.parent, and both the rollup
        # product_count and the shop filter traverse that relationship.
        leaf = subcategories.get((cat, sub)) or categories[cat]
        product, created = Product.objects.get_or_create(
            name=name,
            defaults={
                "description": (
                    f"Meet the {name} — crafted with {material.lower()} for everyday excellence. "
                    f"Part of our {sub} collection, loved by thousands of ShopHub customers. "
                    "Free returns within 30 days. Ships in recyclable packaging."
                ),
                "category": leaf,
                "brand": brands[brand],
                "seller": sellers[idx % len(sellers)],
                "price": price,
                "compare_price": compare,
                "material": material,
                "colors": colors,
                "sizes": sizes,
                "specs": {"Brand": brand, "Material": material, "Warranty": "1 year", "Origin": "Imported"},
                "shipping_info": "Free shipping over $150 · Standard 3-5 days · Express available",
                "is_featured": featured,
                "status": Product.Status.ACTIVE,
            },
        )
        if created:
            c1, c2 = GRADIENTS[idx % len(GRADIENTS)]
            fname = f"product-{product.pk}.svg"
            product.images.create(
                image=svg_placeholder(name, emoji, c1, c2, fname),
                alt=name, order=0,
            )
            product.images.create(
                image=svg_placeholder(f"{name} — detail", emoji, c2, c1, f"product-{product.pk}-b.svg"),
                alt=f"{name} detail", order=1,
            )
            # variants: color × size (or single default)
            combos = [(c, s) for c in (colors or [""]) for s in (sizes or [""])] or [("", "")]
            for ci, (color, size) in enumerate(combos[:12]):
                ProductVariant.objects.create(
                    product=product,
                    color=color[:50],
                    size=size[:50],
                    stock=random.choice([0, 3, 5, 12, 20, 20, 35, 48]),
                    sku=f"{product.pk}-{ci}",
                )
        products.append(product)

    # flash sale on 4 products (ends in 1-2 days)
    for product in random.sample(products, 4):
        product.flash_sale_end = NOW + timedelta(hours=random.randint(20, 48))
        if not product.compare_price:
            product.compare_price = product.price
            product.price = round(float(product.price) * 0.7, 2)
        product.save()
    return products


def seed_orders(users, products):
    """Create ~45 orders spread over the last 30 days to power analytics."""
    customers = users["customers"]
    flow = [
        ("pending", "Order placed."),
        ("paid", "Payment confirmed."),
        ("processing", "We're preparing your items."),
        ("shipped", "Your package is on its way "),
        ("out_for_delivery", "Arriving today!"),
        ("delivered", "Delivered. Enjoy your purchase!"),
    ]
    created = 0
    for i in range(45):
        customer = random.choice(customers)
        days_ago = random.randint(0, 29)
        when = NOW - timedelta(days=days_ago, hours=random.randint(0, 20))
        if Order.objects.filter(user=customer, created_at__date=when.date()).exists():
            continue
        subtotal = 0
        picks = random.sample(products, random.randint(1, 3))
        order = Order(
            user=customer,
            status="pending",
            delivery_method=random.choice(["standard", "standard", "express", "same_day"]),
            created_at=when,
        )
        addr = customer.addresses.first()
        order.ship_full_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
        order.ship_phone = addr.phone if addr else "+1 555 0100"
        order.ship_line1 = addr.line1 if addr else "1 Demo Lane"
        order.ship_city = addr.city if addr else "New York"
        order.ship_state = addr.state if addr else "NY"
        order.ship_postal_code = addr.postal_code if addr else "10001"
        order.ship_country = addr.country if addr else "United States"
        order.save()
        order.created_at = when
        order.save(update_fields=["created_at"])

        for product in picks:
            variant = product.variants.order_by("?").first() if product.variants.exists() else None
            qty = random.randint(1, 2)
            unit = variant.effective_price if variant else product.price
            OrderItem.objects.create(
                order=order,
                product=product,
                variant=variant,
                seller=product.seller,
                product_name=product.name,
                product_image=product.primary_image or "",
                variant_label=("/".join(p for p in (variant.color, variant.size) if p)) if variant else "",
                unit_price=unit,
                quantity=qty,
                line_total=unit * qty,
            )
            subtotal += unit * qty
            product.sold_count += qty
        Product.objects.bulk_update(picks, ["sold_count"])

        from decimal import Decimal

        order.subtotal = subtotal
        order.shipping = Decimal("0") if subtotal >= 150 else Decimal("9.99")
        order.tax = (subtotal * Decimal("0.08")).quantize(Decimal("0.01"))
        order.total = subtotal + order.shipping + order.tax

        # status by age: older → further along
        if days_ago >= 12:
            stage = 5
        elif days_ago >= 8:
            stage = random.choice([4, 5])
        elif days_ago >= 5:
            stage = random.choice([3, 4])
        elif days_ago >= 2:
            stage = random.choice([2, 3])
        else:
            stage = random.choice([0, 1, 2])
        if random.random() < 0.06:
            stage = -1  # cancelled/refunded
        if stage == -1:
            order.status = random.choice(["cancelled", "refunded"])
        else:
            order.status = flow[stage][0]
        order.save()

        for s in range(0, stage + 1) if stage >= 0 else [0]:
            OrderStatusHistory.objects.create(
                order=order,
                status=flow[s][0] if s < len(flow) else "pending",
                note=flow[s][1] if s < len(flow) else "",
                created_at=when + timedelta(hours=s * 20),
            )
        if stage >= 1:
            Payment.objects.create(
                order=order, provider="mock", amount=order.total,
                status="completed" if order.status != "refunded" else "refunded",
                reference=f"MOCK-SEED{order.pk:05d}",
                completed_at=when + timedelta(minutes=3),
            )
        created += 1
    return created


def seed_reviews(users, products):
    """Scatter realistic reviews (some verified via past purchase)."""
    customers = users["customers"]
    count = 0
    for product in products:
        for customer in random.sample(customers, random.randint(2, 5)):
            if Review.objects.filter(product=product, user=customer).exists():
                continue
            rating, title, body = random.choice(REVIEW_TEXTS)
            Review.objects.create(
                product=product,
                user=customer,
                rating=rating,
                title=title,
                body=body,
                verified_purchase=random.random() < 0.6,
                helpful_count=random.randint(0, 24),
                created_at=NOW - timedelta(days=random.randint(0, 25)),
            )
            count += 1
    return count


def seed_coupons():
    coupons = [
        dict(code="WELCOME10", description="10% off your first order", discount_type="percent",
             value=10, min_order_amount=0, valid_to=NOW + timedelta(days=365)),
        dict(code="SUMMER20", description="20% off orders over $50 (max $100 off)", discount_type="percent",
             value=20, min_order_amount=50, max_discount=100, valid_to=NOW + timedelta(days=60), usage_limit=500),
        dict(code="SAVE25", description="$25 off orders over $150", discount_type="fixed",
             value=25, min_order_amount=150, valid_to=NOW + timedelta(days=90), usage_limit=200),
    ]
    for c in coupons:
        Coupon.objects.get_or_create(code=c["code"], defaults=c)


class Command(BaseCommand):
    help = "Seed the ShopHub database with realistic demo data."

    def handle(self, *args, **options):
        self.stdout.write("Seeding users…")
        users = seed_users()
        self.stdout.write("Seeding catalog…")
        products = seed_catalog(users)
        self.stdout.write("Seeding reviews…")
        n_reviews = seed_reviews(users, products)
        self.stdout.write("Seeding orders…")
        n_orders = seed_orders(users, products)
        self.stdout.write("Seeding coupons…")
        seed_coupons()
        self.stdout.write("Attaching product/category photos…")
        try:
            call_command("load_unsplash_images")
        except Exception as exc:  # offline or CDN unreachable - keep SVGs
            self.stdout.write(self.style.WARNING(
                f"  Photo download skipped ({exc}); SVG placeholders kept."
            ))
        # Give every category a photo, including subcategories (which have no
        # curated Unsplash id of their own) and any top-level photo that failed.
        try:
            call_command("repair_category_images")
        except Exception as exc:  # noqa: BLE001 - never abort the seed
            self.stdout.write(self.style.WARNING(
                f"  Category photo repair skipped ({exc})."
            ))
        # Products sit on their leaf subcategory; top-level tiles roll the counts up.
        call_command("backfill_product_categories")
        self.stdout.write(self.style.SUCCESS(
            f"Done! {Product.objects.count()} products, {n_orders} orders, {n_reviews} reviews.\n"
            "  admin    : admin@shophub.dev / Admin@12345\n"
            "  sellers  : technova@shophub.dev, urbanoak@shophub.dev / Seller@12345\n"
            "  customer : demo@shophub.dev / Demo@12345"
        ))
