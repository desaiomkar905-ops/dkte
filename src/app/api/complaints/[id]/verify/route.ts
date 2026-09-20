import { NextResponse } from "next/server";
import { requireUser, ApiError } from "@/lib/auth";
import { handleRouteError, jsonError, rateLimit, clientKey } from "@/lib/api";
import { prisma } from "@/lib/db";
import { validateImage, saveImage, publicUrlForKey } from "@/lib/storage";
import { verifyResolution, notifyCitizen, escalateComplaint } from "@/lib/agent/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/complaints/:id/verify — worker submits "after" evidence.
 * The AI never blindly accepts a worker's claim: it inspects the image and
 * returns a structured verdict { verified, confidence, reason } which decides
 * RESOLVED vs REOPENED (and possibly ESCALATED).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    if (!rateLimit(clientKey(req, "verify"), 12, 5 * 60_000)) {
      return jsonError(429, "Too many verification submissions. Please wait.");
    }

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) return jsonError(404, "Complaint not found");
    if (complaint.assignedToId !== user.id && user.role !== "OFFICIAL") {
      throw new ApiError(403, "Only the assigned worker can submit resolution evidence");
    }
    if (!["IN_PROGRESS", "ASSIGNED", "REOPENED", "VERIFICATION"].includes(complaint.status)) {
      return jsonError(409, `Cannot submit evidence while status is ${complaint.status}`);
    }

    const form = await req.formData();
    const afterFile = form.get("afterImage");
    const note = (form.get("note") as string) || undefined;
    if (!(afterFile instanceof File) || afterFile.size === 0) {
      return jsonError(400, "A resolution photo is required");
    }
    const v = validateImage(afterFile);
    if (!v.ok) throw new ApiError(400, v.error);

    const resolutionKey = await saveImage(afterFile, "resolution");
    await prisma.complaint.update({
      where: { id },
      data: { status: "VERIFICATION", submittedAt: new Date(), resolutionKey },
    });
    await prisma.timelineEvent.create({
      data: {
        complaintId: id, type: "EVIDENCE", actor: `worker:${user.name}`,
        title: "Resolution evidence submitted",
        detail: note ? `Worker note: ${note}` : "After-resolution photo uploaded for AI verification",
      },
    });

    // Load before-image for comparison if available.
    let beforeImage: Buffer | null = null;
    if (complaint.photoKey) {
      try {
        const { readFile } = await import("fs/promises");
        const path = await import("path");
        beforeImage = await readFile(path.join(process.cwd(), "storage", "uploads", complaint.photoKey));
      } catch {
        beforeImage = null;
      }
    }

    const runId = `verify_${Date.now().toString(36)}`;
    const logA = (agent: string, action: string, summary: string, detail?: unknown) =>
      prisma.agentActivity.create({ data: { complaintId: id, runId, agent, action, summary, detail: detail ? JSON.stringify(detail) : null } });

    await logA("VerificationAgent", "verify_resolution:start", `Analyzing after-resolution image for ${complaint.refCode}`, {
      providerHint: process.env.YOLO_SERVICE_URL ? "yolo-service" : "dev:heuristic",
    });

    const verdict = await verifyResolution({
      category: complaint.category,
      originalDescription: complaint.description,
      beforeImage,
      beforeMime: null,
      afterImage: Buffer.from(await afterFile.arrayBuffer()),
      afterMime: afterFile.type,
    });

    await logA("VerificationAgent", verdict.verified ? "verify_resolution:pass" : "verify_resolution:fail",
      verdict.verified
        ? `Resolution verified (${(verdict.confidence * 100).toFixed(0)}% confidence) — ${verdict.reason}`
        : `Verification FAILED (${(verdict.confidence * 100).toFixed(0)}% confidence) — ${verdict.reason}`,
      { provider: verdict.provider, confidence: verdict.confidence, reason: verdict.reason }
    );

    if (verdict.verified) {
      const updated = await prisma.complaint.update({
        where: { id },
        data: {
          status: "RESOLVED",
          verified: true,
          verificationConfidence: verdict.confidence,
          verificationReason: verdict.reason,
          verificationProvider: verdict.provider,
          verifiedAt: new Date(),
          resolvedAt: new Date(),
          isOverdue: false,
        },
      });
      await prisma.timelineEvent.create({
        data: {
          complaintId: id, type: "VERIFICATION", actor: `agent:VerificationAgent`,
          title: `AI verified resolution — marked RESOLVED`,
          detail: `${verdict.reason} (provider ${verdict.provider}, confidence ${(verdict.confidence * 100).toFixed(0)}%)`,
        },
      });
      // Reward the citizen for a verified, genuine report (karma system, P2 but cheap here).
      await prisma.user.update({ where: { id: complaint.reporterId }, data: { karma: { increment: 10 } } });
      await notifyCitizen(id, `Complaint ${complaint.refCode} RESOLVED`, "AI verified the repair. Thank you for reporting!");
      await logA("DispatchAgent", "notify_citizen", `Citizen notified: ${complaint.refCode} resolved`);
      return NextResponse.json({
        verdict,
        status: updated.status,
        resolutionUrl: publicUrlForKey(resolutionKey),
      });
    }

    // Not verified → REOPENED, and escalate if repeated failures or high severity.
    let status = "REOPENED";
    const reopenedCount = complaint.reopenedCount + 1;
    await prisma.complaint.update({
      where: { id },
      data: {
        status: "REOPENED",
        verified: false,
        verificationConfidence: verdict.confidence,
        verificationReason: verdict.reason,
        verificationProvider: verdict.provider,
        reopenedCount,
      },
    });
    await prisma.timelineEvent.create({
      data: {
        complaintId: id, type: "VERIFICATION", actor: "agent:VerificationAgent",
        title: `AI could NOT verify resolution — complaint REOPENED`,
        detail: verdict.reason,
      },
    });
    await notifyCitizen(id, `Complaint ${complaint.refCode} reopened`, "Our AI could not confirm the repair. The case was reopened for another attempt.");

    if (reopenedCount >= 2 || ["CRITICAL", "HIGH"].includes(complaint.severity)) {
      const esc = await escalateComplaint(id, "AI verification failed — escalating for supervisory review");
      status = esc.status;
      await prisma.timelineEvent.create({
        data: { complaintId: id, type: "ESCALATION", actor: "agent:VerificationAgent", title: `Escalated (level ${esc.escalationCount})`, detail: "Repeated verification failure" },
      });
      await logA("SLAAgent", "escalate_complaint", `${complaint.refCode} escalated to level ${esc.escalationCount}`);
    }

    return NextResponse.json({ verdict, status, resolutionUrl: publicUrlForKey(resolutionKey) });
  } catch (err) {
    return handleRouteError(err);
  }
}
