"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { ErrorNote } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { label: "Citizen", email: "citizen@civicshield.demo", password: "Citizen@123" },
  { label: "Worker", email: "worker@civicshield.demo", password: "Worker@123" },
  { label: "Official", email: "official@civicshield.demo", password: "Official@123" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { user } = await api<{ user: { role: string } }>("/api/auth/login", { body: { email, password } });
      router.push(user.role === "OFFICIAL" ? "/official" : user.role === "WORKER" ? "/worker" : "/citizen");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-civic-700 text-xs font-bold text-white">CS</span>
          CivicShield <span className="text-civic-700">AI</span>
        </Link>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Sign in</h1>
          {error && <ErrorNote message={error} />}
          <div>
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" autoComplete="current-password" />
          </div>
          <button disabled={busy} className="w-full rounded-lg bg-civic-700 py-2 font-semibold text-white hover:bg-civic-900 disabled:opacity-50">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-sm text-slate-500">
            No account? <Link href="/register" className="font-medium text-civic-700">Create one</Link>
          </p>
        </form>

        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Demo accounts (seeded)</p>
          <div className="mt-2 flex gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} onClick={() => { setEmail(a.email); setPassword(a.password); }}
                className="rounded-md border border-violet-300 bg-white px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
