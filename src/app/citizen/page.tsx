"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, StatusBadge, SeverityBadge, CategoryTag, DemoBadge, EmptyState, Spinner, LoginPrompt, ErrorNote } from "@/components/ui";
import { api, fetchMe, fmtDateTime, fmtAgo } from "@/lib/client";
import { useLang } from "@/lib/i18n";

type Row = {
  id: string; refCode: string; title: string; category: string; severity: string; status: string;
  createdAt: string; isOverdue: boolean; source: string; department?: { code: string } | null;
};

export default function CitizenHomePage() {
  const [me, setMe] = useState<{ name: string; karma: number } | null>(null);
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
      setMe({ name: u.name, karma: 0 });
      api<{ complaints: Row[] }>("/api/complaints?scope=mine")
        .then((d) => setRows(d.complaints))
        .catch((e) => setError((e as Error).message));
      // Karma is part of the profile payload via detail endpoint; fetch cheaply:
      api<{ user: { karma: number } }>("/api/auth/me").then((d) => setMe({ name: u.name, karma: (d.user as unknown as { karma: number }).karma ?? 0 })).catch(() => {});
    });
  }, []);

  if (me === null) {
    return <AppShell>{error ? <ErrorNote message={error} /> : <LoginPrompt />}</AppShell>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Welcome{me ? `, ${me.name}` : ""}</h1>
            <p className="text-sm text-slate-500">Your reports, tracked from intake to verified resolution.</p>
          </div>
          <Link href="/citizen/submit" className="rounded-lg bg-civic-700 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-900">
            + {t("reportIssue")}
          </Link>
        </div>

        {me && me.karma > 0 && (
          <Card className="flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-50 text-lg" title="Karma for verified reports">🌱</span>
            <div>
              <div className="font-semibold text-slate-800">{me.karma} karma</div>
              <div className="text-xs text-slate-500">Earned when AI verifies a genuine report you made.</div>
            </div>
          </Card>
        )}

        {error && <ErrorNote message={error} />}
        {rows === null && !error ? <div className="grid place-items-center py-10"><Spinner /></div> : null}
        {rows && rows.length === 0 && (
          <EmptyState title="No complaints yet" hint="Report your first civic issue — a photo helps our vision agent a lot." />
        )}

        <div className="space-y-3">
          {rows?.map((c) => (
            <Link key={c.id} href={`/complaints/${c.id}`} className="block">
              <Card className="p-4 transition hover:border-civic-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{c.refCode}</span>
                  <StatusBadge status={c.status} />
                  <SeverityBadge severity={c.severity} />
                  <CategoryTag category={c.category} />
                  {c.source === "DEMO" && <DemoBadge />}
                  {c.isOverdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">OVERDUE</span>}
                </div>
                <p className="mt-1.5 font-medium text-slate-800">{c.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {fmtDateTime(c.createdAt)} · {fmtAgo(c.createdAt)}{c.department ? ` · ${c.department.code}` : ""}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
