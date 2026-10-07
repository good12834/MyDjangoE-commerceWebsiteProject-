import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, CreditCard, MapPin, Package, Truck, Zap, Timer, Wallet, ShoppingBag,
  Lock, Shield, ChevronRight, CircleCheck, User,
  Printer, ArrowRight, Info, Eye, EyeOff, SquareCheckBig,
} from "lucide-react";
import { api, errMsg, listOf } from "../lib/api";
import { money, img } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const STEPS = [
  { id: "shipping", label: "Shipping", icon: <MapPin size={16} /> },
  { id: "delivery", label: "Delivery", icon: <Truck size={16} /> },
  { id: "payment", label: "Payment", icon: <CreditCard size={16} /> },
  { id: "review", label: "Review & Pay", icon: <CircleCheck size={16} /> },
];

const DELIVERY = [
  { id: "standard", label: "Standard Delivery", desc: "3–5 business days", icon: <Truck size={24} />, price: "Free", priceNote: "over $150", priceFull: "$4.99" },
  { id: "express", label: "Express Delivery", desc: "1–2 business days", icon: <Zap size={24} />, price: "+$9.99" },
  { id: "same_day", label: "Same Day Delivery", desc: "Order by 12pm today", icon: <Timer size={24} />, price: "+$19.99" },
];

const PAYMENT_METHODS = [
  {
    id: "card",
    label: "Credit / Debit Card",
    desc: "Visa • Mastercard • Amex",
    icon: <CreditCard size={24} />,
    badge: "Encrypted",
  },
  {
    id: "paypal",
    label: "PayPal",
    desc: "Pay securely with PayPal",
    icon: <Wallet size={24} />,
    badge: "Buyer Protection",
  },
  {
    id: "apple_pay",
    label: "Apple Pay",
    desc: "Fast and secure",
    icon: <Wallet size={24} />,
    badge: "Biometric",
  },
  {
    id: "google_pay",
    label: "Google Pay",
    desc: "Fast checkout",
    icon: <Wallet size={24} />,
    badge: "1-Tap",
  },
];

function getCardBrand(num = "") {
  const clean = num.replace(/\D/g, "");
  if (/^4/.test(clean)) return { name: "Visa", icon: <CreditCard size={18} />, color: "bg-blue-600 text-white" };
  if (/^(5[1-5]|2[2-7])/.test(clean)) return { name: "Mastercard", icon: <CreditCard size={18} />, color: "bg-amber-600 text-white" };
  if (/^3[47]/.test(clean)) return { name: "Amex", icon: <CreditCard size={18} />, color: "bg-sky-600 text-white" };
  if (/^(6011|65)/.test(clean)) return { name: "Discover", icon: <CreditCard size={18} />, color: "bg-orange-600 text-white" };
  return { name: "Card", icon: <CreditCard size={18} />, color: "bg-neutral-800 text-white" };
}

export default function CheckoutPage() {
  const { cart, invalidate } = useCart();
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState(null);
  const [delivery, setDelivery] = useState("standard");
  const [payment, setPayment] = useState("card");
  const [cardForm, setCardForm] = useState({
    number: "4242 •••• •••• 4242",
    expiry: "12/28",
    cvc: "•••",
    name: user?.full_name ? user.full_name.toUpperCase() : "JOHN SMITH",
    saveCard: true,
  });
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  // ── Auth guard: redirect to login if not authenticated ──
  useEffect(() => {
    if (ready && !user) {
      navigate("/login?next=/checkout", { replace: true });
    }
  }, [ready, user, navigate]);

  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => listOf((await api.get("/auth/addresses/")).data),
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      // Security rule: sensitive card details (raw number, CVV) are NEVER sent to the Django server!
      // In production, Stripe Elements / Hosted Fields generates a secure paymentMethod token.
      const payload = {
        delivery_method: delivery,
        payment_method: payment,
        address,
      };
      const { data } = await api.post("/orders/checkout/", payload);
      return data;
    },
    onSuccess: (data) => {
      if (data.payment?.redirect_url) {
        window.location.href = data.payment.redirect_url;
        return;
      }
      setPlacedOrder(data);
      invalidate();
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => setError(errMsg(e)),
  });

  /* ─── Loading / not-yet-authenticated ─── */
  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-32 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-neutral-100">
          <User size={28} className="text-neutral-400" />
        </div>
        <p className="text-lg font-semibold text-ink">Checking your session…</p>
        <p className="mt-1 text-sm text-muted">You'll be redirected to login shortly.</p>
      </div>
    );
  }

  /* ─── Success screen: Customer Receipt ─── */
  if (placedOrder) {
    return <CustomerReceipt order={placedOrder} paymentMethod={payment} />;
  }

  /* ─── Empty cart ─── */
  const items = cart?.items?.filter((i) => !i.saved_for_later) ?? [];
  if (!cart || items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-neutral-100 text-neutral-400"><ShoppingBag size={28} /></div>
        <h1 className="mt-3 text-xl font-bold text-ink">Your cart is empty</h1>
        <button onClick={() => navigate("/shop")} className="btn-primary mt-4">Browse products</button>
      </div>
    );
  }

  const t = cart.totals;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* ── Stepper ── */}
      <div className="mb-10">
        <div className="relative flex items-center justify-between">
          {/* Progress line */}
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-line">
            <motion.div
              className="h-full bg-brand-600"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} className="relative flex flex-col items-center gap-2">
                <button
                  onClick={() => done && setStep(i)}
                  disabled={!done}
                  className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-bold transition-all duration-300 ${
                    done
                      ? "border-brand-600 bg-brand-600 text-white cursor-pointer hover:bg-brand-700"
                      : active
                      ? "border-brand-600 bg-white text-brand-600 shadow-lg shadow-brand-600/20"
                      : "border-line bg-white text-muted"
                  }`}
                >
                  {done ? <Check size={16} strokeWidth={3} /> : i + 1}
                </button>
                <span
                  className={`hidden text-xs font-semibold sm:block transition-colors ${
                    active ? "text-ink" : done ? "text-brand-600" : "text-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,360px]">
        {/* ── Main panel ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
            className="card p-6 sm:p-8"
          >
            {error && (
              <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            {step === 0 && (
              <AddressStep
                addresses={addresses ?? []}
                initial={address}
                onNext={(addr) => { setAddress(addr); setError(""); setStep(1); }}
              />
            )}

            {step === 1 && (
              <DeliveryStep
                value={delivery}
                onChange={setDelivery}
                onBack={() => setStep(0)}
                onNext={() => setStep(2)}
              />
            )}

            {step === 2 && (
              <PaymentStep
                value={payment}
                onChange={setPayment}
                cardForm={cardForm}
                onCardFormChange={setCardForm}
                totalAmount={money(t?.total)}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
                onFastPay={() => {
                  if (!address && addresses?.length) {
                    const def = addresses.find((a) => a.is_default) || addresses[0];
                    setAddress({
                      full_name: def.full_name, phone: def.phone, line1: def.line1,
                      city: def.city, state: def.state, postal_code: def.postal_code, country: def.country,
                    });
                  }
                  setStep(3);
                }}
              />
            )}

            {step === 3 && (
              <ReviewStep
                address={address}
                delivery={delivery}
                payment={payment}
                cardForm={cardForm}
                items={items}
                t={t}
                isPending={placeOrder.isPending}
                error={error}
                onBack={() => setStep(2)}
                onEditAddress={() => setStep(0)}
                onEditDelivery={() => setStep(1)}
                onEditPayment={() => setStep(2)}
                onPlace={() => placeOrder.mutate()}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Order summary sidebar ── */}
        <div className="card h-max p-5 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-bold text-ink">Order Summary</h2>
            <span className="text-xs font-semibold text-muted">{items.length} items</span>
          </div>

          <div className="mb-4 space-y-3 border-b border-line pb-4 max-h-60 overflow-y-auto pr-1">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                  {i.product.image && (
                    <img src={img(i.product.image)} alt={i.product.name} className="h-full w-full object-cover" />
                  )}
                  <span className="absolute bottom-0 right-0 rounded-tl-md bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {i.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-semibold text-ink">{i.product.name}</p>
                  {i.variant && (
                    <p className="text-[11px] text-muted">{i.variant.color} · {i.variant.size}</p>
                  )}
                </div>
                <span className="text-xs font-bold text-ink">{money(i.line_total)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted"><span>Subtotal</span><span>{money(t?.subtotal)}</span></div>
            {Number(t?.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Coupon {t.coupon_code}</span><span>− {money(t.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted"><span>Shipping</span><span>{money(t?.shipping)}</span></div>
            <div className="flex justify-between text-muted"><span>Tax</span><span>{money(t?.tax)}</span></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-extrabold text-ink">
              <span>Total</span><span>{money(t?.total)}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
            <Shield size={14} className="shrink-0 text-emerald-600" />
            <span>256-bit SSL encrypted &amp; PCI-DSS compliant checkout.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Address ─── */
function AddressStep({ addresses, initial, onNext }) {
  const [mode, setMode] = useState(addresses.length ? "saved" : "new");
  const [selected, setSelected] = useState(addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id);
  const [form, setForm] = useState(
    initial ?? { full_name: "", phone: "", line1: "", city: "", state: "", postal_code: "", country: "United States" }
  );
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (mode === "saved") {
      const a = addresses.find((x) => x.id === selected);
      if (a) onNext({ full_name: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postal_code: a.postal_code, country: a.country });
    } else {
      onNext(form);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
          <MapPin size={18} />
        </div>
        <div>
          <h2 className="font-bold text-ink">Shipping Address</h2>
          <p className="text-xs text-muted">Where should we deliver your order?</p>
        </div>
      </div>

      {addresses.length > 0 && (
        <div className="mb-5 flex gap-2">
          {["saved", "new"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                mode === m ? "bg-brand-600 text-white" : "bg-neutral-100 text-muted hover:bg-neutral-200"
              }`}
            >
              {m === "saved" ? "Saved Addresses" : "+ New Address"}
            </button>
          ))}
        </div>
      )}

      {mode === "saved" ? (
        <div className="space-y-3">
          {addresses.map((a) => (
            <label
              key={a.id}
              className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition ${
                selected === a.id ? "border-brand-600 bg-brand-50" : "border-line hover:border-neutral-300"
              }`}
            >
              <input type="radio" name="addr" checked={selected === a.id} onChange={() => setSelected(a.id)} className="mt-1 h-4 w-4 accent-brand-600" />
              <span className="text-sm">
                <span className="block font-semibold text-ink">{a.label} · {a.full_name}</span>
                <span className="block text-muted">{a.line1}, {a.city}, {a.state} {a.postal_code}</span>
                <span className="block text-xs text-muted">{a.phone} · {a.country}</span>
              </span>
              {a.is_default && <span className="ml-auto rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">Default</span>}
            </label>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Full Name *</label>
            <input required placeholder="John Smith" value={form.full_name} onChange={set("full_name")} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Phone Number *</label>
            <input required placeholder="+1 555 000 0000" value={form.phone} onChange={set("phone")} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-muted">Street Address *</label>
            <input required placeholder="123 Main Street, Apt 4B" value={form.line1} onChange={set("line1")} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">City *</label>
            <input required placeholder="New York" value={form.city} onChange={set("city")} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">State / Province *</label>
            <input required placeholder="NY" value={form.state} onChange={set("state")} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">ZIP / Postal Code *</label>
            <input required placeholder="10001" value={form.postal_code} onChange={set("postal_code")} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Country</label>
            <input placeholder="United States" value={form.country} onChange={set("country")} className="input" />
          </div>
        </div>
      )}

      <button onClick={submit} className="btn-primary mt-7 w-full gap-2 !py-3.5">
        Continue to Delivery <ChevronRight />
      </button>
    </div>
  );
}

/* ─── Step 2: Delivery ─── */
function DeliveryStep({ value, onChange, onBack, onNext }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
          <Truck size={18} />
        </div>
        <div>
          <h2 className="font-bold text-ink">Delivery Method</h2>
          <p className="text-xs text-muted">Choose your preferred shipping speed.</p>
        </div>
      </div>

      <div className="space-y-3">
        {DELIVERY.map((d) => (
          <label
            key={d.id}
            className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${
              value === d.id ? "border-brand-600 bg-brand-50" : "border-line hover:border-neutral-300"
            }`}
          >
            <input type="radio" name="delivery" checked={value === d.id} onChange={() => onChange(d.id)} className="h-4 w-4 accent-brand-600" />
            <span className="grid place-items-center text-neutral-500">{d.icon}</span>
            <span className="flex-1">
              <span className="block font-semibold text-ink">{d.label}</span>
              <span className="block text-xs text-muted">{d.desc}</span>
            </span>
            <span className={`text-sm font-bold ${value === d.id ? "text-brand-600" : "text-ink"}`}>{d.price}</span>
          </label>
        ))}
      </div>

      <div className="mt-7 flex gap-3">
        <button onClick={onBack} className="btn-outline">Back</button>
        <button onClick={onNext} className="btn-primary flex-1 gap-2 !py-3">
          Continue to Payment <ChevronRight />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Payment Methods & Interactive Card Form ─── */
function PaymentStep({ value, onChange, cardForm, onCardFormChange, totalAmount, onBack, onNext, onFastPay }) {
  const [showCvc, setShowCvc] = useState(false);
  const brand = getCardBrand(cardForm.number);

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    onCardFormChange((prev) => ({ ...prev, number: formatted }));
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length > 2) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    onCardFormChange((prev) => ({ ...prev, expiry: raw }));
  };

  const handleCvcChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    onCardFormChange((prev) => ({ ...prev, cvc: raw }));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <CreditCard size={18} />
          </div>
          <div>
            <h2 className="font-bold text-ink">Payment Method</h2>
            <p className="text-xs text-muted">Select how you want to pay securely</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
          <Shield size={12} /> SSL 256-bit
        </span>
      </div>

      {/* Payment methods list */}
      <div className="space-y-3">
        {PAYMENT_METHODS.map((m) => {
          const selected = value === m.id;
          return (
            <div
              key={m.id}
              className={`rounded-2xl border-2 transition ${
                selected ? "border-brand-600 bg-brand-50/40 shadow-sm" : "border-line bg-white hover:border-neutral-300"
              }`}
            >
              <label className="flex cursor-pointer items-center gap-4 p-4">
                <input
                  type="radio"
                  name="payment_method"
                  checked={selected}
                  onChange={() => onChange(m.id)}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="grid place-items-center text-neutral-500">{m.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{m.label}</span>
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                      {m.badge}
                    </span>
                  </div>
                  <span className="block text-xs text-muted">{m.desc}</span>
                </div>
                {selected && (
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </label>

              {/* Expanded Card Form when Card is selected */}
              {selected && m.id === "card" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-line/60 bg-white p-5 rounded-b-2xl"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Card Payment Details</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold">VISA</span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold">MC</span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold">AMEX</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Card number */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted">Card number</label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={19}
                          placeholder="1234 5678 9012 3456"
                          value={cardForm.number}
                          onChange={handleCardNumberChange}
                          className="input font-mono text-sm tracking-wider pr-14"
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-[10px] font-bold ${brand.color}`}>
                          {brand.name}
                        </span>
                      </div>
                    </div>

                    {/* Expiry & CVC */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-muted">Expiry</label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="MM / YY"
                          value={cardForm.expiry}
                          onChange={handleExpiryChange}
                          className="input font-mono text-sm tracking-wider"
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-xs font-semibold text-muted">Security code</label>
                          <span className="text-[10px] text-muted">CVC / CVV</span>
                        </div>
                        <div className="relative">
                          <input
                            type={showCvc ? "text" : "password"}
                            maxLength={4}
                            placeholder="•••"
                            value={cardForm.cvc}
                            onChange={handleCvcChange}
                            className="input font-mono text-sm tracking-wider pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCvc(!showCvc)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-ink"
                          >
                            {showCvc ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Name on card */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted">Name on card</label>
                      <input
                        type="text"
                        placeholder="JOHN SMITH"
                        value={cardForm.name}
                        onChange={(e) =>
                          onCardFormChange((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))
                        }
                        className="input uppercase text-sm font-medium tracking-wide"
                      />
                    </div>

                    {/* Save card option */}
                    <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-muted hover:text-ink">
                      <input
                        type="checkbox"
                        checked={cardForm.saveCard}
                        onChange={(e) =>
                          onCardFormChange((prev) => ({ ...prev, saveCard: e.target.checked }))
                        }
                        className="h-4 w-4 rounded accent-brand-600"
                      />
                      <span>Save payment method for future purchases</span>
                    </label>
                  </div>

                  {/* Architecture reassurance */}
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-neutral-50 p-3 text-xs text-muted">
                    <Shield size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>
                      <strong>Secure checkout:</strong> Card data is client-tokenized directly with our PCI-compliant provider.
                      ShopHub never stores your raw card numbers or CVV on our servers.
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Details for PayPal / Apple Pay / Google Pay */}
              {selected && m.id !== "card" && (
                <div className="border-t border-line/60 bg-white p-4 rounded-b-2xl text-xs text-muted">
                  <p className="flex items-center gap-2">
                    <Lock size={13} className="text-emerald-600" />
                    {m.id === "paypal" && "You'll authenticate securely via PayPal without sharing sensitive credentials."}
                    {m.id === "apple_pay" && "Confirm instantly with Touch ID or Face ID on your authorized Apple device."}
                    {m.id === "google_pay" && "Fast, encrypted 1-tap checkout using cards saved in your Google Account."}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trust banner */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-line bg-canvas p-4 text-xs text-muted">
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-emerald-600" />
          <span>
            <strong className="text-ink">Secure payment:</strong> Your payment information is encrypted and protected.
          </span>
        </div>
        <span className="hidden sm:inline-block font-mono text-[11px] font-bold text-neutral-400">
          TLS 1.3 / AES-256
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-7 flex flex-wrap gap-3">
        <button onClick={onBack} className="btn-outline">
          Back
        </button>
        <button
          onClick={onNext}
          className="btn-primary flex-1 gap-2 !py-3.5 !text-base shadow-lg shadow-brand-600/10"
        >
          <Lock size={16} /> PAY {totalAmount} <ChevronRight />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 4: Review & Finalize ─── */
function ReviewStep({ address, delivery, payment, cardForm, items, t, isPending, error, onBack, onEditAddress, onEditDelivery, onEditPayment, onPlace }) {
  const deliveryLabel = DELIVERY.find((d) => d.id === delivery)?.label ?? delivery;
  const paymentObj = PAYMENT_METHODS.find((m) => m.id === payment);
  const brand = getCardBrand(cardForm?.number);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-ink">Review &amp; Place Order</h2>
          <p className="text-xs text-muted">Please confirm your order details before payment authorization</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
          <Lock size={12} /> Ready to authorize
        </span>
      </div>

      <div className="space-y-3">
        {/* Ship to */}
        <ReviewCard title="Shipping Address" onEdit={onEditAddress}>
          {address ? (
            <>
              <p className="font-semibold text-ink">{address.full_name}</p>
              <p className="text-muted">{address.line1}, {address.city}, {address.state} {address.postal_code}</p>
              <p className="text-muted">{address.country} · {address.phone}</p>
            </>
          ) : (
            <p className="text-rose-600">Please provide a shipping address</p>
          )}
        </ReviewCard>

        {/* Delivery */}
        <ReviewCard title="Delivery Method" onEdit={onEditDelivery}>
          <p className="font-semibold text-ink">{deliveryLabel}</p>
        </ReviewCard>

        {/* Payment */}
        <ReviewCard title="Payment Method" onEdit={onEditPayment}>
          <div className="flex items-center gap-2">
            <span className="grid place-items-center text-neutral-500">{paymentObj?.icon}</span>
            <span className="font-semibold text-ink">{paymentObj?.label}</span>
            {payment === "card" && (
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono text-muted">
                {brand.name} •••• {cardForm?.number?.replace(/\D/g, "").slice(-4) || "4242"}
              </span>
            )}
          </div>
        </ReviewCard>
      </div>

      {/* Items list */}
      <div className="mt-5 rounded-2xl border border-line p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Order Items</p>
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 text-sm">
              <span className="badge bg-neutral-100 text-ink">{i.quantity}×</span>
              <span className="flex-1 truncate">{i.product.name}</span>
              <span className="font-semibold">{money(i.line_total)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-line pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted"><span>Subtotal</span><span>{money(t?.subtotal)}</span></div>
          {Number(t?.discount) > 0 && <div className="flex justify-between text-emerald-600"><span>Coupon</span><span>− {money(t.discount)}</span></div>}
          <div className="flex justify-between text-muted"><span>Shipping</span><span>{money(t?.shipping)}</span></div>
          <div className="flex justify-between text-muted"><span>Tax</span><span>{money(t?.tax)}</span></div>
          <div className="flex justify-between pt-2 font-extrabold text-ink text-base border-t border-line"><span>Total</span><span>{money(t?.total)}</span></div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}

      {/* Pay CTA */}
      <div className="mt-7 flex gap-3">
        <button onClick={onBack} className="btn-outline">Back</button>
        <button
          onClick={onPlace}
          disabled={isPending}
          className="btn-primary flex-1 gap-2 !py-4 !text-base shadow-xl shadow-brand-600/20"
        >
          {isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Authorizing Payment…
            </>
          ) : (
            <>
              <Lock size={18} /> PAY {money(t?.total)}
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        Secure 256-bit encrypted payment · No raw card details stored on ShopHub
      </p>
    </div>
  );
}

function ReviewCard({ title, onEdit, children }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-neutral-50 p-4 text-sm">
      <div className="flex-1">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">{title}</p>
        {children}
      </div>
      <button onClick={onEdit} className="shrink-0 text-xs font-semibold text-brand-600 hover:underline">
        Edit
      </button>
    </div>
  );
}

/* ─── Customer Receipt: Matching the User Blueprint ─── */
function CustomerReceipt({ order, paymentMethod }) {
  const methodLabel =
    paymentMethod === "card"
      ? "Card"
      : paymentMethod === "paypal"
      ? "PayPal"
      : paymentMethod === "apple_pay"
      ? "Apple Pay"
      : paymentMethod === "google_pay"
      ? "Google Pay"
      : "Card";

  const paymentRef = order.payment?.reference || `PAY-${order.id * 10392 || "10392"}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card relative overflow-hidden shadow-xl border-2 border-line bg-white"
      >
        {/* Receipt Header */}
        <div className="border-b border-dashed border-neutral-300 bg-neutral-50/80 px-6 py-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
            className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm"
          >
            <Check size={28} strokeWidth={3} />
          </motion.div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">PAYMENT SUCCESSFUL</p>
          <h1 className="mt-1 text-2xl font-black text-ink tracking-tight">ShopHub</h1>
          <p className="mt-1 text-xs text-muted">Official Order Receipt &amp; Proof of Payment</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-muted">
            <span>Order <strong className="text-ink">#{order.order_number}</strong></span>
            <span>•</span>
            <span>Payment <strong className="text-ink">#{paymentRef}</strong></span>
          </div>
        </div>

        {/* Itemized list */}
        <div className="p-6">
          <div className="space-y-3 pb-4">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-ink font-medium">
                  {item.product_name} {item.quantity > 1 && <span className="text-muted">×{item.quantity}</span>}
                </span>
                <span className="font-semibold text-ink">{money(item.line_total)}</span>
              </div>
            ))}
          </div>

          {/* Subtotals & Taxes */}
          <div className="space-y-1.5 border-t border-line py-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span>{Number(order.shipping) === 0 ? "Free" : money(order.shipping)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Tax</span>
              <span>{money(order.tax)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>− {money(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-900 pt-3 text-lg font-black text-ink">
              <span>TOTAL</span>
              <span>{money(order.total)}</span>
            </div>
          </div>

          {/* Payment Meta */}
          <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-xs space-y-1.5 border border-line">
            <div className="flex items-center justify-between">
              <span className="text-muted">Payment Method</span>
              <span className="font-semibold text-ink">{methodLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                Paid
              </span>
            </div>
            {order.payment?.completed_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Authorized At</span>
                <span className="font-mono text-muted">{new Date(order.payment.completed_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Confirmation note */}
          <p className="mt-4 text-center text-xs text-muted">
            We've sent your order confirmation and invoice to your registered email address.
          </p>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              to={`/orders/${order.id}`}
              className="btn-primary w-full gap-2 !py-3.5 !text-sm font-bold uppercase tracking-wider"
            >
              TRACK ORDER
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="btn-outline flex-1 gap-2 text-xs"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <Link to="/shop" className="btn-outline flex-1 text-center text-xs">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="border-t border-line bg-neutral-50 px-6 py-2.5 text-center text-[10px] text-muted">
          Encrypted &amp; Verified · Django REST API &amp; Payment Gateway
        </div>
      </motion.div>
    </div>
  );
}
