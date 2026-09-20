"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, MetricCard, StatusBadge, SeverityBadge, CategoryTag, DemoBadge, Skeleton, EmptyState, LoginPrompt, ErrorNote, PageHeader } from "@/components/ui";
import { api, fetchMe, fmtAgo, fmtCountdown } from "@/lib/client";
import { useLang } from "@/lib/i18n";

type Row = {
  id: string; refCode: string; title: string; category: string; severity: string; status: string;
  createdAt: string; slaDueAt: string | null; isOverdue: boolean; source: string;
  department?: { code: string } | null;
};

export default function CitizenHomePage() {
  const [me, setMe] = useState<{ name: string; karma: number } | null | undefined>(undefined);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const { t } = useLang();

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) { setMe(null); return; }
      if (u.role !== "CITIZEN") {
        window.location.href = u.role === "WORKER" ? "/worker" : "/official";
        return;
      }
      api<{ complaints: Row[] }>("/api/complaints?scope=mine")
        .then((d) => setRows(d.complaints))
        .catch((e) => setError((e as Error).message));
      api<{ user: { name: string; karma?: number } }>("/api/auth/me")
        .then((d) => setMe({ name: d.user.name, karma: d.user.karma ?? 0 }))
        .catch(() => setMe({ name: u.name, karma: 0 }));
    });
  }, []);

  if (me === null) {
    return <AppShell>{error ? <ErrorNote message={error} /> : <LoginPrompt />}</AppShell>;
  }
  if (me === undefined) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-9 w-64" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-32" />
        </div>
      </AppShell>
    );
  }

  const active = (rows ?? []).filter((r) => !["RESOLVED", "CLOSED"].includes(r.status)).length;
  const resolved = (rows ?? []).filter((r) => ["RESOLVED", "CLOSED"].includes(r.status)).length;
  const inProgress = (rows ?? []).filter((r) => ["IN_PROGRESS", "VERIFICATION"].includes(r.status)).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <PageHeader
          title={`${greeting}, ${me.name.split(" ")[0]}`}
          subtitle="Here's what's happening with your reports — every case is tracked from AI intake to verified resolution."
          actions={
            <Link href="/citizen/submit" className="cs-btn cs-btn-primary">
              + {t("reportIssue")}
            </Link>
          }
        />

        {/* Top cards — real values from the citizen's own records */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Active Reports" value={rows ? active : "…"} tone="text-sky-300" icon={<span aria-hidden>📋</span>} />
          <MetricCard label="In Progress" value={rows ? inProgress : "…"} tone="text-indigo-300" icon={<span aria-hidden>🔧</span>} />
          <MetricCard label="Resolved" value={rows ? resolved : "…"} tone="text-emerald-300" icon={<span aria-hidden>✅</span>} />
          <MetricCard label="Karma" value={me.karma} tone="text-violet-300" hint={me.karma > 0 ? "earned from verified reports" : undefined} icon={<span aria-hidden>🌱</span>} />
        </div>

        {/* Recent reports */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-cs-muted">Recent reports</h2>

          {error && <ErrorNote message={error} />}
          {rows === null && !error ? (
            <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28" />)}</div>
          ) : null}
          {rows && rows.length === 0 && (
            <EmptyState
              title="No civic reports yet"
              hint="Report your first issue — a photo helps the Vision Agent detect and classify it accurately."
              action={<Link href="/citizen/submit" className="cs-btn cs-btn-primary">Report Your First Issue</Link>}
            />
          )}

          <div className="space-y-3">
            {rows?.map((c, i) => (
              <Link key={c.id} href={`/complaints/${c.id}`} className="block">
                <Card hover className="cs-fade-up p-4 sm:p-5" >
                  <div className="flex flex-wrap items-center gap-2" style={{ animationDelay: `${Math.min(i * 50, 250)}ms` }}>
                    <CategoryTag category={c.category} />
                    <SeverityBadge severity={c.severity} />
                    <StatusBadge status={c.status} pulse={["VERIFICATION", "IN_PROGRESS"].includes(c.status)} />
                    {c.source === "DEMO" && <DemoBadge />}
                    {c.isOverdue && (
                      <span className="cs-badge border-rose-400/40 bg-rose-500/15 text-rose-300">OVERDUE</span>
                    )}
                  </div>
                  <p className="mt-2 font-medium text-cs-text">{c.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cs-muted">
                    <span className="font-mono">{c.refCode}</span>
                    <span aria-hidden>·</span>
                    <span>{fmtAgo(c.createdAt)}</span>
                    {c.department && (<><span aria-hidden>·</span><span>{c.department.code}</span></>)}
                    {c.slaDueAt && !c.isOverdue && !["RESOLVED", "CLOSED"].includes(c.status) && (
                      <><span aria-hidden>·</span><span className="text-amber-300">SLA {fmtCountdown(c.slaDueAt)}</span></>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
