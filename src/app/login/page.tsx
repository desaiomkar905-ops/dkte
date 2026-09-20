"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { ErrorNote } from "@/components/ui";
import { Logo, ShieldMark } from "@/components/Logo";

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
    <div className="grid min-h-screen lg:grid-cols-[1fr_460px]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-cs-border p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 380px at 70% 20%, rgba(37,99,235,0.22), transparent 60%), radial-gradient(500px 300px at 20% 80%, rgba(16,185,129,0.08), transparent 55%)",
          }}
        />
        <Logo size={34} />
        <div className="relative">
          <ShieldMark size={56} />
          <h1 className="mt-6 max-w-md text-3xl font-semibold leading-tight tracking-tight">
            From citizen complaint to <span className="text-sky-400">verified civic action.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-cs-muted">
            Agents analyze each report, check duplicates, route it to the right department — and
            verify the repair before a case can close.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-cs-muted">
            {["AI triage with explainable severity", "Duplicate intelligence across the city", "SLA clocks with auto-escalation"].map((x) => (
              <li key={x} className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-[10px] text-emerald-300" aria-hidden>✓</span>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-cs-muted/60">CivicShield AI — original hackathon build</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo size={34} />
          </div>
          <div className="cs-card cs-fade-up p-6">
            <h2 className="text-lg font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-cs-muted">Welcome back. Enter your details.</p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              {error && <ErrorNote message={error} />}
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="cs-input mt-1.5" autoComplete="email" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-slate-300">Password</label>
                <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="cs-input mt-1.5" autoComplete="current-password" placeholder="••••••••" />
              </div>
              <button disabled={busy} className="cs-btn cs-btn-primary w-full">
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-cs-muted">
              No account? <Link href="/register" className="font-medium text-sky-400 hover:underline">Create one</Link>
            </p>
          </div>

          <div className="cs-fade-up mt-4 rounded-2xl border border-violet-400/25 bg-violet-500/[0.07] p-4" style={{ animationDelay: "80ms" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-300">Demo accounts (seeded)</p>
            <div className="mt-2.5 flex gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                  }}
                  className="cs-btn cs-btn-secondary !flex-1 !px-2 !py-1.5 !text-xs"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
