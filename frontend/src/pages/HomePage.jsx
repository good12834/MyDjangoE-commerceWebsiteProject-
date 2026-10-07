import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight, ChevronRight, Clock, RotateCcw, Shield, Star, TrendingUp,
  Truck, Zap, CircleCheck, Package, Mail, Gift, Award, Check, ShoppingBag,
  Brain, Headphones, Sparkles, SearchX,
} from "lucide-react";
import { api, listOf } from "../lib/api";
import { money, dateFmt, img } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import ProductCard from "../components/ProductCard";
import ProductRow from "../components/ProductRow";
import CategoryCard from "../components/CategoryCard";
import Countdown from "../components/Countdown";
import RatingStars from "../components/RatingStars";
import HeroCarousel from "../components/HeroCarousel";

// Hero carousel slides. Photos live in backend/media/hero/ and are downloaded by
// the `load_unsplash_images` management command (see HERO_SLIDES there).
const HERO_SLIDES = [
  {
    image: img("/media/hero/home-hero.jpg"),
    eyebrow: "New Season Collection 2026",
    title: "Discover something new.",
    subtitle:
      "Fashion, electronics, home & more from top brands — free shipping over $150, 30-day returns and 1M+ happy shoppers.",
    ctaLabel: "Shop Now",
    ctaTo: "/shop",
    secondaryLabel: "View Deals",
    secondaryTo: "/shop?on_sale=1",
  },
  {
    image: img("/media/hero/home-hero-2.jpg"),
    eyebrow: "Style for every season",
    title: "Wardrobe refresh, sorted.",
    subtitle:
      "Menswear and womenswear picks from trending brands — easy returns and free shipping over $150.",
    ctaLabel: "Shop Fashion",
    ctaTo: "/shop?category=mens-fashion",
    secondaryLabel: "Womenswear",
    secondaryTo: "/shop?category=womens-fashion",
  },
  {
    image: img("/media/hero/home-hero-3.jpg"),
    eyebrow: "Tech & Gaming",
    title: "Upgrade your everyday.",
    subtitle:
      "Laptops, smartphones, audio and gaming gear — dealer warranties and next-day delivery on select items.",
    ctaLabel: "Shop Electronics",
    ctaTo: "/shop?category=electronics",
    secondaryLabel: "Browse Gaming",
    secondaryTo: "/shop?category=gaming",
  },
  {
    image: img("/media/hero/home-hero-4.jpg"),
    eyebrow: "Home, Living & Fitness",
    title: "Make home feel new.",
    subtitle:
      "Furniture, kitchenware, bedding and training essentials — curated quality with free shipping over $150.",
    ctaLabel: "Shop Home & Living",
    ctaTo: "/shop?category=home-living",
    secondaryLabel: "Sports & Fitness",
    secondaryTo: "/shop?category=sports-fitness",
  },
];

function useSection(url, key) {
  return useQuery({
    queryKey: [key],
    queryFn: async () => (await api.get(url)).data.results ?? [],
    staleTime: 60 * 1000,
  });
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => listOf((await api.get("/categories/")).data),
    staleTime: 10 * 60 * 1000,
  });
  const trending = useSection("/products/trending/", "trending");
  const flash = useSection("/products/flash_sale/", "flash");
  const arrivals = useSection("/products/new_arrivals/", "arrivals");
  const best = useSection("/products/best_sellers/", "best");
  const recommended = useQuery({
    queryKey: ["recommended"],
    queryFn: async () => (await api.get("/products/recommended/")).data,
    enabled: !!user,
  });
  const reviews = useQuery({
    queryKey: ["top-reviews"],
    queryFn: async () => {
      const { data } = await api.get("/reviews/products/1/");
      return data.results?.filter((r) => r.rating >= 4).slice(0, 3) ?? [];
    },
  });

  const [catFilter, setCatFilter] = useState("all");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // The API returns the whole tree; the homepage grid shows only the top level.
  // Each tile's product_count already rolls up its subcategories.
  const topCategories = (categories.data ?? []).filter((c) => c.parent == null);

  const filteredCategories = topCategories.filter((c) => {
    if (catFilter === "all") return true;
    if (catFilter === "fashion")
      return ["mens-fashion", "womens-fashion", "shoes"].includes(c.slug);
    if (catFilter === "tech")
      return ["electronics", "gaming"].includes(c.slug);
    if (catFilter === "home")
      return ["home-living", "beauty"].includes(c.slug);
    if (catFilter === "fitness")
      return ["sports-fitness"].includes(c.slug);
    return true;
  });

  return (
    <>
      {/* Hero: full-bleed, outside the max-w container */}
      <HeroCarousel slides={HERO_SLIDES} />

      {/* ── Value Props & Perks Strip ── */}
      <div className="border-b border-line bg-white/80 backdrop-blur-md shadow-xs">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-ink">
                <Truck size={18} />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">Free Fast Shipping</p>
                <p className="text-[11px] text-muted">Complimentary on orders $150+</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-ink">
                <Shield size={18} />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">256-Bit SSL Checkout</p>
                <p className="text-[11px] text-muted">Encrypted &amp; tokenized safety</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-ink">
                <RotateCcw size={18} />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">30-Day Easy Returns</p>
                <p className="text-[11px] text-muted">Zero-friction exchange guarantee</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-ink">
                <Star size={18} className="text-amber-500 fill-amber-400" />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">4.9 / 5 Satisfaction</p>
                <p className="text-[11px] text-muted">From 28,000+ verified shoppers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        {/* ── Shop by Category Section ── */}
        <section className="py-12 sm:py-16">
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <p className="eyebrow mb-1.5 text-brand-600 font-bold tracking-wider">
                CURATED COLLECTIONS
              </p>
              <h2 className="section-title text-3xl sm:text-4xl font-black text-ink tracking-tight">
                Shop by Category
              </h2>
              <p className="mt-1.5 text-sm text-muted max-w-xl">
                Explore handpicked essentials designed for modern performance, style, and living.
              </p>
            </div>

            <Link
              to="/shop"
              className="group inline-flex items-center gap-2 self-start md:self-end rounded-full border border-line bg-white px-5 py-2.5 text-xs font-bold text-ink transition hover:border-brand-600 hover:bg-neutral-50 shadow-xs"
            >
              <span>Explore All Catalog</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Category Filter Tabs */}
          <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "all", label: `All Collections (${topCategories.length})` },
              { id: "fashion", label: "Fashion & Shoes" },
              { id: "tech", label: "Tech & Gaming" },
              { id: "home", label: "Home & Beauty" },
              { id: "fitness", label: "Fitness & Sport" },
            ].map((tab) => {
              const active = catFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCatFilter(tab.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                      : "bg-white text-muted hover:text-ink border border-line hover:border-neutral-300"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Category Cards Responsive Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {categories.isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-72 sm:h-80 animate-pulse rounded-3xl border border-line bg-neutral-100"
                  />
                ))
              : filteredCategories.map((c, i) => (
                  <CategoryCard key={c.id} category={c} index={i} />
                ))}
          </div>
        </section>

      {/* ── Electrified Flash Sale Section ── */}
      {flash.data?.length > 0 && (
        <section className="relative my-10 overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black p-6 sm:p-8 md:p-10 shadow-2xl shadow-rose-950/20 text-white">
          {/* Ambient red & gold glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

          {/* Flash Sale Header */}
          <div className="relative z-10 mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-6">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
                <span>LIMITED RUN DROP · UP TO 50% OFF</span>
              </div>
              <h2 className="flex items-center gap-2.5 font-display text-2xl font-black text-white sm:text-3xl md:text-4xl tracking-tight">
                <Zap className="text-rose-400 fill-rose-400" /> Flash Deals
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-white/70 max-w-lg">
                Exclusive allocations refreshed daily. When sold out, prices return to standard retail.
              </p>
            </div>

            {/* Countdown Timer with Frosted Pill */}
            <div className="flex flex-col sm:items-end gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <Clock size={13} /> Sale Event Ends In
              </span>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-md">
                <Countdown to={flash.data[0]?.flash_sale_end} compact />
              </div>
            </div>
          </div>

          {/* Urgency Progress Bar */}
          <div className="relative z-10 mb-8 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between text-xs text-white/80 mb-2">
              <span className="font-semibold flex items-center gap-1.5 text-amber-300">
                High Demand: Over 82% claimed today
              </span>
              <span className="text-[11px] text-white/60">Fast selling allocations</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600 w-[82%]" />
            </div>
          </div>

          {/* Product Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-6">
            {flash.data.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Mid-Page Editorial Feature Duo (Split Showcase) ── */}
      <section className="my-12 sm:my-16 grid gap-6 md:grid-cols-2">
        {/* Banner 1: Fashion & Apparel */}
        <div className="group relative overflow-hidden rounded-3xl bg-neutral-900 text-white p-8 sm:p-10 flex flex-col justify-between min-h-[320px] shadow-lg transition hover:shadow-2xl">
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
          <div className="relative z-10">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-white/60 mb-2">
              SEASON LOOKBOOK
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Architectural Streetwear &amp; Daily Essentials
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-white/70 max-w-sm">
              Heavyweight cottons, relaxed drop-shoulders, and waterproof outerwear engineered for daily rotation.
            </p>
          </div>
          <div className="relative z-10 mt-8">
            <Link
              to="/shop?category=mens-fashion"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-neutral-950 transition hover:bg-neutral-200"
            >
              <span>Explore Collection</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Banner 2: Sound & Electronics */}
        <div className="group relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-neutral-50 to-neutral-100 text-ink p-8 sm:p-10 flex flex-col justify-between min-h-[320px] shadow-sm transition hover:shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-blue-500/5 blur-2xl" />
          <div className="relative z-10">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-brand-600 mb-2">
              SOUND &amp; STUDIO
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Engineered For Clarity &amp; Productivity
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-muted max-w-sm">
              Active noise cancelling, 40-hour playback, and custom-tuned acoustic drivers for deep immersion.
            </p>
          </div>
          <div className="relative z-10 mt-8">
            <Link
              to="/shop?category=electronics"
              className="group inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-neutral-800"
            >
              <span>Shop Audio &amp; Gear</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Product Rails ── */}
      <ProductRow
        title="Trending Now"
        icon={<TrendingUp className="text-brand-600" />}
        products={trending.data ?? []}
        action={{ label: "View all", to: "/shop?ordering=-sold_count" }}
      />
      <ProductRow
        title="New Arrivals"
        icon={<Sparkles size={20} className="text-brand-600" />}
        products={arrivals.data ?? []}
        action={{ label: "View all", to: "/shop?ordering=-created_at" }}
      />
      <ProductRow
        title="Best Sellers"
        icon={<Star className="text-amber-500" />}
        products={best.data ?? []}
        action={{ label: "View all", to: "/shop?ordering=-rating_avg" }}
      />

      {/* Personalized recommendations */}
      {user && recommended.data?.length > 0 && (
        <ProductRow
          title={`Picked for you, ${user.username}`}
          icon={<Brain className="text-brand-600" />}
          products={recommended.data}
          action={{ label: "View all", to: "/shop" }}
        />
      )}

      {/* ── Customer Reviews & Social Proof Section ── */}
      {reviews.data?.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="eyebrow mb-1 text-brand-600 font-bold tracking-wider">
                COMMUNITY VOICES
              </p>
              <h2 className="section-title text-2xl sm:text-3xl font-black text-ink">
                What Our Customers Say
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink shadow-xs">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="fill-amber-400" />
                ))}
              </div>
              <span><strong>4.9 / 5</strong> Rating</span>
              <span className="text-muted">· 28,000+ Verified Orders</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {reviews.data.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card group flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <RatingStars value={r.rating} />
                    {r.verified_purchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <Check size={11} strokeWidth={3} /> Verified Buyer
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-ink mb-1.5">{r.title}</h3>
                  <p className="line-clamp-3 text-xs leading-relaxed text-muted">{r.body}</p>
                </div>

                <div className="mt-5 flex items-center gap-3 border-t border-line/70 pt-4">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white uppercase">
                    {r.author?.slice(0, 2) || "SH"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{r.author}</p>
                    <p className="text-[10px] text-muted">Verified Customer</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Why Shop With Us (The ShopHub Guarantee) ── */}
      <section className="py-12 sm:py-16">
        <div className="text-center max-w-xl mx-auto mb-10">
          <p className="eyebrow mb-1 text-brand-600 font-bold tracking-wider">
            THE SHOPHUB PROMISE
          </p>
          <h2 className="section-title text-2xl sm:text-3xl font-black text-ink">
            Why Millions Choose Us
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-muted">
            World-class service, verified authenticity, and complete peace of mind on every order.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <Truck size={22} className="text-blue-600" />,
              bg: "bg-blue-50 text-blue-600",
              title: "Free Express Shipping",
              text: "Fast 2-3 day delivery on orders over $150 with live tracking updates.",
            },
            {
              icon: <Shield size={22} className="text-emerald-600" />,
              bg: "bg-emerald-50 text-emerald-600",
              title: "256-Bit SSL Checkout",
              text: "Certified PCI-DSS payment tokenization. Sensitive card data is never stored.",
            },
            {
              icon: <RotateCcw size={22} className="text-purple-600" />,
              bg: "bg-purple-50 text-purple-600",
              title: "30-Day Easy Returns",
              text: "Zero-friction exchanges and automated prepaid returns label generation.",
            },
            {
              icon: <Award size={22} className="text-amber-600" />,
              bg: "bg-amber-50 text-amber-600",
              title: "100% Genuine Gear",
              text: "Direct partnerships with authorized brands guaranteeing full warranty coverage.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card flex flex-col justify-between p-6 transition hover:-translate-y-1 hover:border-neutral-300 hover:shadow-md"
            >
              <div>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${f.bg} mb-4`}>
                  {f.icon}
                </span>
                <h3 className="font-bold text-sm text-ink mb-1">{f.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── VIP Club & Newsletter Section ── */}
      <section id="vip" className="relative my-8 scroll-mt-24 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black px-6 py-14 sm:py-20 text-center text-white shadow-2xl">
        {/* Ambient background lighting */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 max-w-xl mx-auto">
          {/* Coupon Code Pill */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-3.5 py-1 text-xs font-bold text-amber-300">
            <Gift size={14} />
            <span>CLAIM $20 OFF CODE: WELCOME20</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight">
            Join the ShopHub Insider Circle
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-white/70 leading-relaxed max-w-md mx-auto">
            Get early access to secret drops, VIP seasonal sales, and member-only coupons directly in your inbox.
          </p>

          {newsletterSubscribed ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-950/40 p-5 backdrop-blur-md"
            >
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Check size={20} strokeWidth={3} />
              </div>
              <h3 className="text-base font-bold text-white">You're on the VIP list!</h3>
              <p className="mt-1 text-xs text-emerald-300">
                Use promo code <span className="font-mono font-bold text-white underline">WELCOME20</span> at checkout for $20 off your first purchase.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newsletterEmail) setNewsletterSubscribed(true);
              }}
              className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  required
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address…"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 pl-11 text-xs sm:text-sm text-white placeholder:text-neutral-400 outline-none backdrop-blur-md focus:border-white focus:bg-white/15 transition"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs sm:text-sm font-bold text-neutral-950 shadow-xl transition hover:bg-neutral-200 active:scale-[0.98]"
              >
                <span>Unlock $20</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          <p className="mt-4 text-[11px] text-white/50 flex items-center justify-center gap-1.5">
            <Shield size={12} />
            <span>Zero spam. Unsubscribe anytime with 1 click.</span>
          </p>
        </div>
      </section>
      </div>
    </>
  );
}

