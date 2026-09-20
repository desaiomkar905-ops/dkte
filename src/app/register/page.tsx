"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { ErrorNote } from "@/components/ui";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/register", { body: { ...form, phone: form.phone || undefined } });
      router.push("/citizen");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-civic-700 text-xs font-bold text-white">CS</span>
          CivicShield <span className="text-civic-700">AI</span>
        </Link>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Create citizen account</h1>
          <p className="text-sm text-slate-500">Worker and official accounts are provisioned by the municipality.</p>
          {error && <ErrorNote message={error} />}
          <Field id="name" label="Full name" value={form.name} onChange={set("name")} required />
          <Field id="email" label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
          <Field id="phone" label="Phone (optional)" value={form.phone} onChange={set("phone")} autoComplete="tel" />
          <Field id="password" label="Password (min 8 chars)" type="password" value={form.password} onChange={set("password")} required autoComplete="new-password" />
          <button disabled={busy} className="w-full rounded-lg bg-civic-700 py-2 font-semibold text-white hover:bg-civic-900 disabled:opacity-50">
            {busy ? "Creating…" : "Create account"}
          </button>
          <p className="text-center text-sm text-slate-500">
            Already registered? <Link href="/login" className="font-medium text-civic-700">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ id, label, ...rest }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      <input id={id} {...rest} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </div>
  );
}
