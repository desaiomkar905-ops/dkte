import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic",
};

/** GET /api/files/:key — authenticated image serving from the local storage driver. */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    await requireUser(req); // images require a session
    const { key } = await params;
    const joined = key.join("/");
    if (joined.includes("..") || !/^[a-z]+\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\.(jpg|png|webp|heic)$/i.test(joined)) {
      return jsonError(400, "Invalid file key");
    }
    const filePath = path.join(process.cwd(), "storage", "uploads", joined);
    const data = await readFile(filePath);
    const ext = joined.split(".").pop()?.toLowerCase() ?? "jpg";
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
