export const money = (v) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const img = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_API_ORIGIN || "http://127.0.0.1:8000"}${url}`;
};

export const dateFmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export const dateTimeFmt = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

export const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const ORDER_STATUS_LABELS = {
  pending: "Order Placed",
  paid: "Payment Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const ORDER_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-violet-100 text-violet-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  refunded: "bg-gray-200 text-gray-700",
};
