"use client";

import { use, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, StatusBadge, SeverityBadge, CategoryTag, DemoBadge, Spinner, LoginPrompt } from "@/components/ui";
import { AgentActivityPanel, type Activity } from "@/components/AgentActivityPanel";
import { api, fetchMe, fmtDateTime, type SessionUser } from "@/lib/client";

type ComplaintDetail = {
  id: string; refCode: string; title: string; description: string; category: string; severity: string;
  priority: number; status: string; source: string; lat: number; lng: number; address: string | null;
  ward: string | null; language: string; transcript: string | null; aiConfidence: number | null; aiSummary: string | null;
  photoUrl: string | null; resolutionUrl: string | null; slaHours: number | null; slaDueAt: string | null;
  isOverdue: boolean; verified: boolean | null; verificationConfidence: number | null; verificationReason: string | null;
  verifiedAt: string | null; escalationCount: number; reopenedCount: number; duplicateOf: { refCode: string } | null;
  duplicates: Array<{ refCode: string }>; createdAt: string; assignedAt: string | null; startedAt: string | null;
  submittedAt: string | null; resolvedAt: string | null;
  reporter: { name: string }; assignedTo: { name: string } | null; department: { code: string; name: string } | null;
  events: Array<{ id: string; type: string; actor: string; title: string; detail: string | null; createdAt: string }>;
  agentActivities: Activity[];
  escalations: Array<{ id: string; level: number; reason: string; createdAt: string }>;
};

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [me, setMe] = useState<SessionUser | null | undefined>(undefined);
  const [c, setC] = useState<ComplaintDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMe().then(setMe);
    api<{ complaint: ComplaintDetail }>(`/api/complaints/${id}`)
      .then((d) => setC(d.complaint))
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (me === null) return <AppShell><LoginPrompt /></AppShell>;

  return (
    <AppShell>
      {error && <div className="mx-auto max-w-3xl rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {!c && !error && <div className="grid place-items-center py-20"><Spinner /></div>}
      {c && (
        <div className="mx-auto max-w-3xl space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-slate-500">{c.refCode}</span>
              <StatusBadge status={c.status} />
              <SeverityBadge severity={c.severity} />
              <CategoryTag category={c.category} />
              {c.source === "DEMO" && <DemoBadge />}
              {c.isOverdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">OVERDUE</span>}
            </div>
            <h1 className="mt-2 text-xl font-bold text-slate-900">{c.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{c.description}</p>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <Item label="Department" value={c.department ? `${c.department.name} (${c.department.code})` : "—"} />
              <Item label="Worker" value={c.assignedTo?.name ?? "Unassigned"} />
              <Item label="Priority" value={`${c.priority}/100`} />
              <Item label="SLA" value={c.slaDueAt ? `${c.slaHours}h · due ${fmtDateTime(c.slaDueAt)}` : "—"} />
              <Item label="Location" value={c.address ?? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`} />
              <Item label="Reported by" value={`${c.reporter.name} · ${fmtDateTime(c.createdAt)}`} />
              {c.language !== "en" && <Item label="Language" value={c.language.toUpperCase()} />}
              {c.transcript && <Item label="Voice transcript" value={c.transcript} />}
              {c.aiConfidence != null && <Item label="Vision confidence" value={`${(c.aiConfidence * 100).toFixed(0)}%`} />}
            </dl>

            {c.duplicateOf && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                ⛓ Potentially related complaint: <strong>{c.duplicateOf.refCode}</strong>
              </p>
            )}
            {c.duplicates.length > 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                Later reports linked to this case: {c.duplicates.map((d) => d.refCode).join(", ")}
              </p>
            )}
          </Card>

          {/* Evidence */}
          {(c.photoUrl || c.resolutionUrl) && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-800">Evidence</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {c.photoUrl && (
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.photoUrl} alt="Citizen's original photo of the issue" className="max-h-72 w-full rounded-lg border border-slate-200 object-cover" />
                    <figcaption className="mt-1 text-xs text-slate-500">Before — citizen&apos;s photo</figcaption>
                  </figure>
                )}
                {c.resolutionUrl && (
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.resolutionUrl} alt="Worker's resolution photo" className="max-h-72 w-full rounded-lg border border-slate-200 object-cover" />
                    <figcaption className="mt-1 text-xs text-slate-500">After — worker&apos;s resolution evidence</figcaption>
                  </figure>
                )}
              </div>
            </Card>
          )}

          {/* AI verification verdict */}
          {c.verified != null && (
            <Card className={`p-4 ${c.verified ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50"}`}>
              <h3 className={`text-sm font-semibold ${c.verified ? "text-emerald-800" : "text-orange-800"}`}>
                {c.verified ? "✓ AI verified this resolution" : "↺ AI did not verify — complaint was reopened"}
              </h3>
              <p className="mt-1 text-sm text-slate-700">{c.verificationReason}</p>
              {c.verificationConfidence != null && (
                <p className="mt-1 text-xs text-slate-500">Confidence {(c.verificationConfidence * 100).toFixed(0)}% · verified at {fmtDateTime(c.verifiedAt)}</p>
              )}
            </Card>
          )}

          {/* Escalations */}
          {c.escalations.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-800">Escalation history</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {c.escalations.map((e) => (
                  <li key={e.id} className="flex flex-wrap gap-2">
                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">L{e.level}</span>
                    <span className="text-slate-700">{e.reason}</span>
                    <span className="text-xs text-slate-400">{fmtDateTime(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <AgentActivityPanel activities={c.agentActivities} />

          {/* Timeline */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-800">Case timeline</h3>
            <ol className="mt-3 space-y-2.5">
              {c.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-civic-600" aria-hidden />
                  <div>
                    <p className="font-medium text-slate-800">{e.title}</p>
                    {e.detail && <p className="text-slate-500">{e.detail}</p>}
                    <p className="text-xs text-slate-400">{fmtDateTime(e.createdAt)} · {e.actor}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="truncate font-medium text-slate-800" title={value}>{value}</dd>
    </div>
  );
}
