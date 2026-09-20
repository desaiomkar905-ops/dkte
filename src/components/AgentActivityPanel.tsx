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
 * (server-side decisions), never from client-side theater. Each entry shows
 * the agent, the tool action, a concise result, the timestamp, and — where a
 * model was involved — which provider produced it. Decision *factors* are
 * shown as bullets; hidden chain-of-thought is never displayed because none
 * is stored.
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
            <li key={a.id} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200"
              >
                ✓
              </span>
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

type ActivityDetail = {
  reasons?: string[];
  reasoning?: string[];
  provider?: string;
  model?: string;
  note?: string;
  match?: { reasons?: string[] };
};

function Reasons({ detail }: { detail: string }) {
  let parsed: ActivityDetail | null = null;
  try {
    parsed = JSON.parse(detail) as ActivityDetail;
  } catch {
    return null;
  }
  const provider = parsed?.provider;
  const model = parsed?.model;
  const note = parsed?.note;
  const reasons = parsed?.reasons ?? parsed?.reasoning ?? parsed?.match?.reasons;
  const showProvider = provider ? true : false;

  if (!showProvider && !note && !reasons?.length) return null;

  return (
    <div className="mt-1">
      {showProvider && <ProviderChip provider={provider as string} model={model} />}
      {note && <p className="text-xs italic text-slate-400">{note}</p>}
      {reasons && reasons.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500">
          {reasons.map((r: string, i: number) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProviderChip({ provider, model }: { provider: string; model?: string }) {
  const isDev = provider.startsWith("dev");
  const realYolo = provider === "yolo-service";
  return (
    <span
      title={
        isDev
          ? "Labeled development provider — not a real model inference"
          : realYolo
            ? `Real YOLOv8 model inference via the vision service${model ? ` (${model})` : ""}`
            : "Production AI provider"
      }
      className={`mr-2 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${
        isDev ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
      }`}
    >
      {realYolo
        ? `REAL YOLO MODEL${model ? ` · ${model}` : ""}`
        : `AI Provider: ${provider}${isDev ? " (dev)" : ""}`}
    </span>
  );
}
