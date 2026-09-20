"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMe, api, type SessionUser } from "@/lib/client";
import { LANGS, useLang } from "@/lib/i18n";

/** Role-aware navigation shell used by every authenticated page. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang, setLang, t } = useLang();
  const router = useRouter();

  useEffect(() => {
    fetchMe().then((u) => {
      setMe(u);
      setLoading(false);
    });
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-civic-700 text-xs font-bold text-white">CS</span>
            <span className="hidden sm:inline">CivicShield <span className="text-civic-700">AI</span></span>
          </Link>

          <nav className="ml-4 flex flex-1 items-center gap-1 text-sm">
            {me?.role === "CITIZEN" && (
              <>
                <NavLink href="/citizen/submit">{t("reportIssue")}</NavLink>
                <NavLink href="/citizen">{t("myComplaints")}</NavLink>
              </>
            )}
            {me?.role === "OFFICIAL" && <NavLink href="/official">{t("dashboard")}</NavLink>}
            {me?.role === "WORKER" && <NavLink href="/worker">{t("workerTasks")}</NavLink>}
          </nav>

          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => setLang(e.target.value as typeof lang)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          {loading ? null : me ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-slate-600 sm:inline">
                {me.name} <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{me.role}</span>
              </span>
              <button onClick={logout} className="rounded-md border border-slate-200 px-2.5 py-1 text-sm hover:bg-slate-50">
                {t("logout")}
              </button>
            </div>
          ) : (
            <Link href="/login" className="rounded-md bg-civic-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-civic-900">
              {t("login")}
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        CivicShield AI — original hackathon build. Demo credentials are clearly marked in the UI and README.
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
      {children}
    </Link>
  );
}
