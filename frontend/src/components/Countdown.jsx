import { useEffect, useState } from "react";

function diff(target) {
  const ms = Math.max(new Date(target) - Date.now(), 0);
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  };
}

export default function Countdown({ to, compact = false }) {
  const [t, setT] = useState(() => diff(to));
  useEffect(() => {
    const id = setInterval(() => setT(diff(to)), 1000);
    return () => clearInterval(id);
  }, [to]);

  const pad = (n) => String(n).padStart(2, "0");
  const parts = compact ? [t.d && `${t.d}d`, pad(t.h), pad(t.m), pad(t.s)].filter(Boolean) : [pad(t.h + t.d * 24), pad(t.m), pad(t.s)];

  return (
    <span className="flex items-center gap-1.5 font-mono font-bold">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="opacity-60">:</span>}
          <span className="rounded-lg bg-gray-900 px-2 py-1 text-white">{p}</span>
        </span>
      ))}
    </span>
  );
}
