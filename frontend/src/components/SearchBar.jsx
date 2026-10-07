import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { api } from "../lib/api";
import { money } from "../lib/utils";

export default function SearchBar({ className = "", onNavigate }) {
  const [q, setQ] = useState("");
  const [suggests, setSuggests] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggests(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/products/search_suggest/", { params: { q } });
        setSuggests(data);
        setOpen(true);
      } catch {
        setSuggests(null);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    onNavigate?.();
    navigate(`/shop?search=${encodeURIComponent(q.trim())}`);
  };

  const hasResults =
    suggests && (suggests.products?.length || suggests.categories?.length || suggests.brands?.length);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={submit} className="flex items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hasResults && setOpen(true)}
          placeholder="Search products, brands and more..."
          className="w-full rounded-xl border border-neutral-200 bg-neutral-100/80 py-2.5 pl-10 pr-9 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 hover:bg-neutral-100 focus:border-neutral-950 focus:bg-white focus:ring-2 focus:ring-neutral-950/10"
          aria-label="Search products"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </form>

      {open && hasResults && (
        <div className="absolute z-50 mt-2 w-full min-w-72 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
          {suggests.products?.length > 0 && (
            <div className="p-2">
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">Products</p>
              {suggests.products.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm transition hover:bg-neutral-100"
                >
                  <span className="truncate font-medium text-neutral-800">{p.name}</span>
                  <span className="ml-3 shrink-0 font-bold text-neutral-950">{money(p.price)}</span>
                </Link>
              ))}
            </div>
          )}
          {(suggests.categories?.length > 0 || suggests.brands?.length > 0) && (
            <div className="flex flex-wrap gap-1.5 border-t border-neutral-100 bg-neutral-50/60 p-2.5">
              {suggests.categories?.map((c) => (
                <Link
                  key={c.id}
                  to={`/shop?category=${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="badge bg-white text-neutral-800 ring-1 ring-neutral-200 transition hover:bg-neutral-950 hover:text-white"
                >
                  {c.name}
                </Link>
              ))}
              {suggests.brands?.map((b) => (
                <Link
                  key={b.id}
                  to={`/shop?brand=${b.slug}`}
                  onClick={() => setOpen(false)}
                  className="badge bg-white text-neutral-600 ring-1 ring-neutral-200 transition hover:bg-neutral-950 hover:text-white"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
