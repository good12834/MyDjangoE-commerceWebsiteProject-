import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, ShoppingBag, Link2 } from "lucide-react";
import { api } from "../lib/api";
import { useCart } from "../context/CartContext";
import ProductCard from "../components/ProductCard";

export default function SharedWishlistPage() {
  const { token } = useParams();
  const { addItem } = useCart();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shared-wishlist", token],
    queryFn: async () => (await api.get(`/wishlist/share/${token}/`)).data,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="skeleton mb-6 h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-square" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-neutral-100 text-neutral-400"><Link2 size={28} /></span>
        <h1 className="mt-4 text-xl font-bold">Wishlist not found</h1>
        <p className="mt-2 text-sm text-muted">This share link is invalid or has expired.</p>
        <Link to="/shop" className="btn-primary mt-5">Browse products</Link>
      </div>
    );
  }

  const products = data?.products ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-sale/10 text-xl text-sale">
          <Heart />
        </span>
        <div>
          <h1 className="section-title">{data?.owner}'s Wishlist</h1>
          <p className="text-sm text-muted">
            {products.length} shared item{products.length === 1 ? "" : "s"} · read-only
          </p>
        </div>
        {products.length > 0 && (
          <button
            onClick={async () => {
              for (const p of products) {
                if (p.in_stock) {
                  try {
                    await addItem({ product_id: p.id, quantity: 1 });
                  } catch {
                    /* skip unavailable */
                  }
                }
              }
            }}
            className="btn-primary ml-auto"
          >
            <ShoppingBag size={15} /> Add all to cart
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-20 text-center">
          <p className="text-lg font-semibold">This wishlist is empty</p>
          <Link to="/shop" className="btn-primary mt-2">Discover products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
