import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, ShoppingBag } from "lucide-react";
import { errMsg } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    first_name: "", last_name: "", username: "", email: "",
    password: "", password2: "", wants_to_sell: params.get("seller") === "1",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form);
      navigate("/");
    } catch (e2) {
      setError(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white"><ShoppingBag size={26} /></span>
        <h1 className="text-2xl font-extrabold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Join ShopHub — it takes less than a minute</p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6">
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="First name" value={form.first_name} onChange={set("first_name")} />
          <input className="input" placeholder="Last name" value={form.last_name} onChange={set("last_name")} />
        </div>
        <input className="input" placeholder="Username" value={form.username} onChange={set("username")} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={set("email")} required />
        <input className="input" type="password" placeholder="Password (8+ chars)" value={form.password} onChange={set("password")} required />
        <input className="input" type="password" placeholder="Confirm password" value={form.password2} onChange={set("password2")} required />

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3.5 text-sm">
          <input
            type="checkbox"
            checked={form.wants_to_sell}
            onChange={(e) => setForm({ ...form, wants_to_sell: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          <span>
            <span className="block font-semibold">I want to sell on ShopHub</span>
            <span className="block text-xs text-gray-400">Creates a seller account with store dashboard</span>
          </span>
        </label>

        <button disabled={busy} className="btn-primary w-full !py-3">
          <UserPlus /> {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
