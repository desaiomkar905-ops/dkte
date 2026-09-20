import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * File storage abstraction.
 * - LOCAL (default): files under ./storage/uploads, served via /api/files/[key]
 * - S3: swap in an S3Put adapter and serve via presigned URLs (interface unchanged)
 */

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? 8);

export function validateImage(file: File): { ok: true; ext: string } | { ok: false; error: string } {
  if (!file || typeof file.arrayBuffer !== "function") return { ok: false, error: "No file provided" };
  if (file.size === 0) return { ok: false, error: "Empty file" };
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
    return { ok: false, error: `File exceeds ${MAX_UPLOAD_MB}MB limit` };
  const ext = ALLOWED_MIME[file.type];
  if (!ext) return { ok: false, error: "Only JPEG, PNG, WebP or HEIC images are allowed" };
  return { ok: true, ext };
}

/** Stores an already-validated image; returns a stable storage key. */
export async function saveImage(file: File, kind: "report" | "resolution"): Promise<string> {
  const ext = ALLOWED_MIME[file.type];
  const key = `${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
  const dest = path.join(process.cwd(), "storage", "uploads", key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return key;
}

export function publicUrlForKey(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/files/${key}`;
}
