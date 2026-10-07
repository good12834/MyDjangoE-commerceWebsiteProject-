import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minus, Plus, Tag, Trash2, Bookmark, ArrowRight,
  Shield, RefreshCw, Truck, X, Heart, ShoppingBag,
} from "lucide-react";
import { money, img } from "../lib/utils";
import { errMsg } from "../lib/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function CartPage() {
  const { cart, updateItem, removeItem, applyCoupon, clearCoupon, invalidate } = useCart();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const navigate = useNavigate();

  const goToCheckout = () => {
    if (!user) {
      navigate("/login?next=/checkout");
    } else {
      navigate("/checkout");
    }
  };

  if (!cart)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-xl bg-neutral-200" />
        <div className="grid gap-8 lg:grid-cols-[1fr,360px]">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-neutral-200" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-neutral-200" />
        </div>
      </div>
    );

  const items = cart.items.filter((i) => !i.saved_for_later);
  const saved = cart.items.filter((i) => i.saved_for_later);
  const t = cart.totals;

  const onCoupon = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await applyCoupon(code);
      setMsg({ ok: true, text: res.detail });
      setCode("");
    } catch (e2) {
      setMsg({ ok: false, text: errMsg(e2) });
    }
  };

  const handleRemove = async (id) => {
    setRemovingId(id);
    try {
      await removeItem(id);
    } catch {
      setMsg({ ok: false, text: "Could not remove item. Cart refreshed — please try again." });
    } finally {
      setRemovingId(null);
    }
  };

  const handleQty = async (id, payload) => {
    try {
      await updateItem(id, payload);
    } catch {
      setMsg({ ok: false, text: "Cart changed on the server — refreshed with the latest." });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-baseline gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Shopping Cart</h1>
        {items.length > 0 && (
          <span className="rounded-full bg-neutral-100 px-3 py-0.5 text-sm font-semibold text-muted">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {msg && !msg.ok && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {msg.text}
        </div>
      )}

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card flex flex-col items-center gap-5 py-24 text-center"
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-neutral-100">
            <ShoppingBag size={40} className="text-neutral-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-ink">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted">Browse the catalog and find something you love.</p>
          </div>
          <Link to="/shop" className="btn-primary mt-2 gap-2">
            Start Shopping <ArrowRight />
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr,360px]">
          {/* ── Left: Items ── */}
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: removingId === item.id ? 0.4 : 1, x: 0 }}
                  exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                  className="card overflow-hidden"
                >
                  <div className="flex gap-4 p-4 sm:p-5">
                    {/* Product image */}
                    <Link
                      to={`/product/${item.product.slug}`}
                      className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-neutral-100"
                    >
                      <img
                        src={img(item.product.image)}
                        alt={item.product.name}
                        className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      />
                    </Link>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/product/${item.product.slug}`}
                            className="line-clamp-1 font-semibold text-ink hover:text-brand-600 transition"
                          >
                            {item.product.name}
                          </Link>
                          {item.variant_label && (
                            <p className="mt-0.5 text-xs text-muted">{item.variant_label}</p>
                          )}
                          <p className="mt-1 text-sm font-medium text-muted">
                            {money(item.unit_price)} each
                          </p>
                        </div>
                        <p className="shrink-0 text-lg font-extrabold text-ink">
                          {money(item.line_total)}
                        </p>
                      </div>

                      {/* Stock warning */}
                      {item.available_stock <= 5 && (
                        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          Only {item.available_stock} left in stock
                        </p>
                      )}

                      {/* Actions row */}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {/* Quantity stepper */}
                        <div className="flex items-center overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                          <button
                            onClick={() => handleQty(item.id, { quantity: item.quantity - 1 })}
                            className="grid h-9 w-9 place-items-center text-muted hover:bg-neutral-100 transition"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-10 text-center text-sm font-bold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQty(item.id, { quantity: item.quantity + 1 })}
                            disabled={item.quantity >= item.available_stock}
                            className="grid h-9 w-9 place-items-center text-muted hover:bg-neutral-100 transition disabled:opacity-30"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => handleQty(item.id, { saved_for_later: true })}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-brand-600 transition"
                        >
                          <Heart size={13} /> Save for later
                        </button>

                        <button
                          onClick={() => handleRemove(item.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-rose-600 transition"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Trust badges */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: <Shield size={18} />, text: "Secure checkout" },
                { icon: <Truck size={18} />, text: "Free returns" },
                { icon: <RefreshCw size={18} />, text: "30-day returns" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1.5 rounded-2xl bg-neutral-50 p-3 text-center">
                  <span className="text-brand-600">{icon}</span>
                  <span className="text-[11px] font-semibold text-muted">{text}</span>
                </div>
              ))}
            </div>

            {/* Continue shopping */}
            <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline mt-2">
              ← Continue Shopping
            </Link>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="space-y-4">
            <div className="card h-max p-5 lg:sticky lg:top-24">
              <h2 className="mb-5 text-lg font-bold text-ink">Order Summary</h2>

              {/* Line items preview */}
              <div className="mb-4 space-y-2 border-b border-line pb-4">
                {items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      <img src={img(item.product.image)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="flex-1 truncate text-xs text-muted">{item.product.name}</span>
                    <span className="shrink-0 text-xs font-semibold">{money(item.line_total)}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-xs text-muted">+{items.length - 3} more items</p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2.5 text-sm">
                <SummaryRow label="Subtotal" value={money(t?.subtotal)} />
                {Number(t?.discount) > 0 && (
                  <SummaryRow
                    label={`Coupon (${t.coupon_code})`}
                    value={`− ${money(t.discount)}`}
                    green
                  />
                )}
                <SummaryRow label="Shipping (est.)" value={money(t?.shipping)} />
                <SummaryRow label="Tax (est.)" value={money(t?.tax)} />
                <div className="border-t border-line pt-3">
                  <SummaryRow label="Total" value={money(t?.total)} bold />
                </div>
              </div>

              {/* Coupon */}
              <div className="mt-5 border-t border-line pt-4">
                {t?.coupon_code ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <Tag size={14} /> {t.coupon_code}
                    </span>
                    <button
                      onClick={clearCoupon}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onCoupon} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Coupon code"
                        className="input !pl-8"
                      />
                    </div>
                    <button type="submit" className="btn-outline !px-4 !py-2 !text-xs shrink-0">
                      Apply
                    </button>
                  </form>
                )}
                {msg && (
                  <p className={`mt-2 text-xs font-medium ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>
                    {msg.text}
                  </p>
                )}
                {!t?.coupon_code && (
                  <p className="mt-2 text-[11px] text-muted">
                    Try <b>WELCOME10</b>, <b>SUMMER20</b> or <b>SAVE25</b>
                  </p>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={goToCheckout}
                className="btn-primary mt-5 w-full gap-2 !py-3.5 !text-base"
              >
                {user ? (
                  <>
                    Checkout <ArrowRight />
                  </>
                ) : (
                  <>
                    Sign in to Checkout <ArrowRight />
                  </>
                )}
              </button>

              {/* Secure notice */}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                <Shield size={12} /> Secure checkout — 256-bit SSL encryption
              </p>

              <button
                onClick={invalidate}
                className="mt-3 w-full text-center text-xs text-muted hover:text-ink transition"
              >
                <RefreshCw size={11} className="inline mr-1" />
                Refresh stock &amp; totals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved for later */}
      <AnimatePresence>
        {saved.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10"
          >
            <h2 className="mb-4 text-lg font-bold text-ink">
              Saved for later <span className="text-muted font-normal text-sm">({saved.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((item) => (
                <div key={item.id} className="card flex items-center gap-3 p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    <img src={img(item.product.image)} alt={item.product.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-ink">{item.product.name}</p>
                    <p className="text-xs text-muted">{money(item.unit_price)}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleQty(item.id, { saved_for_later: false })}
                      className="btn-outline !px-2.5 !py-1 !text-xs"
                    >
                      Move to cart
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-center text-xs text-muted hover:text-rose-600 transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryRow({ label, value, bold, green }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-bold text-ink" : "text-muted"}>{label}</span>
      <span
        className={`${bold ? "text-lg font-extrabold text-ink" : "font-semibold"} ${green ? "text-emerald-600" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
