import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Filter, X, SearchX } from "lucide-react";
import { api, listOf } from "../lib/api";
import { money } from "../lib/utils";
import ProductCard from "../components/ProductCard";
import FilterSidebar from "../components/FilterSidebar";

const SORTS = [
  ["-is_featured,-created_at", "Featured"],
  ["-created_at", "Newest"],
  ["price", "Price: Low → High"],
  ["-price", "Price: High → Low"],
  ["-rating_avg", "Highest Rated"],
  ["-sold_count", "Most Popular"],
  ["discount", "Biggest Discount"],
];

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = {
    search: params.get("search") || "",
    category: params.get("category") || "",
    brand: params.get("brand") || "",
    min_price: params.get("min_price") || "",
    max_price: params.get("max_price") || "",
    min_rating: params.get("min_rating") || "",
    in_stock: params.get("in_stock") || "",
    on_sale: params.get("on_sale") || "",
    ordering: params.get("ordering") || "-is_featured,-created_at",
    page: params.get("page") || "1",
  };

  const { data, isLoading } = useQuery({
    queryKey: ["shop", q],
    queryFn: async () => {
      const clean = Object.fromEntries(Object.entries(q).filter(([, v]) => v !== ""));
      const { data } = await api.get("/products/", { params: clean });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const brands = useQuery({
    queryKey: ["brands"],
    queryFn: async () => listOf((await api.get("/brands/")).data),
    staleTime: 10 * 60 * 1000,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => listOf((await api.get("/categories/")).data),
    staleTime: 10 * 60 * 1000,
  });

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === "" || value == null) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const toggleBrand = (slug) => {
    const current = (q.brand || "").split(",").filter(Boolean);
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
    setParam("brand", next.join(","));
  };

  const activeBrands = (q.brand || "").split(",").filter(Boolean);
  const total = data?.count ?? 0;

  const sidebar = (
    <FilterSidebar
      q={q}
      params={params}
      setParam={setParam}
      setParams={setParams}
      toggleBrand={toggleBrand}
      activeBrands={activeBrands}
      categories={categories}
      brands={brands}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link to="/" className="hover:text-brand-600">Home</Link>
        <ChevronRight size={14} />
        <span className="font-medium text-ink">
          {q.search ? `Search: “${q.search}”` : q.category ? q.category.replace(/-/g, " ") : "All products"}
        </span>
      </nav>

      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold capitalize tracking-tight">
          {q.search ? `Results for “${q.search}”` : q.category ? q.category.replace(/-/g, " ") : "All products"}
          <span className="ml-2 text-sm font-medium text-neutral-400">{total} items</span>
        </h1>
        <div className="flex items-center gap-2">
          <button className="btn-outline !px-3 !py-2 lg:hidden" onClick={() => setFiltersOpen(true)}>
            <Filter size={15} /> Filters
          </button>
          <select
            value={q.ordering}
            onChange={(e) => setParam("ordering", e.target.value)}
            className="input !w-auto !py-2"
            aria-label="Sort products"
          >
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="hidden lg:block">{sidebar}</div>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
            </div>
          ) : data?.results?.length ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {data.results.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
              <Paginator count={total} page={Number(q.page)} onPage={(p) => setParam("page", String(p))} />
            </>
          ) : (
            <div className="card grid place-items-center gap-2 py-20 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-neutral-100 text-neutral-400"><SearchX size={28} /></span>
              <p className="font-semibold">No products found</p>
              <p className="text-sm text-gray-400">Try adjusting filters or a different search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold">Filters</p>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={20} /></button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}

function Paginator({ count, page, onPage }) {
  const pages = Math.max(Math.ceil(count / 12), 1);
  if (pages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-outline !p-2.5" aria-label="Previous page">
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`h-10 w-10 rounded-lg text-sm font-semibold ${
              p === page ? "bg-brand-600 text-white" : "border border-line hover:bg-neutral-100"
            }`}
          >
            {p}
          </button>
        );
      })}
      {pages > 7 && <span className="text-sm text-gray-400">… {pages}</span>}
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-outline !p-2.5" aria-label="Next page">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
