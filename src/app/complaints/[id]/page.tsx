"use client";

import { use, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, StatusBadge, SeverityBadge, CategoryTag, DemoBadge, Skeleton, LoginPrompt, ErrorNote } from "@/components/ui";
import { AgentActivityPanel, type Activity } from "@/components/AgentActivityPanel";
import { api, fetchMe, fmtDateTime, type SessionUser } from "@/lib/client";

type ComplaintDetail = {
  id: string; refCode: string; title: string; description: string; category: string; severity: string;
  priority: number; status: string; source: string; lat: number; lng: number; address: string | null;
  ward: string | null; language: string; transcript: string | null; aiConfidence: number | null; aiSummary: string | null;
  photoUrl: string | null; resolutionUrl: string | null; slaHours: number | null; slaDueAt: string | null;
  isOverdue: boolean; verified: boolean | null; verificationConfidence: number | null; verificationReason: string | null; verificationProvider: string | null;
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
      {error && <div className="mx-auto max-w-3xl"><ErrorNote message={error} /></div>}
      {!c && !error && (
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-40" />
        </div>
      )}
      {c && (
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Header card */}
          <Card className="cs-fade-up p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-cs-muted">{c.refCode}</span>
              <StatusBadge status={c.status} pulse={["IN_PROGRESS", "VERIFICATION"].includes(c.status)} />
              <SeverityBadge severity={c.severity} />
              <CategoryTag category={c.category} />
              {c.source === "DEMO" && <DemoBadge />}
              {c.isOverdue && <span className="cs-badge border-rose-400/40 bg-rose-500/15 text-rose-300">OVERDUE</span>}
            </div>
            <h1 className="mt-2.5 text-xl font-semibold tracking-tight sm:text-2xl">{c.title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-cs-muted">{c.description}</p>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-3">
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
              <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                ⛓ Potentially related complaint: <strong>{c.duplicateOf.refCode}</strong>
              </p>
            )}
            {c.duplicates.length > 0 && (
              <p className="mt-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                Later reports linked to this case: {c.duplicates.map((d) => d.refCode).join(", ")}
              </p>
            )}
          </Card>

          {/* Evidence — before/after */}
          {(c.photoUrl || c.resolutionUrl) && (
            <Card className="cs-fade-up p-4">
              <h3 className="text-sm font-semibold">Evidence</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {c.photoUrl && (
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.photoUrl} alt="Citizen's original photo of the issue" className="max-h-72 w-full rounded-xl border border-cs-border object-cover" />
                    <figcaption className="mt-1.5 text-xs text-cs-muted">Before — citizen&apos;s photo</figcaption>
                  </figure>
                )}
                {c.resolutionUrl && (
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.resolutionUrl} alt="Worker's resolution photo" className="max-h-72 w-full rounded-xl border border-cs-border object-cover" />
                    <figcaption className="mt-1.5 text-xs text-cs-muted">After — worker&apos;s resolution evidence</figcaption>
                  </figure>
                )}
              </div>
            </Card>
          )}

          {/* AI verification verdict */}
          {c.verified != null && (
            <Card className={`cs-fade-up p-4 ${c.verified ? "border-emerald-400/30 bg-emerald-500/10" : "border-orange-400/30 bg-orange-500/10"}`}>
              <h3 className={`text-sm font-semibold ${c.verified ? "text-emerald-300" : "text-orange-300"}`}>
                {c.verified ? "✓ RESOLUTION VERIFIED by AI" : "↺ RESOLUTION NOT VERIFIED — complaint reopened"}
              </h3>
              <p className="mt-1 text-sm text-cs-text">{c.verificationReason}</p>
              <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-cs-muted">
                <span>Confidence: <strong className="text-cs-text">{c.verificationConfidence != null ? `${(c.verificationConfidence * 100).toFixed(0)}%` : "—"}</strong></span>
                {c.verificationProvider && (
                  <span>AI Provider: <strong className="text-cs-text">{c.verificationProvider}</strong>
                    {c.verificationProvider.startsWith("dev") && <span className="ml-1 text-amber-300">(labeled development provider)</span>}
                  </span>
                )}
                <span>at {fmtDateTime(c.verifiedAt)}</span>
              </p>
              {!c.verified && (
                <p className="mt-1 text-xs text-orange-300/90">
                  The worker&apos;s claim alone cannot close a case — the issue was reopened and, for high-severity or repeated failures, escalated.
                </p>
              )}
            </Card>
          )}

          {/* Escalations */}
          {c.escalations.length > 0 && (
            <Card className="cs-fade-up p-4">
              <h3 className="text-sm font-semibold">Escalation history</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {c.escalations.map((e) => (
                  <li key={e.id} className="flex flex-wrap gap-2">
                    <span className="cs-badge border-rose-400/30 bg-rose-500/10 text-rose-300">L{e.level}</span>
                    <span className="text-cs-text">{e.reason}</span>
                    <span className="text-xs text-cs-muted">{fmtDateTime(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <AgentActivityPanel activities={c.agentActivities} />

          {/* Timeline */}
          <Card className="cs-fade-up p-4">
            <h3 className="text-sm font-semibold">Case timeline</h3>
            <ol className="relative mt-3 space-y-3 pl-1">
              <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-gradient-to-b from-sky-400/40 via-cs-border to-transparent" />
              {c.events.map((e) => (
                <li key={e.id} className="relative flex gap-3 pl-1 text-sm">
                  <span aria-hidden className="z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-cs-bg bg-sky-400" />
                  <div className="min-w-0">
                    <p className="font-medium">{e.title}</p>
                    {e.detail && <p className="text-cs-muted">{e.detail}</p>}
                    <p className="text-xs text-cs-muted/80">{fmtDateTime(e.createdAt)} · {e.actor}</p>
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
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cs-muted">{label}</dt>
      <dd className="truncate font-medium text-cs-text" title={value}>{value}</dd>
    </div>
  );
}
