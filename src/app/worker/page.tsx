"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, StatusBadge, SeverityBadge, CategoryTag, DemoBadge, Skeleton, LoginPrompt, ErrorNote, PageHeader } from "@/components/ui";
import { api, fetchMe, fmtDateTime, fmtAgo, type SessionUser } from "@/lib/client";

type Row = {
  id: string; refCode: string; title: string; description: string; category: string; severity: string;
  status: string; address: string | null; lat: number; lng: number; createdAt: string; slaDueAt: string | null;
  isOverdue: boolean; source: string; photoKey: string | null;
  department: { code: string; name: string } | null;
};

export default function WorkerPage() {
  const [me, setMe] = useState<SessionUser | null | undefined>(undefined);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ complaints: Row[] }>("/api/complaints?scope=assigned");
      setRows(d.complaints);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) { setMe(null); return; }
      if (u.role !== "WORKER") { window.location.href = u.role === "OFFICIAL" ? "/official" : "/citizen"; return; }
      setMe(u);
      load();
    });
  }, [load]);

  if (me === null) return <AppShell><LoginPrompt /></AppShell>;

  async function setStatus(id: string, action: "accept" | "start") {
    setBusyId(id);
    setActionError("");
    try {
      await api(`/api/complaints/${id}/status`, { body: { action } });
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const open = (rows ?? []).filter((r) => !["RESOLVED", "CLOSED"].includes(r.status)).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <PageHeader
          title="My Tasks"
          subtitle="Accept assignments, work on site, then submit resolution evidence for AI verification."
        />

        {error && <ErrorNote message={error} />}
        {actionError && <ErrorNote message={actionError} />}
        {rows === null && !error && (
          <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-36" />)}</div>
        )}
        {rows && rows.length === 0 && (
          <Card className="p-10 text-center text-cs-muted">
            No tasks assigned yet. Officials assign complaints from their dashboard.
          </Card>
        )}

        {rows && rows.length > 0 && (
          <p className="text-xs text-cs-muted">
            {open} open task{open === 1 ? "" : "s"} · {rows.length} total assigned
          </p>
        )}

        <div className="space-y-3">
          {rows?.map((r, i) => (
            <Card key={r.id} hover className="cs-fade-up p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2" style={{ animationDelay: `${Math.min(i * 50, 250)}ms` }}>
                <span className="font-mono text-xs text-cs-muted">{r.refCode}</span>
                <StatusBadge status={r.status} pulse={r.status === "VERIFICATION"} />
                <SeverityBadge severity={r.severity} />
                <CategoryTag category={r.category} />
                {r.source === "DEMO" && <DemoBadge />}
                {r.isOverdue && <span className="cs-badge border-rose-400/40 bg-rose-500/15 text-rose-300">OVERDUE</span>}
              </div>
              <Link href={`/complaints/${r.id}`} className="mt-2 block font-medium text-sky-300 hover:underline">{r.title}</Link>
              <p className="mt-1 line-clamp-2 text-sm text-cs-muted">{r.description}</p>
              <p className="mt-1.5 text-xs text-cs-muted">
                📍 {r.address ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`} · reported {fmtAgo(r.createdAt)}
                {r.slaDueAt && <> · <span className={r.isOverdue ? "font-semibold text-rose-300" : "text-amber-300"}>SLA {r.isOverdue ? "breached" : `due ${fmtDateTime(r.slaDueAt)}`}</span></>}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "ASSIGNED" && (
                  <>
                    <button onClick={() => setStatus(r.id, "accept")} disabled={busyId === r.id}
                      className="cs-btn cs-btn-secondary !py-1.5 !text-sm disabled:opacity-50">Accept</button>
                    <button onClick={() => setStatus(r.id, "start")} disabled={busyId === r.id}
                      className="cs-btn cs-btn-primary !py-1.5 !text-sm disabled:opacity-50">Start work</button>
                  </>
                )}
                {r.status === "IN_PROGRESS" && (
                  <Link href={`/worker/resolve/${r.id}`} className="cs-btn cs-btn-success !py-1.5 !text-sm">
                    Upload resolution evidence →
                  </Link>
                )}
                {r.status === "VERIFICATION" && (
                  <span className="cs-badge border-amber-400/30 bg-amber-500/10 text-amber-300">AI is verifying your evidence…</span>
                )}
                {r.status === "REOPENED" && (
                  <Link href={`/worker/resolve/${r.id}`} className="cs-btn !border-orange-400/40 !bg-orange-500/15 !py-1.5 !text-sm !text-orange-300 hover:!bg-orange-500/20">
                    Reopened — submit new evidence →
                  </Link>
                )}
                <Link href={`/complaints/${r.id}`} className="cs-btn cs-btn-secondary !py-1.5 !text-sm">View case</Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
