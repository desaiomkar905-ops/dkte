"use client";

import { Card } from "./ui";
import { fmtDateTime } from "@/lib/client";

export type Activity = {
  id: string;
  agent: string;
  action: string;
  summary: string;
  detail: string | null;
  createdAt: string;
  complaint?: { refCode: string } | null;
};

const AGENT_TONE: Record<string, string> = {
  VisionAgent: "bg-civic-50 text-civic-700 ring-civic-100",
  TriageAgent: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  DuplicateAgent: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  RoutingAgent: "bg-teal-50 text-teal-700 ring-teal-100",
  DispatchAgent: "bg-sky-50 text-sky-700 ring-sky-100",
  VerificationAgent: "bg-amber-50 text-amber-700 ring-amber-100",
  SLAAgent: "bg-rose-50 text-rose-700 ring-rose-100",
};

/**
 * Agent Activity panel — generated from the persisted AgentActivity table
 * (server-side decisions), not from client-side theater.
 */
export function AgentActivityPanel({ activities, title = "Agent Activity" }: { activities: Activity[]; title?: string }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {activities.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No agent activity yet.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {activities.map((a) => (
            <li key={a.id} className="flex gap-3">
              <div className="mt-1 h-full w-px shrink-0 bg-slate-200" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ring-1 ${AGENT_TONE[a.agent] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                    {a.agent}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{a.action}</span>
                  {a.complaint?.refCode && <span className="text-xs text-slate-400">{a.complaint.refCode}</span>}
                  <span className="ml-auto text-xs text-slate-400">{fmtDateTime(a.createdAt)}</span>
                </div>
                <p className="mt-1 break-words text-sm text-slate-700">{a.summary}</p>
                {a.detail && <Reasons detail={a.detail} />}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function Reasons({ detail }: { detail: string }) {
  let reasons: string[] | undefined;
  try {
    const parsed = JSON.parse(detail) as { reasons?: string[]; reasoning?: string[] };
    reasons = parsed.reasons ?? parsed.reasoning;
  } catch {
    return null;
  }
  if (!reasons?.length) return null;
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-500">
      {reasons.map((r, i) => (
        <li key={i}>{r}</li>
      ))}
    </ul>
  );
}
