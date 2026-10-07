import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const API_ORIGIN = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [liveEvents, setLiveEvents] = useState([]);
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications/")).data,
    enabled: !!user,
    refetchInterval: wsConnected ? false : 30000,
  });

  // Live websocket (graceful fallback to polling)
  useEffect(() => {
    if (!user) return;
    const url = `${API_ORIGIN.replace("http", "ws")}/ws/notifications/?token=${getToken()}`;
    let closed = false;
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.kind === "notification") {
            setLiveEvents((prev) => [msg.payload, ...prev].slice(0, 20));
            qc.invalidateQueries({ queryKey: ["notifications"] });
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      return () => {
        closed = true;
        ws.close();
      };
    } catch {
      return () => {};
    }
  }, [user?.id]);

  const markRead = useMutation({
    mutationFn: async (id) =>
      id ? api.post(`/notifications/${id}/read/`) : api.post("/notifications/read/"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = [
    ...liveEvents.map((n) => ({ ...n, read: false })),
    ...(data?.results ?? []),
  ];
  const unreadCount = data?.unread_count ?? 0;

  return { notifications, unreadCount, markRead, wsConnected };
}
