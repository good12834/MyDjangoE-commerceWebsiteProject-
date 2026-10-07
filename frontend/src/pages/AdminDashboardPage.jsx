import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  TriangleAlert, DollarSign, Package, ShoppingBag, TrendingUp, Users,
} from "lucide-react";
import { api } from "../lib/api";
import { money, dateFmt, ORDER_STATUS_LABELS } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

const shortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function Kpi({ icon, label, value, sub }) {
  return (
    <div className="card p-5">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-canvas text-ink">{icon}</span>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="text-sm text-muted">{label}</p>
      {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await api.get("/admin/dashboard/")).data,
    enabled: !!user && isAdmin,
  });

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted">You don’t have permission to view this dashboard.</p>
        <Link to="/" className="btn-primary mt-5">Back to home</Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
        <div className="skeleton h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
        </div>
        <div className="skeleton h-72" />
      </div>
    );
  }

  const k = data.kpi ?? {};
  const series = (data.sales_by_day ?? []).map((d) => ({ ...d, revenue: Number(d.revenue) }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Store performance overview</p>
        </div>
        <span className="badge bg-neutral-900 text-white">Admin</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<DollarSign />} label="Total Revenue" value={money(k.revenue)} sub={`This month ${money(k.revenue_this_month)}`} />
        <Kpi icon={<ShoppingBag />} label="Orders" value={k.orders ?? 0} sub={`Avg order ${money(k.avg_order_value)}`} />
        <Kpi icon={<Users />} label="Customers" value={k.customers ?? 0} />
        <Kpi icon={<Package />} label="Active Products" value={k.products ?? 0} />
      </div>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 font-bold">Sales Analytics (30 days)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111111" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v) => money(v)} labelFormatter={shortDate} contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#111111" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 font-bold">Top Products</h2>
          {data.top_products?.length ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.top_products.map((p) => ({ name: p.product__name, revenue: Number(p.revenue) }))}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#111111" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted">No sales yet.</p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-bold">Orders by Status</h2>
          <div className="space-y-3">
            {Object.entries(data.status_breakdown ?? {}).map(([status, count]) => {
              const total = Object.values(data.status_breakdown).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize text-neutral-600">{ORDER_STATUS_LABELS[status] ?? status}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(data.status_breakdown ?? {}).length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
          </div>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 font-bold">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="py-2 pr-4 font-semibold">Order</th>
                <th className="py-2 pr-4 font-semibold">Customer</th>
                <th className="py-2 pr-4 font-semibold">Date</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(data.recent_orders ?? []).map((o) => (
                <tr key={o.order_number}>
                  <td className="py-2.5 pr-4 font-semibold">{o.order_number}</td>
                  <td className="py-2.5 pr-4 text-neutral-600">{o.customer}</td>
                  <td className="py-2.5 pr-4 text-neutral-500">{dateFmt(o.date)}</td>
                  <td className="py-2.5 pr-4 capitalize text-neutral-600">{ORDER_STATUS_LABELS[o.status] ?? o.status}</td>
                  <td className="py-2.5 text-right font-bold">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <TriangleAlert className="text-amber-500" /> Inventory Alerts
          </h2>
          <div className="space-y-2 text-sm">
            {(data.inventory?.low_stock ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                <span className="truncate text-amber-800">{p.name}</span>
                <span className="shrink-0 font-semibold text-amber-700">{p.stock} left</span>
              </div>
            ))}
            {(data.inventory?.out_of_stock ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                <span className="truncate text-red-700">{p.name}</span>
                <span className="shrink-0 font-semibold text-red-600">Out of stock</span>
              </div>
            ))}
            {!(data.inventory?.low_stock?.length || data.inventory?.out_of_stock?.length) && (
              <p className="text-muted">All products are well stocked.</p>
            )}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <TrendingUp className="text-ink" /> Top Customers
          </h2>
          <div className="divide-y divide-line text-sm">
            {(data.customers?.top ?? []).map((c) => (
              <div key={c.user__username} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-medium">{c.user__username}</span>
                <span className="text-neutral-500">{c.orders_count} orders</span>
                <span className="font-bold">{money(c.spent)}</span>
              </div>
            ))}
            {(data.customers?.top ?? []).length === 0 && <p className="py-2 text-muted">No customers yet.</p>}
          </div>
          <p className="mt-4 text-xs text-muted">
            New in last 30 days: <b className="text-ink">{data.customers?.new_30d ?? 0}</b> · Returning:{" "}
            <b className="text-ink">{data.customers?.returning ?? 0}</b>
          </p>
        </section>
      </div>
    </div>
  );
}
