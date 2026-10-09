import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Package, Truck, ArrowRight, Shield, Lock } from "lucide-react";
import { api, errMsg } from "../lib/api";
import { money, img, dateFmt } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

export default function OrderSuccessPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [error, setError] = useState("");

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await api.get(`/orders/${id}/`)).data,
    retry: 2,
  });

  // Poll for webhook confirmation if payment still pending after Stripe redirect
  useEffect(() => {
    if (!order || order.payment?.status === "completed" || order.status === "paid") return;
    const t = setInterval(() => refetch(), 3000);
    return () => clearInterval(t);
  }, [order, refetch]);

  if (!id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-lg text-ink">No order reference found.</p>
        <Link to="/shop" className="btn-primary mt-4 inline-flex items-center gap-2">
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  let body;
  if (isLoading || !order) {
    body = (
      <div className="mx-auto max-w-lg px-4 py-20 space-y-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-neutral-200 mx-auto" />
        <div className="h-6 w-48 animate-pulse rounded bg-neutral-200 mx-auto" />
        <div className="h-4 w-64 animate-pulse rounded bg-neutral-200 mx-auto" />
      </div>
    );
  } else if (error) {
    body = (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-rose-600">{error}</p>
      </div>
    );
  } else {
    const pendingConfirmation =
      order.payment?.status !== "completed" && order.status !== "paid";

    body = (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg px-4 py-12"
      >
        <div className="card overflow-hidden border-2 border-line bg-white">
          {/* Success header */}
          <div className="border-b border-dashed border-neutral-300 bg-neutral-50/80 px-6 py-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm"
            >
              <Check size={32} strokeWidth={3} />
            </motion.div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              {pendingConfirmation ? "PAYMENT PROCESSING" : "PAYMENT SUCCESSFUL"}
            </p>
            <h1 className="mt-2 text-2xl font-black text-ink tracking-tight">
              Order #{order.order_number}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {pendingConfirmation
                ? "Your payment was authorized. We're confirming the final status…"
                : "Thank you for your purchase! A confirmation email has been sent to your registered address."}
            </p>
            <div className="mt-5 flex items-center justify-center gap-6 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Truck size={13} /> {order.delivery_method?.replace("_", " ")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Shield size={13} /> SSL / PCI-DSS
              </span>
            </div>
          </div>

          {/* Order summary */}
          <div className="p-6">
            <div className="mb-4 text-sm">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted">
                Estimated Delivery
              </span>
              <span className="font-semibold text-ink">
                {order.eta ? dateFmt(order.eta) : "—"}
              </span>
            </div>

            <div className="space-y-2.5 border-t border-line pt-3 text-sm">
              {order.items?.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-100">
                    {item.product_image && (
                      <img
                        src={img(item.product_image)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <span className="flex-1 truncate text-ink">
                    {item.product_name} {item.quantity > 1 && <span className="text-muted">×{item.quantity}</span>}
                  </span>
                  <span className="font-semibold">{money(item.line_total)}</span>
                </div>
              ))}
              {order.items?.length > 3 && (
                <p className="text-xs text-muted">+{order.items.length - 3} more item(s)</p>
              )}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span><span>{money(order.subtotal)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Coupon</span><span>− {money(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span>{Number(order.shipping) === 0 ? "Free" : money(order.shipping)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Tax</span><span>{money(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-900 pt-3 text-lg font-black text-ink">
                <span>Total</span><span>{money(order.total)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs space-y-1 border border-line">
              <div className="flex justify-between">
                <span className="text-muted">Payment Method</span>
                <span className="font-semibold text-ink">
                  {order.payment?.provider === "stripe" ? "Stripe Checkout" : "Card"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Status</span>
                {order.payment?.status === "completed" || order.status === "paid" ? (
                  <span className="font-bold text-emerald-700">Paid</span>
                ) : (
                  <span className="font-bold text-amber-700">Processing</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-line bg-neutral-50 px-6 py-4">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link
                to={`/orders/${order.id}`}
                className="btn-primary flex-1 justify-center gap-2 !py-3.5 !text-sm font-bold uppercase tracking-wider"
              >
                VIEW ORDER DETAILS <ArrowRight size={15} />
              </Link>
              <Link
                to="/shop"
                className="btn-outline flex-1 justify-center text-xs"
              >
                Continue Shopping
              </Link>
            </div>

            <p className="mt-3 text-center text-xs text-muted">
              <Lock size={11} className="inline mr-1" /> Secured by Stripe • PCI-DSS compliant
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pt-8 pb-16">
      {body}
    </div>
  );
}
