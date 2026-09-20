import { prisma } from "../db";
import { categoryLabels } from "../constants";
import { severityLabels } from "../constants";
import {
  analyzeImage,
  classifyIssue,
  calculateSeverity,
  calculatePriority,
  findNearbyComplaints,
  detectDuplicate,
  findDepartment,
  createComplaint,
  notifyCitizen,
} from "./tools";
import type { VisionResult, LLMResult } from "../ai/types";

/**
 * Agent Orchestrator.
 * Runs a tool-using agentic pipeline over a new complaint report:
 *
 *   VisionAgent → TriageAgent → DuplicateAgent → RoutingAgent → DispatchAgent
 *
 * The orchestrator decides which tools to invoke based on what the report
 * contains (photo? voice transcript? coordinates?), and persists a concise
 * decision log for every step — the Agent Activity panel is generated from
 * this table, never from hidden chain-of-thought.
 */

export type OrchestrationInput = {
  description: string;
  categoryHint?: string; // citizen's own guess (optional)
  lat: number;
  lng: number;
  address?: string;
  ward?: string;
  language: string;
  transcript?: string;
  photo?: { buffer: Buffer; mime: string; key?: string; demoHint?: string } | null;
  reporterId: string;
  source?: string;
};

export type OrchestrationResult = {
  complaintId: string;
  refCode: string;
  category: string;
  severity: string;
  priority: number;
  departmentCode: string;
  duplicateOfRef?: string;
  agentRunId: string;
};

const AGENTS = {
  vision: "VisionAgent",
  triage: "TriageAgent",
  duplicate: "DuplicateAgent",
  routing: "RoutingAgent",
  dispatch: "DispatchAgent",
} as const;

export async function orchestrateNewComplaint(input: OrchestrationInput): Promise<OrchestrationResult> {
  const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const log = (agent: string, action: string, summary: string, detail?: unknown, complaintId?: string) =>
    prisma.agentActivity.create({
      data: {
        runId,
        agent,
        action,
        summary,
        detail: detail ? JSON.stringify(detail) : null,
        complaintId: complaintId ?? null,
      },
    });

  // ---- 1. Vision analysis (only when a photo is attached) ------------------
  let vision: VisionResult | null = null;
  if (input.photo) {
    vision = await analyzeImage(input.photo.buffer, input.photo.mime, input.photo.demoHint);
    const det = vision.detections[0];
    const modelNote = vision.model ? `, model ${vision.model}` : "";
    await log(
      AGENTS.vision,
      "analyze_image",
      det
        ? `${det.label} detected (${(det.confidence * 100).toFixed(0)}% confidence, provider ${vision.provider}${modelNote})`
        : `No known civic issue detected (provider ${vision.provider}${modelNote})`,
      { provider: vision.provider, model: vision.model, detections: vision.detections, note: vision.note }
    );
  }

  // ---- 2. LLM triage: structured classification ----------------------------
  const llm: LLMResult = await classifyIssue({
    description: input.description,
    visionCategory: vision?.category ?? null,
    visionConfidence: vision?.confidence ?? null,
    language: input.language,
  });
  await log(AGENTS.triage, "classify_issue", `Classified as ${categoryLabels[llm.category]} via ${llm.provider}`, {
    provider: llm.provider,
    category: llm.category,
    summary: llm.summary,
    reasoning: llm.reasoning,
  });

  // Category resolution: citizen hint > vision > LLM.
  const category = input.categoryHint ?? vision?.category ?? llm.category;

  // ---- 3. Severity & priority (explainable engine) --------------------------
  const sev = calculateSeverity(category, input.description, vision?.confidence ?? null);
  await log(AGENTS.triage, "calculate_severity", `Severity ${severityLabels[sev.severity]} (score ${sev.score.toFixed(1)}/10)`, {
    factors: sev.factors,
    reasons: sev.reasons,
  });

  // ---- 4. Duplicate intelligence -------------------------------------------
  const nearby = await findNearbyComplaints(input.lat, input.lng, category);
  const dup = detectDuplicate(
    { category, description: input.description, lat: input.lat, lng: input.lng, createdAt: new Date() },
    nearby
  );
  await log(
    AGENTS.duplicate,
    dup ? "detect_duplicate:match" : "detect_duplicate:none",
    dup
      ? `Potentially related complaint ${dup.candidate.refCode} — ${dup.distanceM}m away, similarity ${(dup.textSimilarity * 100).toFixed(0)}%`
      : `No related complaint within ${nearby.length ? "150m" : "range"} — creating new case`,
    dup ? { match: { refCode: dup.candidate.refCode, distanceM: dup.distanceM, score: dup.score, reasons: dup.reasons } } : { candidatesChecked: nearby.length }
  );

  // ---- 5. Department routing ------------------------------------------------
  const dept = findDepartment(category);
  await log(AGENTS.routing, "find_department", `Routed to ${dept.name}`, { code: dept.code, reason: dept.reason });

  // ---- 6. Priority (after duplicate context) --------------------------------
  const prio = calculatePriority(sev.severity, { nearbyReports: nearby.length, description: input.description });
  await log(AGENTS.triage, "calculate_priority", `Priority ${prio.priority}/100`, { reasons: prio.reasons });

  // ---- 7. Create the complaint ----------------------------------------------
  const seq = await prisma.complaint.count() + 1;
  const refCode = `CS-${new Date().getFullYear()}-${String(seq).padStart(6, "0")}`;
  const complaint = await createComplaint({
    refCode,
    title: llm.summary.slice(0, 80) || categoryLabels[category],
    description: input.description,
    category,
    severity: sev.severity,
    priority: prio.priority,
    lat: input.lat,
    lng: input.lng,
    address: input.address,
    ward: input.ward,
    language: input.language,
    transcript: input.transcript,
    originalText: input.description,
    photoKey: input.photo?.key,
    departmentCode: dept.code,
    reporterId: input.reporterId,
    aiConfidence: vision?.confidence ?? null,
    aiSummary: llm.summary,
    duplicateOfId: dup?.candidate.id ?? null,
    source: input.source,
  });

  // Note: the API route pre-saves uploads and passes their storage key via photo.key.

  await log(AGENTS.dispatch, "create_complaint", `Complaint ${refCode} created`, { refCode, category, severity: sev.severity, priority: prio.priority }, complaint.id);

  // Link every decision from this run to the complaint so the Agent Activity
  // panel shows the full pipeline (Vision → Triage → Duplicate → Routing).
  await prisma.agentActivity.updateMany({ where: { runId }, data: { complaintId: complaint.id } });

  await prisma.timelineEvent.create({
    data: {
      complaintId: complaint.id,
      type: "CREATED",
      actor: "agent:orchestrator",
      title: `Complaint received via ${input.source === "DEMO" ? "demo seed" : "citizen report"}`,
      detail: `Category ${categoryLabels[category]}, severity ${severityLabels[sev.severity]}, routed to ${dept.name}`,
    },
  });

  if (dup) {
    await prisma.timelineEvent.create({
      data: {
        complaintId: complaint.id,
        type: "STATUS",
        actor: "agent:DuplicateAgent",
        title: `Linked to potentially related complaint ${dup.candidate.refCode}`,
        // Full explainability: existing case, distance, category, recency, text similarity.
        detail: dup.reasons.join(" · ") + ` · match score ${dup.score}`,
      },
    });
  }

  // ---- 8. Citizen notification ----------------------------------------------
  await notifyCitizen(complaint.id, `Complaint ${refCode} registered`, `Routed to ${dept.name}. SLA: ${sev.severity === "CRITICAL" ? 12 : sev.severity === "HIGH" ? 24 : sev.severity === "MEDIUM" ? 48 : 72}h`);
  await log(AGENTS.dispatch, "notify_citizen", `Citizen notified for ${refCode}`, undefined, complaint.id);

  return {
    complaintId: complaint.id,
    refCode,
    category,
    severity: sev.severity,
    priority: prio.priority,
    departmentCode: dept.code,
    duplicateOfRef: dup?.candidate.refCode,
    agentRunId: runId,
  };
}

/** Re-run severity/SLA for existing complaints (used by SLA sweep + tests). */
export async function markOverdueComplaints() {
  const { checkSla } = await import("./tools");
  return checkSla();
}
