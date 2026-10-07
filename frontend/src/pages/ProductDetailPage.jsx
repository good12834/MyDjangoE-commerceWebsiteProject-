import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CircleCheck, Handshake, Heart, Minus, Plus, ShoppingCart, Star, ThumbsUp, Truck, RotateCcw, Shield,
} from "lucide-react";
import { api, errMsg } from "../lib/api";
import { money, img, dateFmt } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../hooks/useWishlist";
import RatingStars from "../components/RatingStars";
import ProductRow from "../components/ProductRow";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { ids, toggle } = useWishlist();
  const qc = useQueryClient();

  const [qty, setQty] = useState(1);
  const [color, setColor] = useState(null);
  const [size, setSize] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const [reviewPage, setReviewPage] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => (await api.get(`/products/${slug}/`)).data,
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", product?.id, reviewPage],
    queryFn: async () =>
      (await api.get(`/reviews/products/${product.id}/`, { params: { page: reviewPage } })).data,
    enabled: !!product?.id,
  });

  const { data: related } = useQuery({
    queryKey: ["related", product?.id],
    queryFn: async () => (await api.get(`/products/${product.slug}/related/`)).data,
    enabled: !!product?.id,
  });

  const { data: fbt } = useQuery({
    queryKey: ["fbt", product?.id],
    queryFn: async () => (await api.get(`/products/${product.slug}/frequently_bought_together/`)).data,
    enabled: !!product?.id,
  });

  // Reset variant selections when switching products
  useMemo(() => {
    setColor(null);
    setSize(null);
    setQty(1);
  }, [product?.id]);

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-2">
        <div className="skeleton aspect-square" />
        <div className="space-y-4"><div className="skeleton h-8 w-3/4" /><div className="skeleton h-6 w-1/3" /><div className="skeleton h-40" /></div>
      </div>
    );
  }
  if (!product) return <div className="py-24 text-center text-gray-400">Product not found.</div>;

  const images = product.images?.length ? product.images : [];
  const [mainImage, ...thumbs] = images;
  const variants = product.variants ?? [];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];

  const chosenVariant = variants.find(
    (v) => (!colors.length || v.color === color) && (!sizes.length || v.size === size)
  );
  const stock = chosenVariant ? chosenVariant.stock : product.total_stock;
  const price = chosenVariant?.price ?? product.price;

  const addToCart = async () => {
    setFeedback(null);
    try {
      await addItem({
        product_id: product.id,
        variant_id: chosenVariant?.id ?? null,
        quantity: qty,
      });
      setFeedback({ ok: true, msg: "Added to cart!" });
    } catch (e) {
      setFeedback({ ok: false, msg: errMsg(e) });
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post(`/reviews/products/${product.id}/`, {
        rating: Number(fd.get("rating")),
        title: fd.get("title"),
        body: fd.get("body"),
      });
      e.target.reset();
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["product", slug] });
      setFeedback({ ok: true, msg: "Review submitted — thank you!" });
    } catch (e2) {
      setFeedback({ ok: false, msg: errMsg(e2) });
    }
  };

  const inWishlist = ids.has(product.id);
  const dist = reviews?.summary?.distribution ?? {};

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-400">
        <Link to="/" className="hover:text-brand-600">Home</Link> /
        <Link to={`/shop?category=${product.category_slug}`} className="hover:text-brand-600">{product.category_name}</Link> /
        <span className="truncate font-medium text-gray-700">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div
            className="relative aspect-square overflow-hidden rounded-3xl bg-gray-100"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ active: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
          >
            {mainImage ? (
              <img
                src={img(mainImage.image)}
                alt={mainImage.alt || product.name}
                className="h-full w-full object-cover transition-transform duration-200"
                style={zoom.active ? { transform: "scale(1.6)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : {}}
              />
            ) : (
              <div className="grid h-full place-items-center text-7xl text-neutral-300"><ShoppingBag size={64} strokeWidth={1.25} /></div>
            )}
            {product.discount_pct > 0 && (
              <span className="badge absolute left-4 top-4 bg-rose-500 text-white">-{product.discount_pct}%</span>
            )}
          </div>
          <div className="mt-3 flex gap-3">
            {thumbs.map((im) => (
              <div key={im.id} className="h-20 w-20 overflow-hidden rounded-xl border border-gray-200">
                <img src={img(im.image)} alt={im.alt} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          {product.brand_name && <p className="text-sm font-bold uppercase tracking-wide text-brand-600">{product.brand_name}</p>}
          <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{product.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <RatingStars value={product.rating_avg} />
            <a href="#reviews" className="text-sm text-brand-600 hover:underline">{product.rating_count} reviews</a>
            <span className="text-sm text-gray-400">· {product.sold_count} sold</span>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <p className="text-3xl font-extrabold">{money(price)}</p>
            {product.compare_price && <p className="pb-1 text-lg text-gray-400 line-through">{money(product.compare_price)}</p>}
          </div>

          <p className="mt-1 text-sm text-gray-500">
            {stock > 0 ? (
              stock <= 5 ? <span className="font-semibold text-amber-600">Only {stock} left in stock</span> : <span className="text-emerald-600">In stock</span>
            ) : <span className="text-rose-600">Out of stock</span>}
          </p>

          {/* Color */}
          {colors.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">Color: <span className="font-normal text-gray-500">{color ?? "choose…"}</span></p>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`rounded-xl border px-4 py-2 text-sm transition ${
                      color === c ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {sizes.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Size: <span className="font-normal text-gray-500">{size ?? "choose…"}</span></p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`h-11 min-w-11 rounded-xl border px-3 text-sm transition ${
                      size === s ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-gray-200">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-11 w-11 place-items-center" aria-label="Decrease quantity"><Minus size={15} /></button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button
                onClick={() => setQty(Math.min(stock || 99, qty + 1))}
                className="grid h-11 w-11 place-items-center"
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
            <button onClick={addToCart} disabled={stock <= 0} className="btn-primary flex-1 !py-3">
              <ShoppingCart size={18} /> Add to Cart
            </button>
            <button
              onClick={() => user && toggle.mutate(product.id)}
              className={`btn-outline !px-4 !py-3 ${inWishlist ? "!border-rose-300 !text-rose-500" : ""}`}
              title={user ? "Wishlist" : "Log in to save"}
            >
              <Heart fill={inWishlist ? "currentColor" : "none"} /> {inWishlist ? "Saved" : "Wishlist"}
            </button>
          </div>
          {feedback && (
            <p className={`mt-3 text-sm font-medium ${feedback.ok ? "text-emerald-600" : "text-rose-600"}`}>{feedback.msg}</p>
          )}

          {/* Perks */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
            <div className="card p-3"><Truck className="mx-auto mb-1 text-brand-600" size={18} /> Free ship $150+</div>
            <div className="card p-3"><RotateCcw className="mx-auto mb-1 text-brand-600" size={18} /> 30-day returns</div>
            <div className="card p-3"><Shield className="mx-auto mb-1 text-brand-600" size={18} /> 1-yr warranty</div>
          </div>

          {/* Description & specs */}
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-gray-600">
            <p>{product.description}</p>
            {product.shipping_info && <p className="rounded-xl bg-brand-50 p-3 text-brand-800">{product.shipping_info}</p>}
            {Object.keys(product.specs ?? {}).length > 0 && (
              <div>
                <p className="mb-1 font-semibold text-gray-900">Specifications</p>
                <dl className="grid grid-cols-[max-content,1fr] gap-x-6 gap-y-1">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-gray-400">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-14 scroll-mt-20">
        <h2 className="section-title mb-6">Customer Reviews</h2>
        <div className="grid gap-8 lg:grid-cols-[300px,1fr]">
          <div className="card h-max p-5 text-center">
            <p className="text-5xl font-extrabold">{reviews?.summary?.average?.toFixed?.(1) ?? "—"}</p>
            <div className="mt-2 flex justify-center"><RatingStars value={reviews?.summary?.average ?? 0} size={18} /></div>
            <p className="mt-1 text-sm text-gray-400">{reviews?.summary?.count ?? 0} reviews</p>
            <div className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => {
                const n = dist[String(s)] ?? 0;
                const pct = reviews?.summary?.count ? (n / reviews.summary.count) * 100 : 0;
                return (
                  <div key={s} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex w-8 items-center gap-1 text-left">{s}<Star size={11} className="fill-amber-400 text-amber-400" /></span>
                    <div className="h-2 flex-1 rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right">{n}</span>
                  </div>
                );
              })}
            </div>
            {user && (
              <form onSubmit={submitReview} className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-left">
                <p className="text-sm font-semibold">Write a review</p>
                <select name="rating" className="input" defaultValue="5" aria-label="Rating">
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
                </select>
                <input name="title" placeholder="Title" className="input" />
                <textarea name="body" placeholder="Share your experience…" rows={3} className="input" />
                <button className="btn-primary w-full !py-2 !text-xs">Submit review</button>
              </form>
            )}
          </div>

          <div className="space-y-4">
            {(reviews?.results ?? []).map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                      {r.author?.[0]?.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {r.author} {r.verified_purchase && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                            <CircleCheck size={12} /> Verified Purchase
                          </span>
                        )}
                      </p>
                      <RatingStars value={r.rating} size={12} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{dateFmt(r.created_at)}</span>
                </div>
                {r.title && <p className="mt-3 text-sm font-semibold">{r.title}</p>}
                <p className="mt-1 text-sm text-gray-600">{r.body}</p>
                <HelpfulButton reviewId={r.id} />
              </div>
            ))}
            {reviews?.total > 10 && (
              <button
                onClick={() => setReviewPage((p) => p + 1)}
                className="btn-outline w-full"
                hidden={reviewPage * 10 >= reviews.total}
              >
                Load more reviews
              </button>
            )}
          </div>
        </div>
      </section>

      <ProductRow title="Related Products" products={related ?? []} />
      <ProductRow title="Frequently Bought Together" icon={<Handshake className="text-brand-600" />} products={fbt ?? []} />
    </div>
  );
}

function HelpfulButton({ reviewId }) {
  const qc = useQueryClient();
  const [votes, setVotes] = useState(null);
  const vote = useMutation({
    mutationFn: async () => (await api.post(`/reviews/votes/${reviewId}/`, { helpful: true })).data,
    onSuccess: (data) => setVotes(data),
  });
  return (
    <button
      onClick={() => vote.mutate()}
      className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600"
    >
      <ThumbsUp size={13} /> Helpful ({votes?.helpful_count ?? 0})
    </button>
  );
}
