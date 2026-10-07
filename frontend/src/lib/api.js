import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

export const getToken = () => localStorage.getItem("shophub_access") || "";
export const setTokens = ({ access, refresh }) => {
  if (access) localStorage.setItem("shophub_access", access);
  if (refresh) localStorage.setItem("shophub_refresh", refresh);
};
export const clearTokens = () => {
  localStorage.removeItem("shophub_access");
  localStorage.removeItem("shophub_refresh");
};

export const getCartToken = () => {
  let t = localStorage.getItem("shophub_cart_token");
  if (!t) {
    t = `dev-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    localStorage.setItem("shophub_cart_token", t);
  }
  return t;
};

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Cart-Token"] = getCartToken();
  return config;
});

// Refresh once on 401, then retry the request.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && getToken() && !original._retried) {
      original._retried = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_BASE}/auth/token/refresh/`, {
            refresh: localStorage.getItem("shophub_refresh"),
          });
        const { data } = await refreshing;
        refreshing = null;
        localStorage.setItem("shophub_access", data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        refreshing = null;
        clearTokens();
        window.dispatchEvent(new Event("shophub:logout"));
      }
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e) =>
  e?.response?.data
    ? typeof e.response.data === "string"
      ? e.response.data
      : Object.values(e.response.data).flat().join(" ")
    : e?.message || "Something went wrong";

// DRF list endpoints may return a plain array or a paginated envelope
// ({ count, next, previous, results }) — normalize either shape to an array.
export const listOf = (data) => (Array.isArray(data) ? data : (data?.results ?? []));
