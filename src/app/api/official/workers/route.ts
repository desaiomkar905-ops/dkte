import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleRouteError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** GET /api/official/workers — worker list for assignment (officials only). */
export async function GET(req: Request) {
  try {
    await requireRole(req, "OFFICIAL");
    const users = await prisma.user.findMany({
      where: { role: "WORKER" },
      select: { id: true, name: true, departmentId: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch (err) {
    return handleRouteError(err);
  }
}
