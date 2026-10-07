"""Backfill products onto their leaf subcategory.

``seed_demo`` originally attached every product to its *top-level* category and
only mentioned the subcategory in the description text, which left every
subcategory with zero products (and therefore "0 products" tiles and dead-end
sub-filters in the shop sidebar).

This command re-points existing products at the leaf category declared in
``seed_demo.PRODUCTS`` without touching prices, images, variants or order
history.  It is idempotent and safe to re-run.
"""
from django.core.management.base import BaseCommand

from analytics.management.commands.seed_demo import CATEGORIES, PRODUCTS
from products.models import Category, Product


class Command(BaseCommand):
    help = "Assign each seeded product to its leaf subcategory (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true", help="Report changes without saving."
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        parent_by_name = {name: name for name, _, _ in CATEGORIES}
        leaf = {}
        for parent, child in Category.objects.filter(parent__isnull=False).values_list(
            "parent__name", "name"
        ):
            leaf[(parent, child)] = (parent, child)

        moved, skipped, missing = 0, 0, []
        for name, cat_name, sub, *_ in PRODUCTS:
            product = Product.objects.filter(name=name).first()
            if product is None:
                missing.append(name)
                continue
            if (cat_name, sub) not in leaf:
                # Fall back to the top-level category when the sub is unknown.
                if cat_name not in parent_by_name:
                    missing.append(f"{name} ({cat_name}/{sub})")
                    continue
                target = Category.objects.get(name=cat_name)
            else:
                target = Category.objects.get(
                    name=sub, parent__name=cat_name
                )
            if product.category_id == target.pk:
                skipped += 1
                continue
            if not dry_run:
                product.category = target
                product.save(update_fields=["category"])
            moved += 1
            self.stdout.write(f"  {name}: -> {target.name}")

        verb = "would move" if dry_run else "moved"
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {moved} products, {skipped} already correct"
            + (f", {len(missing)} unknown: {missing}" if missing else "")
        ))
