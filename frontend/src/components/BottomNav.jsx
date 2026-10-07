import { NavLink } from "react-router-dom";
import { LayoutGrid, Heart, House, ShoppingBag, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../hooks/useWishlist";

function Item({ to, icon, label, badge = 0, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition ${
          isActive ? "text-neutral-950" : "text-neutral-400"
        }`
      }
    >
      <span className="relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-neutral-950 px-1 text-[9px] font-bold text-amber-300">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {label}
    </NavLink>
  );
}

/** Mobile-only bottom navigation — mirrors the design concept. */
export default function BottomNav() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { ids } = useWishlist();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch px-2">
        <Item to="/" end icon={<House size={20} />} label="Home" />
        <Item to="/shop" icon={<LayoutGrid size={20} />} label="Shop" />
        <Item
          to={user ? "/wishlist" : "/login"}
          icon={<Heart size={20} />}
          label="Wishlist"
          badge={user ? ids.size : 0}
        />
        <Item to="/cart" icon={<ShoppingBag size={20} />} label="Cart" badge={itemCount} />
        <Item to={user ? "/account" : "/login"} icon={<User size={20} />} label="Me" />
      </div>
    </nav>
  );
}
