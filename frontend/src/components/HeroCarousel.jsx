import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, ArrowRight, Shield,
  Star, Truck, Zap, CircleCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

const AUTOPLAY_MS = 6000;
const FADE_S = 0.7;
const SWIPE_DISTANCE = 50;

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: FADE_S, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: FADE_S, ease: "easeIn" } },
};

export default function HeroCarousel({ slides = [], interval = AUTOPLAY_MS }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const regionRef = useRef(null);
  const touchX = useRef(null);

  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  const go = useCallback((nextIndex) => setIndex(((nextIndex % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Autoplay timer
  useEffect(() => {
    if (count <= 1 || paused || reduceMotion) return undefined;
    const id = setInterval(next, interval);
    return () => clearInterval(id);
  }, [count, index, interval, next, paused, reduceMotion]);

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e) => {
    const start = touchX.current;
    touchX.current = null;
    setPaused(false);
    if (start == null || count <= 1) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) < SWIPE_DISTANCE) return;
    if (dx < 0) next();
    else prev();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  };

  if (count === 0) return null;

  const active = slides[index];

  return (
    <section
      ref={regionRef}
      className="relative w-full overflow-hidden bg-neutral-950 text-white select-none"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onBlur={(e) => {
        if (!regionRef.current?.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      {/* Background slide images with subtle zoom and layered scrim */}
      <div className="relative h-[600px] sm:h-[660px] md:h-[720px] lg:h-[780px] xl:h-[840px] w-full">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            variants={reduceMotion ? undefined : fade}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 overflow-hidden"
          >
            <motion.img
              src={active.image}
              alt=""
              aria-hidden="true"
              draggable={false}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 7, ease: "easeOut" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                if (count > 1) next();
              }}
              className="h-full w-full object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Multi-layered luxury gradients for supreme readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/75 to-neutral-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/30" />

        {/* Ambient decorative glow orbs */}
        <div className="pointer-events-none absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 -top-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* Hero content grid */}
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="pointer-events-auto mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.2fr,0.8fr] items-center gap-12">
            
            {/* Left Column: Headline, Copy & Actions */}
            <motion.div
              key={`copy-${index}`}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="max-w-2xl"
            >
              {/* Eyebrow badge */}
              {active.eyebrow && (
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/90">
                    {active.eyebrow}
                  </span>
                </div>
              )}

              {/* Dynamic Main Heading */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.06] tracking-[-0.03em] text-white">
                {active.title}
              </h1>

              {/* Subtitle */}
              {active.subtitle && (
                <p className="mt-5 text-base sm:text-lg leading-relaxed text-white/75 max-w-xl">
                  {active.subtitle}
                </p>
              )}

              {/* CTA Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to={active.ctaTo || "/shop"}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-neutral-950 shadow-xl shadow-black/30 transition hover:bg-neutral-100 active:scale-[0.98]"
                >
                  <span>{active.ctaLabel || "Shop Now"}</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>

                {active.secondaryTo && (
                  <Link
                    to={active.secondaryTo}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15 hover:border-white/50 active:scale-[0.98]"
                  >
                    {active.secondaryLabel || "Explore Catalog"}
                  </Link>
                )}
              </div>

              {/* Social Proof Trust Stack */}
              <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-white/10 pt-6 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400" />
                    ))}
                  </div>
                  <span className="font-semibold text-white">4.9 / 5.0</span>
                  <span>(24k+ reviews)</span>
                </div>

                <div className="h-4 w-px bg-white/20 hidden sm:block" />

                <div className="flex items-center gap-1.5 text-white/80">
                  <CircleCheck size={14} className="text-emerald-400" />
                  <span>Free shipping over $150</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Floating Glassmorphic Feature Highlights */}
            <div className="hidden lg:flex flex-col gap-4 items-end">
              {/* Card 1: Certified Quality & Trust */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="w-72 rounded-2xl border border-white/15 bg-white/10 p-4.5 backdrop-blur-xl shadow-2xl text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white">
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Certified Authentic</p>
                    <p className="text-[11px] text-white/70">100% Genuine Products</p>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Express Delivery Spotlight */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="w-72 rounded-2xl border border-white/15 bg-white/10 p-4.5 backdrop-blur-xl shadow-2xl text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white">
                    <Truck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Express Delivery</p>
                    <p className="text-[11px] text-white/70">Fast 2-3 Day Nationwide</p>
                  </div>
                </div>
              </motion.div>

              {/* Card 3: Live Flash Promo Badge */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="w-72 rounded-2xl border border-emerald-400/30 bg-emerald-950/40 p-4.5 backdrop-blur-xl shadow-2xl text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Zap size={14} />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">Seasonal Savings</p>
                      <p className="text-[11px] text-emerald-300">Up to 40% Off Select Drops</p>
                    </div>
                  </div>
                  <Link
                    to="/shop?on_sale=1"
                    className="text-[11px] font-bold text-white hover:underline"
                  >
                    View
                  </Link>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-neutral-900/60 p-3 text-white backdrop-blur-md transition hover:bg-white hover:text-neutral-950 active:scale-95 md:grid place-items-center z-10"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-neutral-900/60 p-3 text-white backdrop-blur-md transition hover:bg-white hover:text-neutral-950 active:scale-95 md:grid place-items-center z-10"
          >
            <ChevronRight size={22} />
          </button>

          {/* Slide Progress Tracks & Indicators */}
          <div className="absolute bottom-6 left-0 right-0 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {slides.map((s, i) => {
                const isActive = i === index;
                return (
                  <button
                    key={s.image || i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className="group relative flex flex-col text-left transition-opacity hover:opacity-100"
                  >
                    {/* Linear Progress Bar */}
                    <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden">
                      <div
                        className={`h-full bg-white transition-all ${
                          isActive
                            ? "w-full duration-[6000ms] ease-linear"
                            : "w-0 duration-200"
                        }`}
                        style={{
                          transitionProperty: isActive ? "width" : "none",
                        }}
                      />
                    </div>
                    {/* Slide preview label */}
                    <div className="mt-2 hidden sm:flex items-center justify-between text-xs">
                      <span className={`font-mono text-[11px] font-bold ${isActive ? "text-white" : "text-white/50 group-hover:text-white/80"}`}>
                        0{i + 1}
                      </span>
                      <span className={`truncate font-medium text-[11px] ${isActive ? "text-white font-semibold" : "text-white/60 group-hover:text-white/90"}`}>
                        {s.ctaLabel?.replace("Shop ", "") || `Collection ${i + 1}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}