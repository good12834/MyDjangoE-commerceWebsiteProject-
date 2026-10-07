import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";

export default function ProductRow({ title, icon, products = [], action }) {
  const scroller = useRef(null);
  const scroll = (dir) => scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  if (!products.length) return null;

  return (
    <section className="py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="section-title flex items-center gap-2.5">
          {icon && <span>{icon}</span>} {title}
        </h2>
        <div className="flex items-center gap-2">
          {action && (
            <Link
              to={action.to}
              className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline-offset-4 hover:underline"
            >
              {action.label} <ArrowRight size={14} />
            </Link>
          )}
          <button
            onClick={() => scroll(-1)}
            className="hidden h-9 w-9 place-items-center rounded-full border border-line transition hover:border-neutral-400 md:grid"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="hidden h-9 w-9 place-items-center rounded-full border border-line transition hover:border-neutral-400 md:grid"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={scroller} className="scrollbar-none -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {products.map((p, i) => (
          <div key={p.id} className="w-64 shrink-0 snap-start">
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
