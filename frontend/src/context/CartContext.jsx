import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const qc = useQueryClient();
  const { data: cart, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => (await api.get("/cart/")).data,
    staleTime: 0,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cart"] });

  const addItem = async (payload) => {
    const { data } = await api.post("/cart/items/", payload);
    qc.setQueryData(["cart"], data);
    return data;
  };

  const updateItem = async (id, payload) => {
    try {
      const { data } = await api.patch(`/cart/items/${id}/`, payload);
      qc.setQueryData(["cart"], data);
    } catch (e) {
      // Stale ID (merged/removed elsewhere): resync from server.
      // Backend includes the fresh cart on 404 so the UI snaps to truth.
      if (e?.response?.status === 404 && e?.response?.data?.cart) {
        qc.setQueryData(["cart"], e.response.data.cart);
        return;
      }
      if (e?.response?.status === 404) invalidate();
      throw e;
    }
  };

  const removeItem = async (id) => {
    // Optimistic: drop the row instantly (kills double-click 404 spam),
    // then confirm with the server and resync.
    const prev = qc.getQueryData(["cart"]);
    if (prev?.items) {
      qc.setQueryData(["cart"], {
        ...prev,
        items: prev.items.filter((i) => i.id !== id),
        item_count: Math.max(0, (prev.item_count ?? prev.items.length) - 1),
      });
    }
    try {
      const { data } = await api.delete(`/cart/items/${id}/`);
      // Idempotent DELETE returns the fresh cart on 200 even for stale IDs.
      qc.setQueryData(["cart"], data);
    } catch (e) {
      if (e?.response?.status === 404) {
        // Item already gone server-side — our optimistic removal was correct.
        invalidate();
        return;
      }
      // Real failure: roll back.
      if (prev) qc.setQueryData(["cart"], prev);
      throw e;
    }
  };

  const applyCoupon = async (code) => {
    const { data } = await api.post("/cart/coupon/", { code });
    invalidate();
    return data;
  };

  const clearCoupon = async () => {
    await api.delete("/cart/coupon/clear/");
    invalidate();
  };

  return (
    <CartContext.Provider
      value={{ cart, isLoading, itemCount: cart?.item_count ?? 0, addItem, updateItem, removeItem, applyCoupon, clearCoupon, invalidate }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
