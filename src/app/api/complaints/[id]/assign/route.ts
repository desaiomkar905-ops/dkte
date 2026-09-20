import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assignWorker } from "@/lib/agent/tools";

export const runtime = "nodejs";

const bodySchema = z.object({ workerId: z.string().min(5).max(60) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const official = await requireRole(req, "OFFICIAL");
    const { id } = await params;
    const { workerId } = bodySchema.parse(await req.json());

    const complaint = await prisma.complaint.findUnique({ where: { id }, include: { department: true } });
    if (!complaint) return jsonError(404, "Complaint not found");
    if (complaint.status === "RESOLVED" || complaint.status === "CLOSED") {
      return jsonError(409, `Complaint is already ${complaint.status.toLowerCase()}`);
    }

    const updated = await assignWorker(id, workerId);
    await prisma.timelineEvent.create({
      data: {
        complaintId: id, type: "ASSIGNMENT", actor: `official:${official.name}`,
        title: "Field worker assigned",
        detail: `Assigned to ${updated.assignedTo?.name ?? "worker"}${complaint.department ? ` (${complaint.department.name})` : ""}`,
      },
    });
    await prisma.agentActivity.create({
      data: {
        complaintId: id, agent: "DispatchAgent", action: "assign_worker",
        summary: `Worker ${updated.assignedTo?.name ?? workerId} assigned to ${complaint.refCode}`,
      },
    });

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (err) {
    return handleRouteError(err);
  }
}
