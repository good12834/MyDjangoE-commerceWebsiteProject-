import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Share2, ShoppingCart, Trash2 } from "lucide-react";
import { money, img } from "../lib/utils";
import { useWishlist } from "../hooks/useWishlist";
import ProductCard from "../components/ProductCard";

export default function WishlistPage() {
  const { wishlist, moveToCart, toggle } = useWishlist();
  const [copied, setCopied] = useState(false);

  const items = wishlist?.items ?? [];

  const share = async () => {
    const url = `${window.location.origin}/wishlist/shared/${wishlist.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your wishlist link:", url);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="section-title">My Wishlist</h1>
        {items.length > 0 && (
          <button onClick={share} className="btn-outline !py-2 !text-xs">
            <Share2 size={14} /> {copied ? "Link copied!" : "Share wishlist"}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card grid place-items-center gap-3 py-20 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-neutral-100 text-neutral-400"><Heart size={28} /></span>
          <p className="text-lg font-semibold">Your wishlist is empty</p>
          <p className="text-sm text-gray-400">Tap the heart on any product to save it here.</p>
          <Link to="/shop" className="btn-primary mt-2">Discover products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={item.id} className="space-y-2">
              <ProductCard product={item.product} index={i} />
              <div className="flex gap-2">
                <button
                  onClick={() => moveToCart.mutate(item.product.id)}
                  className="btn-primary flex-1 !py-2 !text-xs"
                  disabled={!item.product.in_stock}
                >
                  <ShoppingCart size={13} /> Move to cart
                </button>
                <button onClick={() => toggle.mutate(item.product.id)} className="btn-outline !px-3 !py-2" aria-label="Remove from wishlist">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
