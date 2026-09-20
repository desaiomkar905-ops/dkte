import { NextResponse } from "next/server";
import { ApiError } from "./auth";
import { ZodError } from "zod";

/** Uniform JSON error handling for all route handlers. */
export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleRouteError(err: unknown) {
  if (err instanceof ApiError) return jsonError(err.status, err.message);
  if (err instanceof ZodError) {
    return jsonError(400, "Validation failed", {
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  console.error("[api] unexpected error:", err);
  return jsonError(500, "Internal server error");
}

/**
 * Simple in-memory sliding-window rate limiter.
 * Good enough for a single-node demo; a production deployment would use
 * a shared store (e.g. Redis). Documented in ARCHITECTURE.md.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) return false;
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

export function clientKey(req: Request, scope: string) {
  const fwd = req.headers.get("x-forwarded-for") ?? "local";
  return `${scope}:${fwd.split(",")[0].trim()}`;
}
