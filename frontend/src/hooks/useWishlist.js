import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function useWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => (await api.get("/wishlist/")).data,
    enabled: !!user,
  });

  const toggle = useMutation({
    mutationFn: async (productId) =>
      (await api.post("/wishlist/toggle/", { product_id: productId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const moveToCart = useMutation({
    mutationFn: async (productId) =>
      (await api.post(`/wishlist/items/${productId}/move-to-cart/`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  return {
    wishlist,
    ids: new Set(wishlist?.product_ids ?? []),
    toggle,
    moveToCart,
  };
}
