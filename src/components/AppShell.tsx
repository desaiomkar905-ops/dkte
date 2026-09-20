"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMe, api, type SessionUser } from "@/lib/client";
import { LANGS, useLang } from "@/lib/i18n";
import { Logo } from "./Logo";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

type NavItem = { href: string; label: string; icon: string };

const NAV: Record<SessionUser["role"], NavItem[]> = {
  CITIZEN: [
    { href: "/citizen/submit", label: "Report", icon: "➕" },
    { href: "/citizen", label: "My Reports", icon: "🗂" },
  ],
  OFFICIAL: [{ href: "/official", label: "Command Center", icon: "📡" }],
  WORKER: [{ href: "/worker", label: "My Tasks", icon: "🛠" }],
};

/** Role-aware navigation shell: glass top bar + mobile bottom tab bar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang, setLang, t } = useLang();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    fetchMe().then((u) => {
      if (!alive) return;
      setMe(u);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    // Sign out of both layers: Firebase (browser) + our session cookie (server).
    await signOut(getFirebaseAuth()).catch(() => {});
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const items = me ? NAV[me.role] : [];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-cs-border bg-cs-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="CivicShield AI home" className="rounded-md">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="ml-6 hidden flex-1 items-center gap-1 sm:flex" aria-label="Primary">
            {items.map((n) => {
              const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    active ? "bg-sky-500/15 font-medium text-sky-300" : "text-cs-muted hover:bg-white/5 hover:text-cs-text"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
              className="hidden rounded-lg border border-cs-border bg-cs-elevated px-2 py-1.5 text-xs text-cs-text sm:block"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>

            {loading ? null : me ? (
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 text-sm text-cs-muted md:flex">
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-cs-border bg-cs-elevated text-xs font-semibold text-sky-300" aria-hidden>
                    {me.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-28 truncate">{me.name}</span>
                  <span className="rounded-md border border-cs-border bg-cs-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cs-muted">
                    {me.role.toLowerCase()}
                  </span>
                </span>
                <button onClick={logout} className="cs-btn cs-btn-secondary !px-3 !py-1.5 !text-xs">
                  {t("logout")}
                </button>
              </div>
            ) : (
              <Link href="/login" className="cs-btn cs-btn-primary !px-3.5 !py-1.5 !text-xs">
                {t("login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:pb-8">{children}</main>

      {/* Mobile bottom nav */}
      {me && items.length > 0 && (
        <nav
          aria-label="Primary mobile"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-cs-border bg-cs-bg/90 backdrop-blur-md sm:hidden"
        >
          <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
            {items.map((n) => {
              const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-w-20 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] transition ${
                    active ? "text-sky-300" : "text-cs-muted"
                  }`}
                >
                  <span aria-hidden className={active ? "scale-110" : ""}>{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <footer className="border-t border-cs-border px-4 py-5 text-center text-xs text-cs-muted/70">
        CivicShield AI — original hackathon build. Secure Google sign-in.
      </footer>
    </div>
  );
}
