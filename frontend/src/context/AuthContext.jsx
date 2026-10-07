import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, clearTokens, getToken, getCartToken, setTokens } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me/")).data,
    enabled: !!getToken(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => setReady(!isLoading || !getToken()), [isLoading]);

  useEffect(() => {
    const onLogout = () => {
      clearTokens();
      qc.setQueryData(["me"], null);
      qc.clear();
    };
    window.addEventListener("shophub:logout", onLogout);
    return () => window.removeEventListener("shophub:logout", onLogout);
  }, [qc]);

  const login = async (credentials) => {
    const { data } = await api.post("/auth/login/", credentials);
    setTokens(data);
    qc.setQueryData(["me"], data.user);
    // merge any anonymous cart into the user cart
    try {
      await api.post("/cart/merge/", { device_token: getCartToken() });
    } catch {
      /* non-fatal */
    }
    qc.invalidateQueries();
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register/", payload);
    setTokens(data);
    qc.setQueryData(["me"], data.user);
    try {
      await api.post("/cart/merge/", { device_token: getCartToken() });
    } catch {
      /* non-fatal */
    }
    qc.invalidateQueries();
    return data.user;
  };

  const logout = () => {
    clearTokens();
    qc.setQueryData(["me"], null);
    qc.clear();
  };

  const value = {
    user: user ?? null,
    isLoading,
    ready,
    isAdmin: user ? user.role === "admin" || user.is_superuser || user.role === "ADMIN" : false,
    isSeller: user ? ["seller", "SELLER"].includes(user.role) : false,
    login,
    register,
    logout,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
