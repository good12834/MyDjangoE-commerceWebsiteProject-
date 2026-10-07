import { useMemo } from "react";
import { X } from "lucide-react";

/**
 * Product-listing filter sidebar. Extracted from ShopPage so it can be
 * reused in the desktop rail and the mobile drawer.
 */
export default function FilterSidebar({
  q,
  params,
  setParam,
  setParams,
  toggleBrand,
  activeBrands,
  categories,
  brands,
}) {
  // The API returns the full tree flat; group it so the sidebar reads as a
  // proper hierarchy instead of 30 undifferentiated rows.
  const { parents, childrenByParent } = useMemo(() => {
    const all = categories.data ?? [];
    const parents = all.filter((c) => c.parent == null);
    const childrenByParent = new Map();
    for (const child of all) {
      if (child.parent == null) continue;
      if (!childrenByParent.has(child.parent)) childrenByParent.set(child.parent, []);
      childrenByParent.get(child.parent).push(child);
    }
    return { parents, childrenByParent };
  }, [categories.data]);

  const childrenOf = (id) => childrenByParent.get(id) ?? [];

  return (
    <aside className="w-64 shrink-0 space-y-6">
      <FilterBlock title="Category">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setParam("category", "")}
            className={`rounded-lg px-2 py-1.5 text-left text-sm ${
              !q.category ? "bg-neutral-100 font-semibold text-ink" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            All categories
          </button>
          {parents.map((parent) => {
            const expanded = q.category === parent.slug || childrenOf(parent.id).some((c) => c.slug === q.category);
            return (
              <div key={parent.id}>
                <button
                  onClick={() => setParam("category", parent.slug)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                    q.category === parent.slug
                      ? "bg-neutral-100 font-semibold text-ink"
                      : "font-medium text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="truncate">{parent.name}</span>
                  <span className="shrink-0 text-xs text-neutral-400">{parent.product_count}</span>
                </button>
                {expanded && childrenOf(parent.id).length > 0 && (
                  <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-neutral-200 pl-2">
                    {childrenOf(parent.id).map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setParam("category", child.slug)}
                        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs ${
                          q.category === child.slug
                            ? "bg-neutral-100 font-semibold text-ink"
                            : "text-neutral-500 hover:bg-neutral-100 hover:text-ink"
                        }`}
                      >
                        <span className="truncate">{child.name}</span>
                        <span className="shrink-0 text-[10px] text-neutral-400">{child.product_count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FilterBlock>

      <FilterBlock title="Price">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            setParam("min_price", fd.get("min"));
            setParam("max_price", fd.get("max"));
          }}
        >
          <input name="min" type="number" min="0" placeholder="Min" defaultValue={q.min_price} className="input !px-2.5 !py-1.5" />
          <span className="text-neutral-400">—</span>
          <input name="max" type="number" min="0" placeholder="Max" defaultValue={q.max_price} className="input !px-2.5 !py-1.5" />
          <button className="btn-primary !px-3 !py-1.5 !text-xs">Go</button>
        </form>
      </FilterBlock>

      <FilterBlock title="Brand">
        <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
          {(brands.data ?? []).map((b) => (
            <label key={b.id} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={activeBrands.includes(b.slug)}
                onChange={() => toggleBrand(b.slug)}
                className="h-4 w-4 accent-brand-600"
              />
              {b.name}
            </label>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title="Rating">
        <div className="flex flex-wrap gap-1.5">
          {[4, 3, 2].map((r) => (
            <button
              key={r}
              onClick={() => setParam("min_rating", q.min_rating === String(r) ? "" : String(r))}
              className={`badge border ${
                q.min_rating === String(r)
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {r}+ stars & up
            </button>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title="Availability">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={q.in_stock === "1"}
            onChange={(e) => setParam("in_stock", e.target.checked ? "1" : "")}
            className="h-4 w-4 accent-brand-600"
          />
          In stock only
        </label>
        <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={q.on_sale === "1"}
            onChange={(e) => setParam("on_sale", e.target.checked ? "1" : "")}
            className="h-4 w-4 accent-brand-600"
          />
          On sale
        </label>
      </FilterBlock>

      {params.toString() && (
        <button onClick={() => setParams({})} className="btn-outline w-full !py-2 !text-xs">
          <X size={14} /> Clear all filters
        </button>
      )}
    </aside>
  );
}

function FilterBlock({ title, children }) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">{title}</p>
      {children}
    </div>
  );
}
