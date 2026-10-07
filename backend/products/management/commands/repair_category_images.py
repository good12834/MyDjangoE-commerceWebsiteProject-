"""Guarantee that every category has a real, present photo on disk.

The seeder (``seed_demo`` → ``load_unsplash_images``) only attaches curated
Unsplash photos to the eight top-level categories.  Two things can therefore end
up broken on the "Shop by Category" grid:

* a curated photo that never downloaded (or was later cleaned up) leaves a
  ``Category.image`` row pointing at a file that does not exist — the browser
  renders a broken image;
* subcategories never get a photo of their own at all.

This command repairs both.  Categories with a curated photo id in
``load_unsplash_images.SELECTIONS`` are re-downloaded; every other category is
given a distinct, deterministic crop derived from its nearest ancestor that *does*
have a photo, so subcategory tiles are always visually unique but remain
topically correct.  Safe to re-run: it only writes when a file is missing or
``--force`` is passed.
"""
import io

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from PIL import Image, ImageEnhance, ImageOps

from products.models import Category

from .load_unsplash_images import SELECTIONS, _fetch


def _variant_crop(jpeg_bytes, zoom, bias_x, bias_y, size=640, quality=80):
    """Derive a square crop at a given zoom, nudged by a per-variant bias."""
    with Image.open(io.BytesIO(jpeg_bytes)) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        w, h = im.size
        cw, ch = max(1, int(w * zoom)), max(1, int(h * zoom))
        left = int((w - cw) * bias_x)
        top = int((h - ch) * bias_y)
        crop = im.crop((left, top, left + cw, top + ch)).resize(
            (size, size), Image.LANCZOS
        )
        # Gentle saturation lift keeps sibling tiles distinguishable.
        crop = ImageEnhance.Color(crop).enhance(1.04)
        buf = io.BytesIO()
        crop.save(buf, "JPEG", quality=quality, optimize=True)
        return buf.getvalue()


class Command(BaseCommand):
    help = (
        "Repair category photos: re-download curated top-level photos and derive "
        "distinct photos for subcategories, so no category renders a broken image."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true",
            help="Rewrite every category photo, even when one is already present.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        stats = {"ok": 0, "skip": 0, "fail": 0}
        failures = []

        for category in self._ordered():
            name = f"categories/{category.slug}.jpg"
            if not force and category.image and category.image.name == name \
                    and default_storage.exists(name):
                stats["skip"] += 1
                continue

            photo_id = SELECTIONS.get(f"cat-{category.slug}")
            if photo_id:
                try:
                    data = _fetch(photo_id, 640, 640)
                except Exception as exc:  # noqa: BLE001 - offline-tolerant
                    stats["fail"] += 1
                    failures.append(f"{category.slug} ({exc})")
                    continue
            else:
                source, sibling_index, sibling_total = self._variant_source(category)
                if source is None:
                    # No curated photo and no ancestor photo — nothing to derive from.
                    stats["skip"] += 1
                    continue
                try:
                    with source.image.storage.open(source.image.name) as fh:
                        base = fh.read()
                except Exception as exc:  # noqa: BLE001
                    stats["fail"] += 1
                    failures.append(f"{category.slug} (cannot read ancestor photo: {exc})")
                    continue
                zoom = max(0.45, 0.95 - sibling_index * (0.5 / max(1, sibling_total)))
                # Spread siblings across different regions of the parent photo.
                bias_x = 0.15 + (sibling_index % 3) * 0.35
                bias_y = 0.15 + (sibling_index // 3) * 0.35
                data = _variant_crop(base, zoom, min(bias_x, 0.85), min(bias_y, 0.85))

            if default_storage.exists(name):
                default_storage.delete(name)
            category.image.save(name.rsplit("/", 1)[-1], ContentFile(data), save=True)
            stats["ok"] += 1
            self.stdout.write(f"  + {category.slug}")

        summary = (
            f"Done - {stats['ok']} written, {stats['skip']} already ok, "
            f"{stats['fail']} failed."
        )
        if stats["fail"]:
            self.stdout.write(self.style.WARNING(
                summary + " Failed:\n  - " + "\n  - ".join(failures)
            ))
        else:
            self.stdout.write(self.style.SUCCESS(summary))

    # ------------------------------------------------------------------ helpers
    @staticmethod
    def _ordered():
        """Parents before children so a derived photo can rely on its parent."""
        return sorted(
            Category.objects.select_related("parent").all(),
            key=lambda c: (c.parent.name if c.parent_id else "", c.name),
        )

    @staticmethod
    def _variant_source(category):
        """Nearest ancestor with a usable photo, plus this node's sibling slot."""
        node = category.parent
        while node is not None:
            if node.image and node.image.storage.exists(node.image.name):
                break
            node = node.parent
        if node is None:
            return None, 0, 1
        siblings = list(
            Category.objects.filter(parent=category.parent).order_by("name")
            if category.parent_id
            else Category.objects.filter(parent__isnull=True).order_by("name")
        )
        names = [c.name for c in siblings]
        return node, names.index(category.name), max(1, len(names))
