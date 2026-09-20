"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { ErrorNote } from "@/components/ui";
import { Logo } from "@/components/Logo";

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
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center">
          <Logo size={34} />
        </Link>
        <div className="cs-card cs-fade-up p-6">
          <h1 className="text-lg font-semibold">Create citizen account</h1>
          <p className="mt-1 text-sm text-cs-muted">Worker and official accounts are provisioned by the municipality.</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            {error && <ErrorNote message={error} />}
            <Field id="name" label="Full name" value={form.name} onChange={set("name")} required placeholder="Your name" />
            <Field id="email" label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" placeholder="you@example.com" />
            <Field id="phone" label="Phone (optional)" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="10-digit mobile" />
            <Field id="password" label="Password (min 8 chars)" type="password" value={form.password} onChange={set("password")} required autoComplete="new-password" placeholder="••••••••" />
            <button disabled={busy} className="cs-btn cs-btn-primary w-full">
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-cs-muted">
            Already registered? <Link href="/login" className="font-medium text-sky-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, ...rest }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-300">{label}</label>
      <input id={id} {...rest} className="cs-input mt-1.5" />
    </div>
  );
}
