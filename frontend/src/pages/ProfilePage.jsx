import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight, CreditCard, Heart, LogOut, MapPin, Package, Settings, User,
} from "lucide-react";
import { api, listOf } from "../lib/api";
import { money, dateFmt, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../hooks/useWishlist";

const NAV = [
  { href: "#profile", label: "Profile", icon: <User /> },
  { href: "#orders", label: "Orders", icon: <Package /> },
  { href: "#wishlist", label: "Wishlist", icon: <Heart /> },
  { href: "#addresses", label: "Addresses", icon: <MapPin /> },
  { href: "#payments", label: "Payments", icon: <CreditCard /> },
  { href: "#settings", label: "Settings", icon: <Settings /> },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { wishlist } = useWishlist();

  const orders = useQuery({
    queryKey: ["orders", "all"],
    queryFn: async () => listOf((await api.get("/orders/")).data),
    enabled: !!user,
  });
  const addresses = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => listOf((await api.get("/auth/addresses/")).data),
    enabled: !!user,
  });

  if (!user) return <Navigate to="/login" replace />;

  const addressList = addresses.data ?? [];
  const recent = (orders.data ?? []).slice(0, 5);
  const savedCount = wishlist?.items?.length ?? 0;
  const stats = [
    { label: "Orders", value: orders.data?.length ?? 0, icon: <Package /> },
    { label: "Wishlist", value: savedCount, icon: <Heart /> },
    { label: "Addresses", value: addressList.length, icon: <MapPin /> },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="section-title mb-6">My Account</h1>

      <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
        <aside className="card h-max p-2 lg:sticky lg:top-24">
          <nav className="flex flex-col">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-ink"
              >
                {n.icon} {n.label}
              </a>
            ))}
          </nav>
          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-red-50"
          >
            <LogOut /> Log out
          </button>
        </aside>

        <div className="space-y-6">
          <section id="profile" className="scroll-mt-24">
            <div className="card p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-ink text-lg font-bold text-white">
                  {user.username?.[0]?.toUpperCase()}
                </span>
                <div>
                  <p className="text-lg font-bold">Welcome back, {user.first_name || user.username}</p>
                  <p className="text-sm text-muted">{user.email}</p>
                </div>
                <span className="badge ml-auto bg-neutral-100 capitalize text-ink">{user.role}</span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-center gap-3 rounded-xl border border-line p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-canvas text-ink">{s.icon}</span>
                    <div>
                      <p className="text-xl font-extrabold leading-none text-ink">{s.value}</p>
                      <p className="mt-1 text-xs text-muted">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="orders" className="scroll-mt-24">
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold">Recent Orders</h2>
                <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:underline">
                  View all <ChevronRight size={14} />
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No orders yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {recent.map((o) => (
                    <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 py-3 text-sm">
                      <span className="font-semibold">{o.order_number}</span>
                      <span className={`badge capitalize ${ORDER_STATUS_COLORS[o.status]}`}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                      <span className="ml-auto hidden text-xs text-muted sm:block">{dateFmt(o.created_at)}</span>
                      <span className="font-bold">{money(o.total)}</span>
                      <ChevronRight className="text-neutral-300" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section id="wishlist" className="scroll-mt-24">
            <div className="card p-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-bold">Wishlist</h2>
                <Link to="/wishlist" className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:underline">
                  Open <ChevronRight size={14} />
                </Link>
              </div>
              <p className="text-sm text-muted">
                You have <b className="text-ink">{savedCount}</b> saved item{savedCount === 1 ? "" : "s"}.
              </p>
            </div>
          </section>

          <section id="addresses" className="scroll-mt-24">
            <div className="card p-6">
              <h2 className="mb-4 font-bold">Saved Addresses</h2>
              {addressList.length === 0 ? (
                <p className="text-sm text-muted">No saved addresses yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {addressList.map((a) => (
                    <div key={a.id} className="rounded-xl border border-line p-4 text-sm">
                      <p className="font-semibold">
                        {a.label}{" "}
                        {a.is_default && <span className="badge ml-1 bg-neutral-900 text-white">Default</span>}
                      </p>
                      <p className="mt-1 text-muted">{a.full_name}</p>
                      <p className="text-muted">
                        {a.line1}, {a.city} {a.postal_code}
                      </p>
                      <p className="text-muted">{a.country}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section id="payments" className="scroll-mt-24">
            <div className="card p-6">
              <h2 className="mb-2 font-bold">Payment Methods</h2>
              <p className="text-sm text-muted">
                Payments are processed securely at checkout — card details are never stored on ShopHub.
              </p>
            </div>
          </section>

          <section id="settings" className="scroll-mt-24">
            <div className="card p-6">
              <h2 className="mb-2 font-bold">Settings</h2>
              <p className="text-sm text-muted">
                Signed in as <b className="text-ink">{user.username}</b> ({user.email}).
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
