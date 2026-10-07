import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  TriangleAlert, Box, DollarSign, Plus, ShoppingBag, TrendingUp, Users, X,
} from "lucide-react";
import { api, errMsg, listOf } from "../lib/api";
import { money, img, dateFmt, ORDER_STATUS_LABELS } from "../lib/utils";
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

export default function SellerDashboardPage() {
  const { user, isAdmin, isSeller } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const allowed = isSeller || isAdmin;

  const { data, isLoading } = useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: async () => (await api.get("/sellers/dashboard/")).data,
    enabled: !!user && allowed,
  });
  const products = useQuery({
    queryKey: ["seller-products"],
    queryFn: async () => (await api.get("/sellers/products/")).data,
    enabled: !!user && allowed,
  });

  if (!user) return <Navigate to="/login" replace />;
  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold">Seller access required</h1>
        <p className="mt-2 text-sm text-muted">You don't have permission to view this dashboard.</p>
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

  const series = (data.sales_by_day ?? []).map((d) => ({ ...d, revenue: Number(d.revenue) }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">Seller Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Manage your store, products and orders</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add product
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<DollarSign />} label="Revenue" value={money(data.revenue)} sub={`${data.pending_orders} pending orders`} />
        <Kpi icon={<ShoppingBag />} label="Orders" value={data.orders ?? 0} />
        <Kpi icon={<Users />} label="Customers" value={data.customers ?? 0} />
        <Kpi icon={<Box />} label="Products" value={data.products ?? 0} sub={`${data.low_stock_count} low stock`} />
      </div>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 font-bold">Sales (last 14 days)</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sellerRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111111" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v) => money(v)} labelFormatter={shortDate} contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#111111" strokeWidth={2} fill="url(#sellerRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <TrendingUp /> Top Products
          </h2>
          <div className="divide-y divide-line">
            {(data.top_products ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {img(p.image) && <img src={img(p.image)} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                <span className="shrink-0 text-xs text-muted">{p.sold_count} sold</span>
              </div>
            ))}
            {(data.top_products ?? []).length === 0 && <p className="py-2 text-sm text-muted">No sales yet.</p>}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-bold">Recent Orders</h2>
          <div className="divide-y divide-line text-sm">
            {(data.recent_orders ?? []).map((o) => (
              <div key={o.order_number} className="flex items-center gap-3 py-3">
                <span className="font-semibold">{o.order_number}</span>
                <span className="text-neutral-500">{o.customer}</span>
                <span className="ml-auto hidden text-xs capitalize text-neutral-400 sm:block">
                  {ORDER_STATUS_LABELS[o.status] ?? o.status}
                </span>
                <span className="font-bold">{money(o.total)}</span>
              </div>
            ))}
            {(data.recent_orders ?? []).length === 0 && <p className="py-2 text-muted">No orders yet.</p>}
          </div>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">My Products</h2>
          <span className="text-xs text-muted">{products.data?.length ?? 0} items</span>
        </div>
        {products.isLoading ? (
          <div className="skeleton h-32" />
        ) : (products.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No products yet. <button onClick={() => setShowForm(true)} className="font-semibold text-ink underline">Add your first product</button>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="py-2 pr-4 font-semibold">Product</th>
                  <th className="py-2 pr-4 font-semibold">Category</th>
                  <th className="py-2 pr-4 font-semibold">Price</th>
                  <th className="py-2 pr-4 font-semibold">Sold</th>
                  <th className="py-2 pr-4 font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.data.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                          {img(p.image) && <img src={img(p.image)} alt="" className="h-full w-full object-cover" />}
                        </span>
                        <Link to={`/product/${p.slug}`} className="font-medium hover:underline">{p.name}</Link>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-neutral-500">{p.category_name}</td>
                    <td className="py-2.5 pr-4 font-semibold">{money(p.price)}</td>
                    <td className="py-2.5 pr-4 text-neutral-500">{p.sold_count}</td>
                    <td className="py-2.5 pr-4 text-neutral-500">{Number(p.rating_avg).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <ProductForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["seller-products"] });
            qc.invalidateQueries({ queryKey: ["seller-dashboard"] });
          }}
        />
      )}
    </div>
  );
}

function ProductForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "", price: "", compare_price: "", category: "", brand: "",
    description: "", colors: "", sizes: "", image: "",
  });
  const [error, setError] = useState("");

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => listOf((await api.get("/categories/")).data),
  });
  const brands = useQuery({
    queryKey: ["brands"],
    queryFn: async () => listOf((await api.get("/brands/")).data),
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        price: form.price,
        compare_price: form.compare_price || null,
        category: Number(form.category),
        brand: form.brand ? Number(form.brand) : null,
        description: form.description,
        colors: form.colors ? form.colors.split(",").map((s) => s.trim()).filter(Boolean) : [],
        sizes: form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [],
        images: form.image ? [form.image] : [],
      };
      return (await api.post("/sellers/products/", payload)).data;
    },
    onSuccess: onSaved,
    onError: (e) => setError(errMsg(e)),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add a product</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            create.mutate();
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Name</label>
            <input className="input" value={form.name} onChange={set("name")} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Price</label>
              <input type="number" step="0.01" min="0" className="input" value={form.price} onChange={set("price")} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Compare price</label>
              <input type="number" step="0.01" min="0" className="input" value={form.compare_price} onChange={set("compare_price")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Category</label>
              <select className="input" value={form.category} onChange={set("category")} required>
                <option value="">Select…</option>
                {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Brand</label>
              <select className="input" value={form.brand} onChange={set("brand")}>
                <option value="">None</option>
                {(brands.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Description</label>
            <textarea rows={3} className="input" value={form.description} onChange={set("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Colors (comma separated)</label>
              <input className="input" value={form.colors} onChange={set("colors")} placeholder="Black, White" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Sizes (comma separated)</label>
              <input className="input" value={form.sizes} onChange={set("sizes")} placeholder="S, M, L" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Image URL</label>
            <input className="input" value={form.image} onChange={set("image")} placeholder="https://…" />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? "Saving…" : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
