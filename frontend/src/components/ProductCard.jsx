import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Zap } from "lucide-react";
import { useState } from "react";
import { money, img } from "../lib/utils";
import RatingStars from "./RatingStars";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../hooks/useWishlist";
import { useAuth } from "../context/AuthContext";

export default function ProductCard({ product, index = 0 }) {
  const { addItem } = useCart();
  const { ids, toggle } = useWishlist();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");

  const inWishlist = ids.has(product.id);
  const image = img(product.image);

  const onAdd = async () => {
    setErr("");
    setAdding(true);
    try {
      await addItem({ product_id: product.id, quantity: 1 });
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not add");
    } finally {
      setAdding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:border-neutral-300 hover:shadow-[0_22px_45px_-28px_rgba(0,0,0,0.45)]"
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        <Link to={`/product/${product.slug}`} className="absolute inset-0 z-0 block">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-neutral-300"><ShoppingBag size={48} strokeWidth={1.25} /></div>
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
          {product.discount_pct > 0 && (
            <span className="badge bg-sale text-white">−{product.discount_pct}%</span>
          )}
          {product.flash_sale_end && (
            <span className="badge inline-flex items-center gap-1 bg-ink text-white"><Zap size={11} /> Flash Sale</span>
          )}
        </div>

        {!product.in_stock && (
          <span className="absolute inset-0 z-10 grid place-items-center bg-white/70 text-xs font-bold uppercase tracking-[0.2em] text-neutral-600">
            Sold out
          </span>
        )}

        {/* Quick add — desktop hover reveal */}
        <button
          onClick={onAdd}
          disabled={adding || !product.in_stock}
          className="absolute inset-x-3 bottom-3 z-10 hidden translate-y-2 items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-xs font-semibold text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 disabled:opacity-40 md:flex"
        >
          <ShoppingBag size={14} /> {adding ? "Adding…" : "Quick add"}
        </button>
      </div>

      <button
        onClick={() => user && toggle.mutate(product.id)}
        className={`absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border transition ${
          inWishlist
            ? "border-sale bg-sale text-white"
            : "border-transparent bg-white/90 text-neutral-500 hover:text-sale"
        }`}
        aria-label="Toggle wishlist"
        title={user ? "Wishlist" : "Log in to save"}
      >
        <Heart size={16} fill={inWishlist ? "currentColor" : "none"} />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.brand_name && (
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">{product.brand_name}</p>
        )}
        <Link
          to={`/product/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold leading-snug text-ink hover:underline"
        >
          {product.name}
        </Link>
        <RatingStars value={product.rating_avg} count={product.rating_count} />

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="text-base font-extrabold tracking-tight text-ink">{money(product.price)}</p>
            {product.compare_price && (
              <p className="text-xs text-neutral-400 line-through">{money(product.compare_price)}</p>
            )}
          </div>
          <button
            onClick={onAdd}
            disabled={adding || !product.in_stock}
            className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white transition hover:bg-black disabled:opacity-40 md:hidden"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBag size={16} />
          </button>
        </div>
        {err && <p className="text-xs text-danger">{err}</p>}
      </div>
    </motion.div>
  );
}

