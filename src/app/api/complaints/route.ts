import { NextResponse } from "next/server";
import { requireUser, ApiError } from "@/lib/auth";
import { handleRouteError, jsonError, rateLimit, clientKey } from "@/lib/api";
import { complaintInput, CATEGORIES, STATUSES, SEVERITIES, DEPARTMENT_CODES } from "@/lib/constants";
import { validateImage, saveImage } from "@/lib/storage";
import { orchestrateNewComplaint } from "@/lib/agent/orchestrator";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/complaints — citizen submits a complaint (multipart). */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!rateLimit(clientKey(req, "complaint-create"), 6, 5 * 60_000)) {
      return jsonError(429, "Submission rate limit reached. Please wait a few minutes.");
    }

    const form = await req.formData();
    const raw = {
      description: String(form.get("description") ?? ""),
      category: (form.get("categoryHint") as string) || undefined,
      lat: Number(form.get("lat")),
      lng: Number(form.get("lng")),
      address: (form.get("address") as string) || undefined,
      ward: (form.get("ward") as string) || undefined,
      language: (form.get("language") as string) || "en",
      transcript: (form.get("transcript") as string) || undefined,
      source: (form.get("source") as string) || "CITIZEN",
    };
    const input = complaintInput.parse(raw);

    // File validation (type + size), then persist via storage abstraction.
    let photo: { buffer: Buffer; mime: string; key?: string; demoHint?: string } | null = null;
    const photoFile = form.get("photo");
    if (photoFile instanceof File && photoFile.size > 0) {
      const v = validateImage(photoFile);
      if (!v.ok) throw new ApiError(400, v.error);
      const key = await saveImage(photoFile, "report");
      photo = {
        buffer: Buffer.from(await photoFile.arrayBuffer()),
        mime: photoFile.type,
        key,
        demoHint: (form.get("demoHint") as string) || undefined,
      };
    }

    const result = await orchestrateNewComplaint({
      description: input.description,
      categoryHint: input.category && CATEGORIES.includes(input.category as (typeof CATEGORIES)[number]) ? input.category : undefined,
      lat: input.lat,
      lng: input.lng,
      address: input.address,
      ward: input.ward,
      language: input.language,
      transcript: input.transcript,
      photo,
      reporterId: user.id,
      source: input.source,
    });

    return NextResponse.json({ complaint: result }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** GET /api/complaints — filtered, role-scoped list. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? (user.role === "WORKER" ? "assigned" : user.role === "OFFICIAL" ? "all" : "mine");
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const severity = url.searchParams.get("severity");
    const department = url.searchParams.get("department");
    const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 100));

    const where: Record<string, unknown> = {};
    if (scope === "mine") where.reporterId = user.id;
    else if (scope === "assigned") where.assignedToId = user.id;
    else if (user.role !== "OFFICIAL") throw new ApiError(403, "Citizens can only view their own complaints");
    // officials with scope=all see everything

    if (status && STATUSES.includes(status as (typeof STATUSES)[number])) where.status = status;
    if (category && CATEGORIES.includes(category as (typeof CATEGORIES)[number])) where.category = category;
    if (severity && SEVERITIES.includes(severity as (typeof SEVERITIES)[number])) where.severity = severity;
    if (department && DEPARTMENT_CODES.includes(department as (typeof DEPARTMENT_CODES)[number])) {
      const dept = await prisma.department.findUnique({ where: { code: department } });
      where.departmentId = dept?.id ?? "none";
    }

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true, refCode: true, title: true, category: true, severity: true, priority: true,
        status: true, lat: true, lng: true, address: true, ward: true, createdAt: true,
        slaDueAt: true, isOverdue: true, escalationCount: true, source: true,
        department: { select: { code: true, name: true } },
        reporter: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
        duplicateOf: { select: { refCode: true } },
        photoKey: true,
      },
    });

    return NextResponse.json({ complaints });
  } catch (err) {
    return handleRouteError(err);
  }
}
