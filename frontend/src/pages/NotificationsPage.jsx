import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell, CircleCheck, CreditCard, Heart, Package, Truck, Zap,
} from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "../lib/utils";

const ICONS = {
  order_placed: <Package />,
  order_shipped: <Truck />,
  order_delivered: <CircleCheck />,
  payment: <CreditCard />,
  flash_sale: <Zap />,
  wishlist: <Heart />,
  generic: <Bell />,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, wsConnected } = useNotifications();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">Notifications</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-emerald-500" : "bg-amber-400"}`} />
            {wsConnected ? "Live updates on" : "Polling for updates"}
            {unreadCount > 0 && <span className="badge bg-brand-600 text-white">{unreadCount} new</span>}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markRead.mutate(null)} className="btn-outline !py-2 !text-xs">
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card grid place-items-center gap-3 py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-canvas text-2xl text-neutral-400">
            <Bell />
          </span>
          <p className="text-lg font-semibold">You're all caught up</p>
          <p className="text-sm text-muted">Order and promotion updates will appear here.</p>
          <Link to="/shop" className="btn-primary mt-2">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const unread = !n.read;
            const orderId = n.data?.order_id;
            return (
              <motion.button
                key={n.id ?? `live-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => {
                  if (unread && n.id) markRead.mutate(n.id);
                  if (orderId) navigate(`/orders/${orderId}`);
                }}
                className={`card flex w-full items-start gap-4 p-4 text-left transition hover:border-neutral-300 ${
                  unread ? "border-l-4 border-l-brand-600" : "opacity-75"
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-ink">
                  {ICONS[n.ntype] ?? ICONS.generic}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{n.title}</p>
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-neutral-400">{timeAgo(n.created_at)}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
