"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, MetricCard, StatusBadge, SeverityBadge, CategoryTag, DemoBadge, Skeleton, LoginPrompt, ErrorNote, PageHeader, severityTone } from "@/components/ui";
import { AgentActivityPanel, type Activity } from "@/components/AgentActivityPanel";
import MapPanel from "@/components/MapPanel";
import { api, fetchMe, fmtAgo, fmtCountdown, type SessionUser } from "@/lib/client";
import { CATEGORIES, STATUSES, DEPARTMENT_CODES, categoryLabels, statusLabels, severityLabels } from "@/lib/constants";

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
  const queue = (rows ?? []).filter((r) => !["RESOLVED", "CLOSED"].includes(r.status));

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="City Command Center"
          subtitle="Real-time civic intelligence — live SLA clocks, duplicate links and every agent decision."
          actions={
            <button onClick={load} className="cs-btn cs-btn-secondary">
              ↻ Refresh
            </button>
          }
        />

        {error && <ErrorNote message={error} />}
        {actionError && <ErrorNote message={actionError} />}

        {/* Stats — real database values */}
        {t ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <MetricCard label="Total" value={t.total} />
            <MetricCard label="Active Issues" value={t.open} tone="text-sky-300" />
            <MetricCard label="In Progress" value={t.inProgress} tone="text-indigo-300" />
            <MetricCard label="Verification" value={t.verification} tone="text-amber-300" />
            <MetricCard label="Resolved" value={t.resolved} tone="text-emerald-300" />
            <MetricCard label="Overdue" value={t.overdue} tone="text-rose-300" />
            <MetricCard label="Escalated" value={t.escalated} tone="text-rose-300" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        )}

        {/* Risk map + priority queue */}
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold">Civic Risk Map</h2>
              <span className="text-[11px] text-cs-muted">{mapRows.length} plotted · legend shows severity</span>
            </div>
            <MapPanel complaints={mapRows} height="420px" />
          </Card>

          <Card className="flex max-h-[540px] flex-col overflow-hidden p-0">
            <div className="border-b border-cs-border px-4 py-3">
              <h2 className="text-sm font-semibold">Priority Queue</h2>
              <p className="text-[11px] text-cs-muted">Open cases, highest priority first</p>
            </div>
            <div className="cs-scroll-x min-h-0 flex-1 overflow-y-auto p-3">
              {rows === null ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
              ) : queue.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-cs-muted">No open cases — all clear. 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {queue.slice(0, 12).map((r) => (
                    <li key={r.id}>
                      <Link href={`/complaints/${r.id}`}
                        className={`block rounded-xl border p-3 transition hover:border-sky-400/40 hover:bg-sky-500/5 ${severityTone[r.severity] ?? ""}`}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${
                            r.severity === "CRITICAL" ? "bg-rose-400" : r.severity === "HIGH" ? "bg-orange-400" : r.severity === "MEDIUM" ? "bg-amber-400" : "bg-slate-400"
                          }`} aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.title}</span>
                          <span className="shrink-0 text-xs font-semibold text-cs-muted">P{r.priority}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-cs-muted">
                          <span className="font-mono">{r.refCode}</span>
                          <span>· {r.department?.code ?? "—"}</span>
                          <span>· {r.isOverdue ? <span className="font-semibold text-rose-300">OVERDUE</span> : r.slaDueAt ? fmtCountdown(r.slaDueAt) : "no SLA"}</span>
                          {r.assignedTo && <span>· {r.assignedTo.name}</span>}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="flex flex-wrap gap-3 p-4">
          <Select label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={[["", "All statuses"], ...STATUSES.map((s) => [s, statusLabels[s]] as [string, string])]} />
          <Select label="Category" value={filters.category} onChange={(v) => setFilters((f) => ({ ...f, category: v }))} options={[["", "All categories"], ...CATEGORIES.map((c) => [c, categoryLabels[c]] as [string, string])]} />
          <Select label="Severity" value={filters.severity} onChange={(v) => setFilters((f) => ({ ...f, severity: v }))} options={[["", "All severities"], ...(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((s) => [s, severityLabels[s]] as [string, string])]} />
          <Select label="Department" value={filters.department} onChange={(v) => setFilters((f) => ({ ...f, department: v }))} options={[["", "All departments"], ...DEPARTMENT_CODES.map((d) => [d, d] as [string, string])]} />
        </Card>

        {/* Table */}
        <Card className="p-0">
          <div className="cs-scroll-x">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-cs-border text-left text-[11px] uppercase tracking-[0.08em] text-cs-muted">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Dept</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows === null && (
                  <tr><td colSpan={10} className="px-4 py-10"><div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8" />)}</div></td></tr>
                )}
                {rows?.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-cs-muted">No complaints match these filters.</td></tr>
                )}
                {rows?.map((r) => (
                  <tr key={r.id} className="border-b border-cs-border/60 align-top transition hover:bg-sky-500/[0.04]">
                    <td className="px-4 py-3 font-mono text-xs text-cs-muted">
                      {r.refCode} {r.source === "DEMO" && <DemoBadge />}
                    </td>
                    <td className="max-w-56 px-4 py-3">
                      <Link href={`/complaints/${r.id}`} className="font-medium text-sky-300 hover:underline">{r.title}</Link>
                      <div className="mt-0.5"><CategoryTag category={r.category} /></div>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={r.severity} /></td>
                    <td className="px-4 py-3 font-semibold">{r.priority}</td>
                    <td className="max-w-40 px-4 py-3 text-cs-muted">{r.address ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}</td>
                    <td className="px-4 py-3 text-cs-muted">{r.department?.code ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} pulse={r.status === "VERIFICATION"} />
                      {r.assignedTo && <div className="mt-0.5 text-[11px] text-cs-muted">{r.assignedTo.name}</div>}
                      {r.escalationCount > 0 && <div className="mt-0.5 text-[11px] font-medium text-rose-300">esc. L{r.escalationCount}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {r.isOverdue ? <span className="font-semibold text-rose-300">OVERDUE</span> : r.slaDueAt ? <span className="text-cs-muted">{fmtCountdown(r.slaDueAt)}</span> : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-cs-muted">{fmtAgo(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {(!r.assignedTo || ["REOPENED", "ESCALATED"].includes(r.status)) && (
                          <button onClick={() => setAssigning(r)} className="cs-btn cs-btn-primary !px-2.5 !py-1 !text-xs">
                            Assign
                          </button>
                        )}
                        {![ "RESOLVED", "CLOSED" ].includes(r.status) && (
                          <button onClick={() => escalate(r)} className="cs-btn cs-btn-danger !px-2.5 !py-1 !text-xs">
                            Escalate
                          </button>
                        )}
                        {demoMode && !["RESOLVED", "CLOSED"].includes(r.status) && (
                          <button onClick={() => setSlaDemo(r)} title="DEMO MODE: simulate the SLA clock for judging" className="cs-btn !px-2.5 !py-1 !text-xs !text-amber-300"
                            style={{ background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.35)" }}>
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
        <AgentActivityPanel activities={activities} title="AI Agent Activity — latest decisions" />
      </div>

      {/* DEMO MODE SLA simulation modal — labeled, dev-only control */}
      {slaDemo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <Card className="cs-fade-up w-full max-w-md p-5">
            <span className="cs-badge border-amber-400/30 bg-amber-500/10 text-amber-300">DEMO / DEVELOPMENT MODE</span>
            <h3 className="mt-3 font-semibold">Simulate SLA clock — {slaDemo.refCode}</h3>
            <p className="mt-1 text-sm text-cs-muted">
              Moves this complaint&apos;s SLA deadline so judges can see warning → overdue → escalation without waiting hours.
              Every adjustment is labeled in the case timeline; production builds refuse this endpoint.
            </p>
            <div className="mt-4 grid gap-2">
              <button onClick={() => demoSla(slaDemo, "warning")} className="cs-btn !justify-start !border-amber-400/35 !bg-amber-500/10 !text-amber-200 hover:!bg-amber-500/15">
                ⏳ Simulate &quot;deadline approaching&quot; (15 minutes left)
              </button>
              <button onClick={() => demoSla(slaDemo, "breach")} className="cs-btn !justify-start cs-btn-danger">
                🔥 Simulate &quot;SLA breached&quot; (1 hour past due → overdue sweep → escalation)
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setSlaDemo(null)} className="cs-btn cs-btn-secondary !py-1.5 !text-xs">Cancel</button>
            </div>
          </Card>
        </div>
      )}

      {/* Assignment modal */}
      {assigning && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <Card className="cs-fade-up w-full max-w-md p-5">
            <h3 className="font-semibold">Assign worker — {assigning.refCode}</h3>
            <p className="mt-1 text-sm text-cs-muted">{assigning.title}</p>
            <div className="mt-4 space-y-2">
              {workers.map((w) => (
                <button key={w.id} onClick={() => assign(w.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-cs-border bg-cs-bg/40 px-3 py-2.5 text-left text-sm transition hover:border-sky-400/50 hover:bg-sky-500/5">
                  <span className="font-medium">{w.name}</span>
                  <span className="text-xs text-cs-muted">{w.departmentId ? "dept. worker" : "unassigned dept"}</span>
                </button>
              ))}
              {workers.length === 0 && <p className="text-sm text-cs-muted">No workers available.</p>}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setAssigning(null)} className="cs-btn cs-btn-secondary !py-1.5 !text-xs">Cancel</button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="text-xs font-medium text-cs-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="cs-input mt-1 !w-auto !py-1.5 !text-sm">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
