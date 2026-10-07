import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogIn, ShoppingBag } from "lucide-react";
import { errMsg } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const DEMO = [
  ["Customer", "demo@shophub.dev", "Demo@12345"],
  ["Seller", "technova@shophub.dev", "Seller@12345"],
  ["Admin", "admin@shophub.dev", "Admin@12345"],
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form);
      // ?next=/checkout takes priority over router state
      const params = new URLSearchParams(location.search);
      const next = params.get("next") || location.state?.from || "/";
      navigate(next, { replace: true });
    } catch (e2) {
      setError(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div className="text-center">
        <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white"><ShoppingBag size={26} /></span>
        <h1 className="text-2xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Log in to ShopHub to continue shopping</p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6">
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Email or username</label>
          <input
            className="input"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Password</label>
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            required
          />
        </div>
        <button disabled={busy} className="btn-primary w-full !py-3">
          <LogIn /> {busy ? "Logging in…" : "Log in"}
        </button>
        <p className="text-center text-sm text-gray-500">
          New here? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link>
        </p>
      </form>

      <div className="card p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Demo accounts</p>
        <div className="space-y-1.5">
          {DEMO.map(([role, email, pass]) => (
            <button
              key={role}
              onClick={() => setForm({ username: email, password: pass })}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-brand-50"
            >
              <span className="font-semibold">{role}</span>
              <span className="text-xs text-gray-400">{email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
