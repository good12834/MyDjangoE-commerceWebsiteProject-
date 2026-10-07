import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Package, ChevronRight, ShoppingBag, Calendar,
  Filter, Truck,
} from "lucide-react";
import { api } from "../lib/api";
import { money, dateFmt, img, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "../lib/utils";

const FILTERS = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_ICONS = {};

export default function OrdersPage() {
  const [status, setStatus] = useState("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", status],
    queryFn: async () =>
      (await api.get("/orders/", { params: status !== "all" ? { status } : {} })).data,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">My Orders</h1>
        {orders?.length > 0 && (
          <p className="text-sm text-muted">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              status === f.value
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                : "bg-neutral-100 text-muted hover:bg-neutral-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200" />
          ))}
        </div>
      ) : orders?.length ? (
        <div className="space-y-3">
          {orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/orders/${o.id}`}
                className="card group flex items-center gap-4 p-4 transition hover:shadow-md hover:border-neutral-300"
              >
                {/* Product thumbnail */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                  {o.first_item_image ? (
                    <img
                      src={img(o.first_item_image)}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-neutral-400">
                      <Package size={22} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold text-ink">{o.order_number}</p>
                    <span className={`badge text-xs px-2.5 py-1 ${ORDER_STATUS_COLORS[o.status]}`}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} /> {dateFmt(o.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Package size={11} /> {o.item_count} {o.item_count === 1 ? "item" : "items"}
                    </span>
                    {o.delivery_method && (
                      <span className="inline-flex items-center gap-1 capitalize">
                        <Truck size={11} /> {o.delivery_method.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <p className="font-extrabold text-ink">{money(o.total)}</p>
                  <ChevronRight size={18} className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card flex flex-col items-center gap-5 py-24 text-center"
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-neutral-100">
            <ShoppingBag size={40} className="text-neutral-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-ink">No orders yet</p>
            <p className="mt-1 text-sm text-muted">
              {status !== "all"
                ? `No ${status.replace(/_/g, " ")} orders found.`
                : "Place your first order to get started."}
            </p>
          </div>
          <Link to="/shop" className="btn-primary mt-2 gap-2">
            Start Shopping <ChevronRight />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
