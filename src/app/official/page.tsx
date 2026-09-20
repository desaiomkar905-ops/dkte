"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, StatCard, StatusBadge, SeverityBadge, CategoryTag, DemoBadge, Spinner, LoginPrompt, ErrorNote } from "@/components/ui";
import { AgentActivityPanel, type Activity } from "@/components/AgentActivityPanel";
import MapPanel from "@/components/MapPanel";
import { api, fetchMe, fmtAgo, fmtCountdown, type SessionUser } from "@/lib/client";
import { CATEGORIES, STATUSES, DEPARTMENT_CODES, categoryLabels, statusLabels } from "@/lib/constants";

type Row = {
  id: string; refCode: string; title: string; category: string; severity: string; priority: number;
  status: string; lat: number; lng: number; address: string | null; createdAt: string; slaDueAt: string | null;
  isOverdue: boolean; escalationCount: number; source: string;
  department: { code: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
};
type Stats = { totals: { total: number; open: number; inProgress: number; verification: number; resolved: number; escalated: number; overdue: number; reopened: number } };
type Worker = { id: string; name: string; departmentId: string | null };

export default function OfficialDashboard() {
  const [me, setMe] = useState<SessionUser | null | undefined>(undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", category: "", severity: "", department: "" });
  const [assigning, setAssigning] = useState<Row | null>(null);
  const [slaDemo, setSlaDemo] = useState<Row | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      const [s, list, act] = await Promise.all([
        api<Stats>("/api/stats"),
        api<{ complaints: Row[] }>(`/api/complaints?scope=all&${qs}`),
        api<{ activities: Activity[] }>("/api/activity?limit=30"),
      ]);
      setStats(s);
      setRows(list.complaints);
      setActivities(act.activities);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [filters]);

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) { setMe(null); return; }
      if (u.role !== "OFFICIAL") { window.location.href = u.role === "WORKER" ? "/worker" : "/citizen"; return; }
      setMe(u);
      load();
      fetch("/api/health/ai").then((r) => r.json()).then((d) => setDemoMode(Boolean(d.demoMode))).catch(() => {});
      api<{ users: Worker[] }>("/api/official/workers").then((d) => setWorkers(d.users)).catch(() => {});
    });
  }, [load]);

  const mapRows = useMemo(
    () =>
      (rows ?? []).map((r) => ({
        id: r.id, refCode: r.refCode, title: r.title, lat: r.lat, lng: r.lng,
        category: r.category, severity: r.severity, status: r.status, source: r.source,
      })),
    [rows]
  );

  if (me === null) return <AppShell><LoginPrompt /></AppShell>;

  async function assign(workerId: string) {
    if (!assigning) return;
    setActionError("");
    try {
      await api(`/api/complaints/${assigning.id}/assign`, { body: { workerId } });
      setAssigning(null);
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function escalate(row: Row) {
    setActionError("");
    try {
      await api(`/api/complaints/${row.id}/escalate`, { body: { reason: "Manual escalation by official from dashboard" } });
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function demoSla(row: Row, mode: "warning" | "breach") {
    setActionError("");
    try {
      await api("/api/demo/sla", { body: { complaintId: row.id, mode } });
      setSlaDemo(null);
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  const t = stats?.totals;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Official Dashboard</h1>
            <p className="text-sm text-slate-500">Live complaint queue with SLA clocks, duplicate links and agent decisions.</p>
          </div>
          <button onClick={load} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">↻ Refresh</button>
        </div>

        {error && <ErrorNote message={error} />}
        {actionError && <ErrorNote message={actionError} />}

        {/* Stats */}
        {t ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard label="Total" value={t.total} />
            <StatCard label="Open" value={t.open} />
            <StatCard label="In Progress" value={t.inProgress} />
            <StatCard label="Verification" value={t.verification} />
            <StatCard label="Resolved" value={t.resolved} tone="text-emerald-600" />
            <StatCard label="Overdue" value={t.overdue} tone="text-rose-600" />
            <StatCard label="Escalated" value={t.escalated} tone="text-rose-600" />
          </div>
        ) : (
          <div className="grid place-items-center py-8"><Spinner /></div>
        )}

        {/* Map */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Civic Risk Map</h2>
            <span className="text-xs text-slate-400">{mapRows.length} plotted · filters apply to table</span>
          </div>
          <MapPanel complaints={mapRows} />
        </Card>

        {/* Filters */}
        <Card className="flex flex-wrap gap-3 p-4">
          <Select label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={[["", "All statuses"], ...STATUSES.map((s) => [s, statusLabels[s]] as [string, string])]} />
          <Select label="Category" value={filters.category} onChange={(v) => setFilters((f) => ({ ...f, category: v }))} options={[["", "All categories"], ...CATEGORIES.map((c) => [c, categoryLabels[c]] as [string, string])]} />
          <Select label="Severity" value={filters.severity} onChange={(v) => setFilters((f) => ({ ...f, severity: v }))} options={[["", "All severities"], ["LOW", "Low"], ["MEDIUM", "Medium"], ["HIGH", "High"], ["CRITICAL", "Critical"]]} />
          <Select label="Department" value={filters.department} onChange={(v) => setFilters((f) => ({ ...f, department: v }))} options={[["", "All departments"], ...DEPARTMENT_CODES.map((d) => [d, d] as [string, string])]} />
        </Card>

        {/* Table */}
        <Card>
          <div className="cs-scroll-x">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows === null && (
                  <tr><td colSpan={10} className="px-4 py-10 text-center"><Spinner /></td></tr>
                )}
                {rows?.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">No complaints match these filters.</td></tr>
                )}
                {rows?.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {r.refCode} {r.source === "DEMO" && <DemoBadge />}
                    </td>
                    <td className="max-w-56 px-4 py-3">
                      <Link href={`/complaints/${r.id}`} className="font-medium text-civic-700 hover:underline">{r.title}</Link>
                      <div className="mt-0.5"><CategoryTag category={r.category} /></div>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={r.severity} /></td>
                    <td className="px-4 py-3 font-semibold">{r.priority}</td>
                    <td className="max-w-40 px-4 py-3 text-slate-600">{r.address ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}</td>
                    <td className="px-4 py-3 text-slate-600">{r.department?.code ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                      {r.assignedTo && <div className="mt-0.5 text-xs text-slate-400">{r.assignedTo.name}</div>}
                      {r.escalationCount > 0 && <div className="mt-0.5 text-xs text-rose-500">esc. L{r.escalationCount}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {r.isOverdue ? <span className="font-semibold text-rose-600">OVERDUE</span> : r.slaDueAt ? <span className="text-slate-500">{fmtCountdown(r.slaDueAt)}</span> : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtAgo(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {(!r.assignedTo || ["REOPENED", "ESCALATED"].includes(r.status)) && (
                          <button onClick={() => setAssigning(r)} className="rounded-md bg-civic-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-civic-900">
                            Assign
                          </button>
                        )}
                        {!["RESOLVED", "CLOSED"].includes(r.status) && (
                          <button onClick={() => escalate(r)} className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">
                            Escalate
                          </button>
                        )}
                        {demoMode && !["RESOLVED", "CLOSED"].includes(r.status) && (
                          <button onClick={() => setSlaDemo(r)} title="DEMO MODE: simulate the SLA clock for judging" className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">
                            ⏰ DEMO SLA
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Agent activity */}
        <AgentActivityPanel activities={activities} title="Agent Activity — latest decisions" />
      </div>

      {/* DEMO MODE SLA simulation modal — labeled, dev-only control */}
      {slaDemo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md p-5">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-300">DEMO / DEVELOPMENT MODE</span>
            <h3 className="mt-2 font-semibold text-slate-900">Simulate SLA clock — {slaDemo.refCode}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Moves this complaint&apos;s SLA deadline so judges can see warning → overdue → escalation without waiting hours.
              Every adjustment is labeled in the case timeline; production builds refuse this endpoint.
            </p>
            <div className="mt-4 grid gap-2">
              <button onClick={() => demoSla(slaDemo, "warning")} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm font-medium text-amber-800 hover:bg-amber-100">
                ⏳ Simulate &quot;deadline approaching&quot; (15 minutes left)
              </button>
              <button onClick={() => demoSla(slaDemo, "breach")} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-100">
                🔥 Simulate &quot;SLA breached&quot; (1 hour past due → overdue sweep → escalation)
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setSlaDemo(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
            </div>
          </Card>
        </div>
      )}

      {/* Assignment modal */}
      {assigning && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md p-5">
            <h3 className="font-semibold text-slate-900">Assign worker — {assigning.refCode}</h3>
            <p className="mt-1 text-sm text-slate-500">{assigning.title}</p>
            <div className="mt-4 space-y-2">
              {workers.map((w) => (
                <button key={w.id} onClick={() => assign(w.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-civic-600 hover:bg-civic-50">
                  <span className="font-medium">{w.name}</span>
                  <span className="text-xs text-slate-400">{w.departmentId ? "dept. worker" : "unassigned dept"}</span>
                </button>
              ))}
              {workers.length === 0 && <p className="text-sm text-slate-400">No workers available.</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAssigning(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="text-xs font-medium text-slate-500">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
