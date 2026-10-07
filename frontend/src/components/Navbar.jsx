import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart, LogOut, Menu, Package, Settings,
  ShoppingBag, User, X, LayoutGrid, Truck,
  ChevronDown, Star, Bell,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, listOf } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNotifications } from "../hooks/useNotifications";
import { useWishlist } from "../hooks/useWishlist";
import SearchBar from "./SearchBar";

// Quick links live inside the Categories panel + mobile drawer.
// The header itself stays clean: Logo > Categories > Search > icons.
const QUICK_LINKS = [
  { to: "/shop?ordering=-created_at", label: "New In" },
  { to: "/shop?on_sale=1", label: "Flash Deals", hot: true },
  { to: "/#vip", label: "Insider Club", vip: true },
];

export default function Navbar() {
  const { user, logout, isAdmin, isSeller } = useAuth();
  const { itemCount } = useCart();
  const { ids } = useWishlist();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const close = () => { setUserOpen(false); setShopOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => listOf((await api.get("/categories/")).data),
    staleTime: 10 * 60 * 1000,
  });

  const avatar = user?.avatar ? user.avatar : null;
  const wishCount = user ? ids.size : 0;

  return (
    <>
      {/* Slim announcement - single line, centered */}
      <div className="relative overflow-hidden bg-neutral-950 text-white">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
        <p className="mx-auto flex h-8 max-w-7xl items-center justify-center gap-2 px-4 text-[11px] font-medium tracking-wide">
          <Truck size={12} className="shrink-0 text-amber-300" />
          <span className="truncate text-white/85">Complimentary shipping on orders over $150</span>
          <span className="shrink-0 rounded-full bg-amber-300 px-2 py-px text-[10px] font-bold text-neutral-950">
            WELCOME20
          </span>
        </p>
      </div>

      <header
        className={`sticky top-0 z-40 border-b bg-white/90 backdrop-blur-xl transition-shadow duration-300 ${
          scrolled ? "border-neutral-200 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]" : "border-line"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4">
          {/* MAIN ROW - Desktop: Logo > Categories > Search > Wishlist > Cart > Account */}
          {/* Mobile: Hamburger > Logo > Cart, search row underneath */}
          <div className="flex h-16 items-center gap-2 lg:gap-3">
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-neutral-800 transition hover:bg-neutral-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <Link to="/" className="group flex shrink-0 items-center gap-2" aria-label="ShopHub home">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-950 text-amber-300 shadow-md transition group-hover:shadow-lg">
                <ShoppingBag size={18} />
              </span>
              <span className="text-xl font-extrabold tracking-tight text-neutral-950">
                Shop<span className="text-neutral-400 transition group-hover:text-neutral-950">Hub</span>
              </span>
            </Link>

            {/* Categories trigger - desktop only */}
            <div className="relative hidden shrink-0 lg:block" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShopOpen((v) => !v)}
                onMouseEnter={() => setShopOpen(true)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  shopOpen ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                }`}
                aria-expanded={shopOpen}
                aria-haspopup="true"
              >
                <LayoutGrid size={15} />
                <span>Categories</span>
                <ChevronDown size={13} className={`transition-transform ${shopOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Large search - desktop only */}
            <SearchBar className="mx-2 hidden min-w-0 flex-1 lg:block" />

            <div className="-mr-1 ml-auto flex shrink-0 items-center gap-1 lg:ml-0 lg:gap-0.5">
              {/* Wishlist - desktop only (mobile uses bottom nav) */}
              <Link
                to={user ? "/wishlist" : "/login"}
                className="relative hidden h-10 items-center gap-2 rounded-xl px-3 text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950 lg:flex"
                aria-label="Wishlist"
              >
                <span className="relative">
                  <Heart size={20} />
                  {wishCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-neutral-950 px-1 text-[9px] font-bold text-amber-300">
                      {wishCount > 9 ? "9+" : wishCount}
                    </span>
                  )}
                </span>
                <span className="hidden text-[13px] font-semibold xl:inline">Wishlist</span>
              </Link>

              {/* Cart - always visible (mobile top-right) */}
              <Link
                to="/cart"
                className="relative flex h-10 items-center gap-2 rounded-xl px-3 text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
                aria-label={`Cart, ${itemCount} items`}
              >
                <span className="relative">
                  <ShoppingBag size={20} />
                  {itemCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-neutral-950 px-1 text-[9px] font-bold text-amber-300">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </span>
                <span className="hidden text-[13px] font-semibold xl:inline">Cart</span>
              </Link>

              {/* Account - desktop only (mobile uses bottom "Me" tab + drawer) */}
              <div className="relative hidden lg:block" onClick={(e) => e.stopPropagation()}>
                {user ? (
                  <button
                    onClick={() => setUserOpen((v) => !v)}
                    className={`relative flex h-10 items-center gap-1.5 rounded-xl px-2.5 transition ${
                      userOpen ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                    }`}
                    aria-expanded={userOpen}
                    aria-label="Account menu"
                  >
                    {avatar ? (
                      <img src={avatar} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-black/10" />
                    ) : (
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                        userOpen ? "bg-amber-300 text-neutral-950" : "bg-neutral-950 text-amber-300"
                      }`}>
                        {(user.first_name?.[0] || user.username?.[0] || user.email?.[0] || "U").toUpperCase()}
                      </span>
                    )}
                    <ChevronDown size={13} className={`hidden transition-transform xl:inline ${userOpen ? "rotate-180" : ""}`} />
                    {unreadCount > 0 && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                    )}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="flex h-10 items-center gap-2 rounded-xl px-3 text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
                    aria-label="Sign in"
                  >
                    <User size={20} />
                    <span className="hidden text-[13px] font-semibold xl:inline">Account</span>
                  </Link>
                )}

                <AnimatePresence>
                  {userOpen && user && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
                    >
                      <div className="border-b border-neutral-100 px-4 py-3">
                        <p className="truncate text-sm font-bold text-neutral-950">
                          Hi, {user.first_name || user.username || "there"}
                        </p>
                        <p className="truncate text-xs text-neutral-500">{user.email}</p>
                        {(isSeller || isAdmin) && (
                          <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            {isAdmin ? "Admin" : "Seller"}
                          </span>
                        )}
                      </div>
                      <div className="py-1.5">
                        <MenuItem to="/account" icon={<User size={15} />} label="My Account" onClick={() => setUserOpen(false)} />
                        <MenuItem to="/orders" icon={<Package size={15} />} label="Track My Order" onClick={() => setUserOpen(false)} />
                        <MenuItem to="/wishlist" icon={<Heart size={15} />} label="Wishlist" onClick={() => setUserOpen(false)} />
                        {unreadCount > 0 && (
                          <MenuItem to="/notifications" icon={<Bell size={15} />} label={`Notifications (${unreadCount})`} onClick={() => setUserOpen(false)} />
                        )}
                        {isSeller && <MenuItem to="/seller" icon={<Settings size={15} />} label="Seller Dashboard" onClick={() => setUserOpen(false)} />}
                        {isAdmin && <MenuItem to="/admin" icon={<Settings size={15} />} label="Admin Dashboard" onClick={() => setUserOpen(false)} />}
                        <button
                          onClick={() => { setUserOpen(false); logout(); navigate("/"); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                        >
                          <LogOut size={15} /> Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div className="pb-3 lg:hidden">
            <SearchBar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
        <AnimatePresence>
          {shopOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-x-0 top-full hidden border-b border-neutral-200 bg-white/95 shadow-2xl backdrop-blur-xl lg:block"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto grid max-w-7xl grid-cols-[1fr_220px_260px] gap-8 px-4 py-7">
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                    Shop by category
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => { setShopOpen(false); navigate("/shop"); }}
                      className="rounded-xl bg-neutral-950 px-3.5 py-3 text-left text-sm font-bold text-white transition hover:bg-neutral-800"
                    >
                      Shop All
                    </button>
                    {(categories ?? []).map((c) => (
                      <Link
                        key={c.id}
                        to={`/shop?category=${c.slug}`}
                        onClick={() => setShopOpen(false)}
                        className="rounded-xl px-3.5 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                    Collections
                  </p>
                  <div className="flex flex-col gap-1">
                    {QUICK_LINKS.map((l) => (
                      l.vip ? (
                        <a
                          key={l.to}
                          href={l.to}
                          onClick={() => setShopOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                        >
                          <Star size={14} /> {l.label}
                        </a>
                      ) : (
                        <Link
                          key={l.to}
                          to={l.to}
                          onClick={() => setShopOpen(false)}
                          className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                        >
                          {l.label}
                        </Link>
                      )
                    ))}
                  </div>
                </div>
                <a
                  href="/#vip"
                  onClick={() => setShopOpen(false)}
                  className="group relative overflow-hidden rounded-2xl bg-neutral-950 p-5 text-white"
                >
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl transition group-hover:bg-amber-300/30" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-300">Insider Club</p>
                  <p className="mt-1.5 text-lg font-extrabold leading-snug">Get $20 off your first order</p>
                  <span className="mt-3 inline-block rounded-full bg-amber-300 px-3 py-1.5 text-xs font-bold text-neutral-950">
                    Claim WELCOME20
                  </span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[60] bg-neutral-950/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.24 }}
              className="fixed inset-y-0 left-0 z-[61] flex w-[86%] max-w-sm flex-col bg-white shadow-2xl lg:hidden"
            >
              <div className="flex items-center gap-2.5 bg-neutral-950 px-4 py-4 text-white">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-neutral-950">
                  <ShoppingBag size={15} />
                </span>
                <span className="text-base font-extrabold tracking-tight">
                  Shop<span className="text-neutral-400">Hub</span>
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={19} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {user && (
                  <div className="mb-4 rounded-2xl bg-neutral-100 px-4 py-3">
                    <p className="truncate text-sm font-bold text-neutral-950">
                      Hi, {user.first_name || user.username || "there"}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{user.email}</p>
                  </div>
                )}
                <a
                  href="/#vip"
                  onClick={() => setMobileOpen(false)}
                  className="mb-4 flex items-center gap-3 rounded-2xl bg-neutral-950 p-4 text-white"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-300 text-neutral-950">
                    <Star size={16} />
                  </span>
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-amber-300">Insider Club</span>
                    <span className="block text-sm font-bold">Get $20 off With WELCOME20</span>
                  </span>
                </a>
                <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                  Shop by category
                </p>
                <nav className="flex flex-col gap-0.5">
                  <Link
                    to="/shop"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl bg-neutral-950 px-3 py-2.5 text-sm font-bold text-white"
                  >
                    Shop All
                  </Link>
                  {(categories ?? []).map((c) => (
                    <Link
                      key={c.id}
                      to={`/shop?category=${c.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                    >
                      {c.name}
                    </Link>
                  ))}
                </nav>
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                    Quick links
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    {QUICK_LINKS.map((l) => (
                      l.vip ? (
                        <a
                          key={l.to}
                          href={l.to}
                          onClick={() => setMobileOpen(false)}
                          className="rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                        >
                          {l.label}
                        </a>
                      ) : (
                        <Link
                          key={l.to}
                          to={l.to}
                          onClick={() => setMobileOpen(false)}
                          className="rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                        >
                          {l.label}
                        </Link>
                      )
                    ))}
                    <Link
                      to="/orders"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                    >
                      <Package size={15} className="text-neutral-400" /> Track My Order
                    </Link>
                    <Link
                      to={user ? "/wishlist" : "/login"}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                    >
                      <Heart size={15} className="text-neutral-400" /> Wishlist
                      {wishCount > 0 && (
                        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-neutral-950 px-1.5 text-[10px] font-bold text-amber-300">
                          {wishCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to={user ? "/account" : "/login"}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                    >
                      <User size={15} className="text-neutral-400" /> My Account
                      {unreadCount > 0 && (
                        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </nav>
                </div>
                {user ? (
                  <button
                    onClick={() => { setMobileOpen(false); logout(); navigate("/"); }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                ) : (
                  <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-xl bg-neutral-950 px-3 py-2.5 text-center text-sm font-bold text-white"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/register?seller=1"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-xl border border-neutral-200 px-3 py-2.5 text-center text-sm font-semibold text-neutral-700"
                    >
                      Become a Seller
                    </Link>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuItem({ to, icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
    >
      <span className="text-neutral-400">{icon}</span> {label}
    </Link>
  );
}
