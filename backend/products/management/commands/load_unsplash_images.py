"""Attach curated Unsplash photos to seeded products, categories and the homepage hero.

Downloads each photo from the Unsplash CDN once and stores it locally under
``backend/media/`` (no hotlinking).  For every product the primary gallery row is
re-pointed from the emoji SVG placeholder to a real JPEG and a second "detail" JPEG
(a zoomed crop of the same photo) replaces the secondary placeholder row.  SVG
placeholder files are never deleted: historical order snapshots reference their paths.
The homepage hero is a carousel; each curated photo is stored as its own JPEG under
``media/hero/`` (``home-hero.jpg``, ``home-hero-2.jpg``, ...).

The command is idempotent (re-running skips already-downloaded files unless
``--force``) and offline-tolerant: any failed download leaves the existing SVG
placeholder in place and is reported as a warning, never an error, so it is safe to
call from ``seed_demo``.
"""
import io
import time

import requests
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from PIL import Image, ImageOps

from products.models import Category, Product, ProductImage

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShopHubSeed/1.0"

# Curated photo IDs (validated visually against contact sheets f1-f3).
# Keys are product slugs, "cat-<category slug>" or "hero".
SELECTIONS = {
    "classic-oxford-shirt": "photo-1611619668823-13e82692eddc",
    "performance-polo": "photo-1720514496505-d6756368b0b3",
    "everyday-fleece-hoodie": "photo-1544393726-77046f17f6e1",
    "denim-trucker-jacket": "photo-1597726302654-1600751c345b",
    "merino-crew-sweater": "photo-1643016087636-69ebfe9c6450",
    "summer-wrap-dress": "photo-1528812757295-948554d4afe6",
    "silk-blend-blouse": "photo-1766056278948-dbb10f6d82bf",
    "oversized-puffer-coat": "photo-1621343342511-d9923a83bcf0",
    "ribbed-knit-top": "photo-1617922001439-4a2e6562f328",
    "novabook-pro-14": "photo-1541807084-5c52b6b3adef",
    "pulse-x5-smartphone": "photo-1672413514634-4781b15fd89e",
    "echosound-studio-headphones": "photo-1505740420928-5e560c06d30e",
    "bassdrop-wireless-earbuds": "photo-1579674862029-0c95379d570c",
    "pulsefit-smartwatch-3": "photo-1767903622388-4949aad2bd93",
    "novatab-11-tablet": "photo-1544244015-0df4b3ffc6b0",
    "airflex-running-shoes": "photo-1611080027147-a1a0b6e05168",
    "cloudstep-trainers": "photo-1625860191460-10a66c7384fb",
    "trailblazer-hiking-boots": "photo-1765530813373-255480ea4b42",
    "coastline-sandals": "photo-1758274406801-53151bcb4af7",
    "retro-court-sneakers": "photo-1727061180451-71b3a5f9d88f",
    "scandinavian-lounge-chair": "photo-1699588772787-1eed3b726e0a",
    "chefs-knife-set": "photo-1544965838-54ef8406f868",
    "aroma-diffuser-lamp": "photo-1732229033514-2bf407cc4ec7",
    "linen-bed-sheet-set": "photo-1601276174812-63280a55656e",
    "coppermug-espresso-machine": "photo-1518730338340-21e4933f6201",
    "adjustflex-dumbbells": "photo-1609674248079-e9242e48c06b",
    "trailrun-hydration-pack": "photo-1687120486999-50e606431357",
    "speedrope-pro": "photo-1634788699201-77bbb9428ab6",
    "glowup-vitamin-c-serum": "photo-1767256046031-743d33937c4e",
    "velvet-matte-lipstick": "photo-1626895872564-b691b6877b83",
    "nitro-x-console": "photo-1509198397868-475647b2a1e5",
    "strikemaster-wireless-mouse": "photo-1586210579191-33b45e38fa2c",
    "keyforce-rgb-keyboard": "photo-1644560286950-1807431fc64f",
    "gamevault-headset": "photo-1636487658834-26cd5ebb62fb",
    "hydraboost-moisturizer": "photo-1763503836825-97f5450d155a",
    "progrip-yoga-mat": "photo-1599901860904-17e6ed7083a0",
    "cat-mens-fashion": "photo-1555529771-835f59fc5efe",
    "cat-womens-fashion": "photo-1558769132-cb1aea458c5e",
    "cat-electronics": "photo-1468495244123-6c6c332eeece",
    "cat-shoes": "photo-1701485509508-58d495844f45",
    "cat-home-living": "photo-1583847268964-b28dc8f51f92",
    "cat-sports-fitness": "photo-1689877020200-403d8542d95d",
    "cat-beauty": "photo-1512496015851-a90fb38ba796",
    "cat-gaming": "photo-1616588589676-62b3bd4ff6d2",
}

# Homepage hero carousel slides: storage name -> Unsplash photo id.
# Slide 1 keeps the historical "hero/home-hero.jpg" path.  Keys are ordered.
HERO_SLIDES = {
    "hero/home-hero.jpg": "photo-1748515896775-30b183516cc7",
    "hero/home-hero-2.jpg": "photo-1483985988355-763728e1935b",
    "hero/home-hero-3.jpg": "photo-1773859096332-0e8c02063e4c",
    "hero/home-hero-4.jpg": "photo-1758520387659-9956c4516891",
}

def _fetch(photo_id, width, height, quality=75, attempts=3):
    """Download one Unsplash photo as validated JPEG bytes (raises on failure)."""
    url = (
        f"https://images.unsplash.com/{photo_id}"
        f"?w={width}&h={height}&fit=crop&crop=entropy&q={quality}&fm=jpg"
    )
    last = None
    for attempt in range(attempts):
        try:
            resp = requests.get(url, headers={"User-Agent": UA}, timeout=30)
            resp.raise_for_status()
            data = resp.content
            # Validate: must decode as a real image, not an HTML error page.
            with Image.open(io.BytesIO(data)) as probe:
                probe.verify()
            return data
        except Exception as exc:  # noqa: BLE001 - report and retry
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"download failed for {photo_id}: {last}")


def _detail_crop(jpeg_bytes, size=800, zoom=0.65, quality=75):
    """Derive a zoomed centre crop from the main photo (gallery second image)."""
    with Image.open(io.BytesIO(jpeg_bytes)) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        w, h = im.size
        cw, ch = max(1, int(w * zoom)), max(1, int(h * zoom))
        left, top = (w - cw) // 2, (h - ch) // 2
        detail = im.crop((left, top, left + cw, top + ch)).resize(
            (size, size), Image.LANCZOS
        )
        buf = io.BytesIO()
        detail.save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def _assign(field_file, storage_name, data, force):
    """Point an ImageField at ``storage_name`` holding ``data``.

    SVG files stored under a different name are left on disk (historical order
    snapshots reference them); stale JPEG duplicates are removed.  Returns True
    when storage changed.
    """
    storage = field_file.storage
    if field_file.name == storage_name and storage.exists(storage_name) and not force:
        return False
    if storage.exists(storage_name):
        storage.delete(storage_name)  # our own previous JPEG - keep names stable
    old = field_file.name
    if old and old.endswith(".jpg") and old != storage_name and storage.exists(old):
        storage.delete(old)
    field_file.save(storage_name.rsplit("/", 1)[-1], ContentFile(data), save=True)
    return True


class Command(BaseCommand):
    help = (
        "Download curated Unsplash photos into media/ and replace the emoji-SVG "
        "placeholders for all seeded products, categories and the homepage hero carousel."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true",
            help="Re-download photos even when the target files already exist.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        stats = {"ok": 0, "skip": 0, "fail": 0}
        failures = []

        product_keys = [k for k in SELECTIONS if not k.startswith("cat-")]
        category_keys = [k for k in SELECTIONS if k.startswith("cat-")]

        self.stdout.write(f"Products ({len(product_keys)})...")
        for slug in product_keys:
            self._product(slug, SELECTIONS[slug], force, stats, failures)

        self.stdout.write(f"Categories ({len(category_keys)})...")
        for key in category_keys:
            self._category(key[len("cat-"):], SELECTIONS[key], force, stats, failures)

        self.stdout.write(f"Hero carousel ({len(HERO_SLIDES)} slides)...")
        for storage_name, photo_id in HERO_SLIDES.items():
            self._hero(storage_name, photo_id, force, stats, failures)

        summary = (
            f"Done - {stats['ok']} updated, {stats['skip']} already set, "
            f"{stats['fail']} failed."
        )
        if stats["fail"]:
            self.stdout.write(self.style.WARNING(
                summary + " Failed items kept their SVG placeholders:\n  - "
                + "\n  - ".join(failures)
            ))
        else:
            self.stdout.write(self.style.SUCCESS(summary))


    # ------------------------------------------------------------------ pieces
    def _product(self, slug, photo_id, force, stats, failures):
        product = Product.objects.filter(slug=slug).first()
        if product is None:
            stats["fail"] += 1
            failures.append(f"product {slug} (not in database)")
            return
        rows = list(product.images.all())
        primary = rows[0] if rows else ProductImage(
            product=product, order=0, alt=product.name,
        )
        secondary = rows[1] if len(rows) > 1 else ProductImage(
            product=product, order=1, alt=f"{product.name} detail",
        )
        main_name = f"products/{slug}.jpg"
        detail_name = f"products/{slug}-detail.jpg"
        if (
            not force
            and primary.image.name == main_name
            and primary.image.storage.exists(main_name)
            and secondary.image.name == detail_name
            and secondary.image.storage.exists(detail_name)
        ):
            stats["skip"] += 1
            return
        try:
            data = _fetch(photo_id, 800, 800)
            changed = _assign(primary.image, main_name, data, force)
            changed |= _assign(
                secondary.image, detail_name, _detail_crop(data), force
            )
        except Exception as exc:  # noqa: BLE001 - keep SVG, warn, continue
            stats["fail"] += 1
            failures.append(f"product {slug} ({exc})")
            return
        stats["ok" if changed else "skip"] += 1
        self.stdout.write(f"  + {slug}")


    def _category(self, slug, photo_id, force, stats, failures):
        category = Category.objects.filter(slug=slug).first()
        if category is None:
            stats["fail"] += 1
            failures.append(f"category {slug} (not in database)")
            return
        storage_name = f"categories/{slug}.jpg"
        if (
            not force
            and category.image
            and category.image.name == storage_name
            and category.image.storage.exists(storage_name)
        ):
            stats["skip"] += 1
            return
        try:
            data = _fetch(photo_id, 640, 640)
            changed = _assign(category.image, storage_name, data, force)
        except Exception as exc:  # noqa: BLE001
            stats["fail"] += 1
            failures.append(f"category {slug} ({exc})")
            return
        stats["ok" if changed else "skip"] += 1
        self.stdout.write(f"  + {slug}")

    def _hero(self, storage_name, photo_id, force, stats, failures):
        """Download one carousel slide photo into ``storage_name`` under media/hero/."""
        if not force and default_storage.exists(storage_name):
            stats["skip"] += 1
            return
        try:
            data = _fetch(photo_id, 1600, 900, quality=78)
            if default_storage.exists(storage_name):
                default_storage.delete(storage_name)
            default_storage.save(storage_name, ContentFile(data))
        except Exception as exc:  # noqa: BLE001
            stats["fail"] += 1
            failures.append(f"hero {storage_name} ({exc})")
            return
        stats["ok"] += 1
        self.stdout.write(f"  + {storage_name}")

