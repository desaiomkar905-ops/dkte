import type { VisionProvider, VisionResult } from "./types";

/**
 * YOLOv8 vision provider — production path.
 * Talks to the optional Python microservice in /vision-service (FastAPI +
 * ultralytics). POST /detect with multipart image → JSON detections.
 * If the service is not configured/unreachable, callers fall back to the
 * clearly-labeled dev provider — never to a silent fake.
 */
export class YoloVisionProvider implements VisionProvider {
  readonly id = "yolo-service";

  constructor(private baseUrl: string) {}

  async detect(image: Buffer, mime: string): Promise<VisionResult> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(image)], { type: mime }), "upload.jpg");
    const res = await fetch(`${this.baseUrl}/detect`, { method: "POST", body: form, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`YOLO service responded ${res.status}`);
    const data = (await res.json()) as {
      detections: Array<{ label: string; confidence: number; bbox?: [number, number, number, number] }>;
    };
    const detections = (data.detections ?? []).filter((d) => d.confidence >= 0.25);
    const top = detections[0] ?? null;
    return {
      provider: this.id,
      detections,
      category: top ? mapYoloLabel(top.label) : null,
      confidence: top?.confidence ?? 0,
      note: detections.length ? undefined : "Model ran but found no known civic issue",
    };
  }
}

/** Maps YOLO class names to our civic categories. Extend as the model grows. */
function mapYoloLabel(label: string): string | null {
  const l = label.toLowerCase();
  if (l.includes("pothole")) return "POTHOLE";
  if (l.includes("garbage") || l.includes("trash") || l.includes("waste")) return "GARBAGE";
  if (l.includes("water") || l.includes("flood") || l.includes("logging")) return "WATERLOGGING";
  if (l.includes("streetlight") || l.includes("street_light") || l.includes("lamp")) return "STREETLIGHT";
  if (l.includes("road") || l.includes("crack")) return "ROAD_DAMAGE";
  return "OTHER";
}
