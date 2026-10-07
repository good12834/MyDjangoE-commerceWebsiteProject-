import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Shield,
  Lock,
  Globe,
  Truck,
  CircleCheck,
  ArrowUpRight,
  Headphones,
  ShoppingBag,
} from "lucide-react";

const COLS = [
  {
    title: "Collections",
    links: [
      { label: "New 2026 Drops", to: "/shop?ordering=-created_at" },
      { label: "Men's Fashion", to: "/shop?category=mens-fashion" },
      { label: "Women's Fashion", to: "/shop?category=womens-fashion" },
      { label: "Shoes & Sneakers", to: "/shop?category=shoes" },
      { label: "Electronics", to: "/shop?category=electronics" },
      { label: "Home & Living", to: "/shop?category=home-living" },
      { label: "Flash Deals (Up to 50%)", to: "/shop?on_sale=1", highlight: true },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Track My Order", to: "/orders" },
      { label: "Returns & Exchanges", to: "/orders" },
      { label: "Shipping Rates", to: "/checkout" },
      { label: "Order Receipts", to: "/orders" },
      { label: "Help Center & FAQs", to: "/" },
      { label: "24/7 Concierge", to: "/" },
    ],
  },
  {
    title: "Account & Perks",
    links: [
      { label: "Insider Club — $20 Off", to: "/#vip", highlight: true },
      { label: "My Profile", to: "/account" },
      { label: "Order History", to: "/orders" },
      { label: "Saved Wishlist", to: "/wishlist" },
      { label: "Become a Seller", to: "/register?seller=1", highlight: true },
      { label: "Seller Dashboard", to: "/seller/dashboard" },
    ],
  },
  {
    title: "Our Story",
    links: [
      { label: "About ShopHub", to: "/" },
      { label: "Become a Seller", to: "/register?seller=1" },
      { label: "Sustainability", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Privacy Policy", to: "/" },
      { label: "Terms of Service", to: "/" },
    ],
  },
];

function PaymentBadge({ children, label }) {
  return (
    <div
      title={label}
      aria-label={label}
      className="flex h-7 items-center rounded-md bg-white px-2.5 shadow-sm ring-1 ring-white/20 transition hover:-translate-y-px hover:shadow-md"
    >
      {children}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-neutral-950 text-white">
      {/* ── Seamless luxury transition: gradient hairline + ambient glow ── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/60 via-white/40 to-transparent" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <Link to="/" className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-white">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-white to-neutral-300 text-neutral-950 shadow-lg shadow-white/10">
                <ShoppingBag size={20} />
              </span>
              <span>
                Shop<span className="text-white/50">Hub</span>
              </span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-white/60 sm:text-sm">
              Curated marketplace for modern living — connecting conscious shoppers with independent
              designers, premier brands, and verified artisans worldwide.
            </p>
            <a
              href="mailto:concierge@shophub.com"
              className="mt-3 inline-flex items-center gap-2 text-xs text-white/50 transition hover:text-white"
            >
              <Headphones size={13} className="text-amber-300" />
              <span>
                24/7 Concierge: <span className="font-semibold text-white/80">concierge@shophub.com</span>
              </span>
            </a>
          </div>

          {/* System Status & Socials */}
          <div className="flex flex-col gap-4 sm:items-end">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span>All Systems Operational · Django REST API</span>
            </div>

            <div className="flex items-center gap-2.5">
              {[
                { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
                { icon: Twitter, href: "https://twitter.com", label: "Twitter / X" },
                { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
                { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 backdrop-blur-sm transition hover:scale-105 hover:bg-white hover:text-neutral-950"
                  aria-label={label}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Navigation Columns ── */}
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4 lg:gap-12">
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
                {col.title}
                <span className="mt-2 block h-px w-8 bg-gradient-to-r from-amber-300/70 to-transparent" />
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(({ label, to, highlight }) => {
                  const isAnchor = to.startsWith("/#");
                  const cls = `inline-flex items-center gap-1 text-xs sm:text-sm transition ${
                    highlight
                      ? "font-semibold text-amber-300 hover:text-amber-200"
                      : "text-white/60 hover:text-white"
                  }`;
                  return (
                    <li key={label}>
                      {isAnchor ? (
                        <a href={to} className={cls}>
                          <span>{label}</span>
                          {highlight && <ArrowUpRight size={12} className="opacity-80" />}
                        </a>
                      ) : (
                        <Link to={to} className={cls}>
                          <span>{label}</span>
                          {highlight && <ArrowUpRight size={12} className="opacity-80" />}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Security, Guarantees & Accepted Payment Rails ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5 backdrop-blur-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Guarantees */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <Lock size={14} className="text-emerald-400" />
                <span>256-Bit SSL Encrypted</span>
              </span>
              <span className="hidden h-3 w-px bg-white/20 sm:block" />
              <span className="flex items-center gap-1.5">
                <Shield size={14} className="text-blue-400" />
                <span>PCI-DSS Level 1 Compliant</span>
              </span>
              <span className="hidden h-3 w-px bg-white/20 sm:block" />
              <span className="flex items-center gap-1.5">
                <Truck size={14} className="text-purple-300" />
                <span>Carbon-Neutral Delivery</span>
              </span>
              <span className="hidden h-3 w-px bg-white/20 sm:block" />
              <span className="flex items-center gap-1.5">
                <CircleCheck size={14} className="text-amber-300" />
                <span>100% Buyer Protection</span>
              </span>
            </div>
          </div>

            {/* Payment Method Badges */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <span className="mr-1 hidden text-[11px] font-bold uppercase tracking-wider text-white/40 sm:inline-block">
                Accepted Payments:
              </span>
              <PaymentBadge label="Visa">
                <span className="text-[13px] font-black italic tracking-tight text-[#1A1F71]">VISA</span>
              </PaymentBadge>
              <PaymentBadge label="Mastercard">
                <span className="flex items-center gap-1">
                  <span className="flex">
                    <span className="h-3.5 w-3.5 rounded-full bg-[#EB001B]" />
                    <span className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#F79E1B] opacity-90" />
                  </span>
                  <span className="text-[11px] font-bold text-neutral-800">Mastercard</span>
                </span>
              </PaymentBadge>
              <PaymentBadge label="American Express">
                <span className="rounded bg-[#2E77BC] px-1.5 py-0.5 text-[10px] font-black tracking-wide text-white">
                  AMEX
                </span>
              </PaymentBadge>
              <PaymentBadge label="PayPal">
                <span className="text-[12px] font-black italic tracking-tight">
                  <span className="text-[#003087]">Pay</span>
                  <span className="text-[#0079C1]">Pal</span>
                </span>
              </PaymentBadge>
              <PaymentBadge label="Apple Pay">
                <span className="text-[12px] font-semibold text-neutral-900">Apple Pay</span>
              </PaymentBadge>
              <PaymentBadge label="Google Pay">
                <span className="text-[12px] font-bold text-neutral-800">
                  <span className="font-black text-[#4285F4]">G</span> Pay
                </span>
              </PaymentBadge>
              <PaymentBadge label="Stripe">
                <span className="text-[12px] font-black tracking-tight text-[#635BFF]">stripe</span>
              </PaymentBadge>
            </div>
        </div>

        {/* ── Bottom Legal & Locale ── */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} ShopHub Inc. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <Link to="/" className="transition hover:text-white">
              Privacy
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/" className="transition hover:text-white">
              Terms
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/" className="transition hover:text-white">
              Payment Security
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/" className="transition hover:text-white">
              Cookies
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm">
            <Globe size={12} />
            <span>United States · USD ($)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
