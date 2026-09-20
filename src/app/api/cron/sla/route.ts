import { NextResponse } from "next/server";
import { checkSla } from "@/lib/agent/tools";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";

/**
 * GET/POST /api/cron/sla — scheduled SLA sweep (e.g. Vercel Cron / EventBridge).
 * Auth: `x-cron-secret` header matching CRON_SECRET, or an OFFICIAL session.
 */
async function run(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  const okBySecret = process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
  if (!okBySecret) {
    const { requireRole } = await import("@/lib/auth");
    try {
      await requireRole(req, "OFFICIAL");
    } catch {
      return jsonError(401, "Unauthorized SLA sweep");
    }
  }
  const results = await checkSla();
  return NextResponse.json({ sweptAt: new Date().toISOString(), checked: results.length, results });
}

export const GET = run;
export const POST = run;
