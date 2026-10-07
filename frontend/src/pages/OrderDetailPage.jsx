import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CircleCheck, Circle, Package, Truck, CircleX,
  MapPin, CreditCard, Calendar, ChevronLeft, RotateCcw,
  Printer, Lock, Shield, Check, X,
} from "lucide-react";
import { api, errMsg } from "../lib/api";
import { money, dateTimeFmt, dateFmt, img, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

const FLOW = ["pending", "paid", "processing", "shipped", "out_for_delivery", "delivered"];

const STATUS_ICONS = {};

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await api.get(`/orders/${id}/`)).data,
  });

  const cancel = useMutation({
    mutationFn: async () => (await api.post(`/orders/${id}/cancel/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order", id] }),
    onError: (e) => setError(errMsg(e)),
  });

  const advance = useMutation({
    mutationFn: async () => (await api.post(`/orders/${id}/advance/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order", id] }),
    onError: (e) => setError(errMsg(e)),
  });

  if (!order)
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-neutral-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-2xl bg-neutral-200" />
      </div>
    );

  const idx = FLOW.indexOf(order.status);
  const cancellable = ["pending", "paid", "processing"].includes(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "refunded";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Link to="/orders" className="inline-flex items-center gap-1 hover:text-brand-600 transition">
          <ChevronLeft size={14} /> My Orders
        </Link>
        <span>/</span>
        <span className="font-semibold text-ink">{order.order_number}</span>
      </nav>

      {/* ── Header card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {/* Top bar */}
        <div className="border-b border-line bg-neutral-50 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">Order number</p>
              <h1 className="text-2xl font-extrabold text-ink tracking-tight">{order.order_number}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} /> Placed {dateFmt(order.created_at)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Package size={13} /> {order.items?.length ?? 0} items
                </span>
              </div>
            </div>
            <span className={`badge text-sm px-3 py-1.5 capitalize ${ORDER_STATUS_COLORS[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
        </div>

        {/* Tracking timeline */}
        <div className="p-6">
          {!isCancelled ? (
            <>
              <p className="mb-6 text-sm font-semibold text-muted">Order Tracking</p>
              <div className="relative">
                {/* Horizontal line */}
                <div className="absolute left-0 right-0 top-5 h-1 bg-line">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: idx >= 0 ? `${(idx / (FLOW.length - 1)) * 100}%` : "0%" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>

                <div className="relative flex justify-between">
                  {FLOW.map((s, i) => {
                    const done = i <= idx;
                    const active = i === idx;
                    return (
                      <div key={s} className="flex flex-col items-center gap-2">
                        <motion.div
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.08 }}
                          className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 transition-all ${
                            done
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200"
                              : active
                              ? "border-brand-600 bg-white shadow-lg shadow-brand-600/20"
                              : "border-line bg-white text-neutral-300"
                          }`}
                        >
                          {done && !active ? (
                            <CircleCheck size={18} className="text-white" strokeWidth={2.5} />
                          ) : active ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                          ) : (
                            <Circle size={16} />
                          )}
                          {active && (
                            <span className="absolute inset-0 animate-ping rounded-full bg-brand-600 opacity-20" />
                          )}
                        </motion.div>
                        <p className={`text-center text-[10px] leading-tight sm:text-xs ${done ? "font-bold text-ink" : "text-muted"}`}>
                          {ORDER_STATUS_LABELS[s]}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {order.eta && (
                <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                  <Truck size={15} /> Estimated delivery: {dateTimeFmt(order.eta)}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-5 text-rose-700">
              <CircleX size={28} />
              <div>
                <p className="font-bold">Order {ORDER_STATUS_LABELS[order.status]}</p>
                <p className="text-sm opacity-80">This order was {ORDER_STATUS_LABELS[order.status]?.toLowerCase()}.</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-4">
          {cancellable && (
            <button
              onClick={() => { setError(""); cancel.mutate(); }}
              disabled={cancel.isPending}
              className="btn-outline !text-rose-600 hover:!border-rose-300 gap-2"
            >
              {cancel.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
              ) : (
                <CircleX size={15} />
              )}
              Cancel Order
            </button>
          )}
          {(isAdmin || user?.role === "seller") && idx >= 0 && idx < FLOW.length - 1 && (
            <button
              onClick={() => { setError(""); advance.mutate(); }}
              disabled={advance.isPending}
              className="btn-primary gap-2"
            >
              {advance.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Package size={15} />
              )}
              Advance Status (demo)
            </button>
          )}
          {error && (
            <p className="w-full rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {error}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Items & totals ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mt-5 overflow-hidden"
      >
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-bold text-ink">Order Items</h2>
        </div>
        <div className="divide-y divide-line">
          {order.items.map((i) => (
            <div key={i.id} className="flex items-center gap-4 px-6 py-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {i.product_image && (
                  <img src={img(i.product_image)} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {i.product_slug ? (
                  <Link to={`/product/${i.product_slug}`} className="line-clamp-1 font-semibold text-ink hover:text-brand-600 transition">
                    {i.product_name}
                  </Link>
                ) : (
                  <p className="font-semibold text-ink">{i.product_name}</p>
                )}
                <p className="mt-0.5 text-xs text-muted">
                  {i.variant_label && `${i.variant_label} · `}{money(i.unit_price)} × {i.quantity}
                </p>
              </div>
              <p className="shrink-0 font-extrabold text-ink">{money(i.line_total)}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 border-t border-line px-6 py-6 lg:grid-cols-2">
          {/* Shipping address & delivery */}
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                <MapPin size={15} className="text-brand-600" /> Shipping Address
              </div>
              <p className="text-sm leading-relaxed text-muted">
                <strong className="text-ink font-semibold">{order.address.full_name}</strong><br />
                {order.address.line1}<br />
                {order.address.city}, {order.address.state} {order.address.postal_code}<br />
                {order.address.country}<br />
                <span className="font-medium text-ink">{order.address.phone}</span>
              </p>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-bold text-ink">
                <Truck size={15} className="text-brand-600" /> Delivery Method
              </div>
              <p className="text-sm text-muted capitalize">{order.delivery_method?.replace("_", " ")}</p>
            </div>
          </div>

          {/* Totals */}
          <div>
            <div className="mb-3 flex items-center justify-between text-sm font-bold text-ink">
              <span className="flex items-center gap-2">
                <CreditCard size={15} className="text-brand-600" /> Financial Summary
              </span>
              <button
                onClick={() => setShowReceipt(true)}
                className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline font-semibold"
              >
                <Printer size={13} /> View Receipt
              </button>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Coupon {order.coupon_code}</span><span>− {money(order.discount)}</span></div>
              )}
              <div className="flex justify-between text-muted"><span>Shipping</span><span>{money(order.shipping)}</span></div>
              <div className="flex justify-between text-muted"><span>Tax</span><span>{money(order.tax)}</span></div>
              <div className="flex justify-between border-t border-line pt-2 font-extrabold text-ink text-base">
                <span>Total</span><span>{money(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment Status UI: Matching the User Blueprint ── */}
        <div className="border-t border-line bg-neutral-50/70 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Payment Verification Record</p>
              <h3 className="font-mono text-sm sm:text-base font-extrabold text-ink">
                PAYMENT #{order.payment?.reference || `PAY-${order.id * 10392 || "10392"}`}
              </h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                order.payment?.status === "completed" || order.status === "paid" || (FLOW.indexOf(order.status) >= 1 && order.status !== "cancelled")
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : order.payment?.status === "failed" || order.status === "cancelled"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : order.status === "refunded"
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {order.payment?.status === "completed" || order.status === "paid" || (FLOW.indexOf(order.status) >= 1 && order.status !== "cancelled") ? (
                <>PAID</>
              ) : order.payment?.status === "failed" || order.status === "cancelled" ? (
                <>FAILED</>
              ) : order.status === "refunded" ? (
                <>REFUNDED</>
              ) : (
                <>PENDING</>
              )}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-line bg-white p-4 text-xs">
            <div>
              <span className="block text-muted">Customer</span>
              <span className="font-semibold text-ink">{order.address?.full_name || user?.full_name || "Customer"}</span>
            </div>
            <div>
              <span className="block text-muted">Order</span>
              <span className="font-semibold font-mono text-ink">#{order.order_number}</span>
            </div>
            <div>
              <span className="block text-muted">Amount</span>
              <span className="font-extrabold text-ink">{money(order.total)}</span>
            </div>
            <div>
              <span className="block text-muted">Method</span>
              <span className="font-semibold text-ink">
                {order.payment?.provider === "card"
                  ? "Visa / Card"
                  : order.payment?.provider === "paypal"
                  ? "PayPal"
                  : order.payment?.provider === "apple_pay"
                  ? "Apple Pay"
                  : order.payment?.provider === "google_pay"
                  ? "Google Pay"
                  : "Card"}
              </span>
            </div>
            <div>
              <span className="block text-muted">Provider</span>
              <span className="font-medium capitalize text-ink">
                {order.payment?.provider === "stripe" ? "Stripe Checkout" : "Secure Payment Gateway"}
              </span>
            </div>
            <div>
              <span className="block text-muted">Transaction</span>
              <span className="font-mono text-[11px] text-muted truncate block">
                {order.payment?.reference || "pi_simulated"}
              </span>
            </div>
            <div>
              <span className="block text-muted">Created</span>
              <span className="text-ink">{dateFmt(order.created_at)}</span>
            </div>
            <div>
              <span className="block text-muted">Security Architecture</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Lock size={11} /> Tokenized (No raw card stored)
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Status history ── */}
      {order.history?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card mt-5 p-6"
        >
          <h2 className="mb-5 font-bold text-ink">Status History</h2>
          <div className="relative pl-5">
            <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-line" />
            <div className="space-y-4">
              {order.history.map((h, i) => (
                <div key={i} className="relative flex items-start gap-4">
                  <div className={`absolute -left-5 mt-0.5 h-3 w-3 rounded-full border-2 border-white ${i === order.history.length - 1 ? "bg-brand-600" : "bg-neutral-300"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{ORDER_STATUS_LABELS[h.status] ?? h.status}</p>
                    {h.note && <p className="text-xs text-muted">{h.note}</p>}
                  </div>
                  <p className="shrink-0 text-xs text-muted">{dateTimeFmt(h.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      {/* ── Official Customer Receipt Modal ── */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-neutral-100 text-muted hover:bg-neutral-200 hover:text-ink transition"
            >
              <X size={16} />
            </button>
            <div className="border-b border-dashed border-neutral-300 bg-neutral-50 px-6 py-6 text-center">
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <Check size={26} strokeWidth={3} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">PAYMENT SUCCESSFUL</p>
              <h2 className="mt-1 text-2xl font-black text-ink tracking-tight">ShopHub</h2>
              <p className="mt-1 text-xs text-muted">Customer Order Receipt</p>
              <div className="mt-3 flex items-center justify-center gap-3 text-xs font-medium text-muted">
                <span>Order <strong className="text-ink">#{order.order_number}</strong></span>
                <span>•</span>
                <span>Payment <strong className="text-ink">#{order.payment?.reference || `PAY-${order.id * 10392}`}</strong></span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2.5 pb-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink font-medium">
                      {item.product_name} {item.quantity > 1 && <span className="text-muted">×{item.quantity}</span>}
                    </span>
                    <span className="font-semibold text-ink">{money(item.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 border-t border-line py-3 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Shipping</span>
                  <span>{Number(order.shipping) === 0 ? "Free" : money(order.shipping)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Tax</span>
                  <span>{money(order.tax)}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>− {money(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-neutral-900 pt-3 text-lg font-black text-ink">
                  <span>TOTAL</span>
                  <span>{money(order.total)}</span>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-xs space-y-1.5 border border-line">
                <div className="flex justify-between">
                  <span className="text-muted">Method</span>
                  <span className="font-semibold text-ink capitalize">{order.payment?.provider || "Card"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Status</span>
                  <span className="font-bold text-emerald-700">Paid</span>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="btn-primary flex-1 gap-2 !py-2.5"
                >
                  <Printer size={15} /> Print Receipt
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="btn-outline flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
