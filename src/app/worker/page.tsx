"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, StatusBadge, SeverityBadge, CategoryTag, Spinner, LoginPrompt, ErrorNote } from "@/components/ui";
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

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-sm text-slate-500">Accept assignments, work on site, then submit resolution evidence for AI verification.</p>
        </div>

        {error && <ErrorNote message={error} />}
        {actionError && <ErrorNote message={actionError} />}
        {rows === null && !error && <div className="grid place-items-center py-16"><Spinner /></div>}
        {rows && rows.length === 0 && (
          <Card className="p-10 text-center text-slate-500">No tasks assigned yet. Officials assign complaints from their dashboard.</Card>
        )}

        <div className="space-y-3">
          {rows?.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-400">{r.refCode}</span>
                <StatusBadge status={r.status} />
                <SeverityBadge severity={r.severity} />
                <CategoryTag category={r.category} />
                {r.source === "DEMO" && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">DEMO</span>}
                {r.isOverdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">OVERDUE</span>}
              </div>
              <Link href={`/complaints/${r.id}`} className="mt-1.5 block font-medium text-civic-700 hover:underline">{r.title}</Link>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.description}</p>
              <p className="mt-1 text-xs text-slate-400">
                📍 {r.address ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`} · reported {fmtAgo(r.createdAt)}
                {r.slaDueAt && <> · SLA due {fmtDateTime(r.slaDueAt)}</>}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "ASSIGNED" && (
                  <>
                    <button onClick={() => setStatus(r.id, "accept")} disabled={busyId === r.id}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Accept</button>
                    <button onClick={() => setStatus(r.id, "start")} disabled={busyId === r.id}
                      className="rounded-lg bg-civic-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-civic-900 disabled:opacity-50">Start work</button>
                  </>
                )}
                {r.status === "IN_PROGRESS" && (
                  <Link href={`/worker/resolve/${r.id}`}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                    Upload resolution evidence →
                  </Link>
                )}
                {r.status === "VERIFICATION" && (
                  <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700 ring-1 ring-amber-200">AI is verifying your evidence…</span>
                )}
                {r.status === "REOPENED" && (
                  <Link href={`/worker/resolve/${r.id}`}
                    className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700">
                    Reopened — submit new evidence →
                  </Link>
                )}
                <Link href={`/complaints/${r.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">View case</Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
