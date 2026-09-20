import type { ResolutionVerifier, ResolutionVerdict } from "./types";

/**
 * YOLO-based resolution verifier — production path.
 * Sends BEFORE and AFTER images to the vision service's /verify endpoint,
 * which runs detection on both and compares evidence for the reported issue
 * category. Falls back to the labeled dev verifier when unavailable.
 */
export class YoloResolutionVerifier implements ResolutionVerifier {
  readonly id = "yolo-service";

  constructor(private baseUrl: string) {}

  async verify(input: {
    category: string;
    originalDescription: string;
    beforeImage: Buffer | null;
    beforeMime: string | null;
    afterImage: Buffer;
    afterMime: string;
  }): Promise<ResolutionVerdict> {
    const form = new FormData();
    form.append(
      "after",
      new Blob([new Uint8Array(input.afterImage)], { type: input.afterMime }),
      "after.jpg"
    );
    if (input.beforeImage && input.beforeMime) {
      form.append("before", new Blob([new Uint8Array(input.beforeImage)], { type: input.beforeMime }), "before.jpg");
    }
    form.append("category", input.category);

    const res = await fetch(`${this.baseUrl}/verify`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`YOLO verify responded ${res.status}`);
    const data = (await res.json()) as { verified: boolean; confidence: number; reason: string };
    return {
      verified: Boolean(data.verified),
      confidence: Number(data.confidence ?? 0.5),
      reason: String(data.reason ?? "model verification"),
      provider: this.id,
    };
  }
}
