import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag, Sparkles } from "lucide-react";
import { img } from "../lib/utils";

// Verified fallback map to ensure every primary category displays photography
const FALLBACK_CATEGORY_IMAGES = {
  beauty: "/media/categories/beauty.jpg",
  electronics: "/media/categories/electronics.jpg",
  gaming: "/media/categories/gaming.jpg",
  "home-living": "/media/categories/home-living.jpg",
  "mens-fashion": "/media/categories/mens-fashion.jpg",
  shoes: "/media/categories/shoes.jpg",
  "sports-fitness": "/media/categories/sports-fitness.jpg",
  "womens-fashion": "/media/categories/womens-fashion.jpg",
  accessories: "/media/categories/accessories.jpg",
};

/**
 * Redesigned magazine-style category card:
 * High-res photography, frosted-glass metadata badges, ambient gradient overlays,
 * and responsive micro-interactions.
 */
export default function CategoryCard({ category, index = 0 }) {
  const { name, slug, icon, image, product_count } = category;

  // Primary image from backend or curated fallback
  const rawImage = image || FALLBACK_CATEGORY_IMAGES[slug];
  const photo = img(rawImage);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [photo]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4) }}
      className="h-full"
    >
      <Link
        to={`/shop?category=${slug}`}
        className="group relative flex h-72 sm:h-80 w-full flex-col justify-between overflow-hidden rounded-3xl border border-line/60 bg-neutral-900 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/20"
      >
        {/* Category Photo */}
        <div className="absolute inset-0 overflow-hidden">
          {photo && !broken ? (
            <img
              src={photo}
              alt={name}
              loading="lazy"
              onError={() => setBroken(true)}
              className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
              <span className="grid place-items-center text-white/60"><ShoppingBag size={56} strokeWidth={1.25} /></span>
            </div>
          )}
        </div>

        {/* Ambient Gradient Overlays for legibility & premium tone */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/20 opacity-80 transition-opacity duration-300 group-hover:opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-60" />

        {/* Top Header: Badge & Icon */}
        <div className="relative z-10 p-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <Sparkles size={13} className="shrink-0" />
            <span>
              {product_count != null
                ? `${product_count} ${product_count === 1 ? "Item" : "Items"}`
                : "Explore"}
            </span>
          </span>

          <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/10 text-white opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-75 backdrop-blur-md">
            <ShoppingBag size={14} />
          </span>
        </div>

        {/* Bottom Content: Title, Subtitle & Interactive CTA */}
        <div className="relative z-10 p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1">
            Collection
          </p>
          <h3 className="font-display text-2xl font-black tracking-tight text-white transition-transform duration-300 group-hover:translate-x-0.5">
            {name}
          </h3>

          <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3">
            <span className="text-xs font-medium text-white/70 transition-colors group-hover:text-white">
              Shop collection
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white group-hover:text-neutral-950 group-hover:scale-110">
              <ArrowRight size={15} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
