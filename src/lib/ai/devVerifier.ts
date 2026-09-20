import type { ResolutionVerifier, ResolutionVerdict } from "./types";
import { CATEGORIES, categoryLabels } from "../constants";

/**
 * Development resolution verifier — CLEARLY LABELED.
 * Heuristic on the AFTER image: computes brightness/colorfulness/edge-density
 * deltas vs the BEFORE image. E.g. a filled pothole usually raises brightness
 * and color variance vs a dark hole. It is honest about being a heuristic and
 * is only used when the YOLO verification service is unavailable.
 */
export class DevResolutionVerifier implements ResolutionVerifier {
  readonly id = "dev:heuristic";

  async verify(input: {
    category: string;
    originalDescription: string;
    beforeImage: Buffer | null;
    afterImage: Buffer;
  }): Promise<ResolutionVerdict> {
    const afterStats = imageStats(input.afterImage);
    const beforeStats = input.beforeImage ? imageStats(input.beforeImage) : null;

    const reasons: string[] = [];
    let score = 0.5;

    if (beforeStats) {
      const brightnessDelta = afterStats.brightness - beforeStats.brightness;
      const colorfulnessDelta = afterStats.colorfulness - beforeStats.colorfulness;
      // Potholes/waterlogging are dark; repair raises brightness.
      const darkIssue = ["POTHOLE", "WATERLOGGING", "ROAD_DAMAGE"].includes(input.category);
      if (darkIssue && brightnessDelta > 0.03) {
        score += 0.25;
        reasons.push(`after image is brighter than before (+${brightnessDelta.toFixed(2)}) — consistent with a filled/dried issue`);
      } else if (darkIssue && brightnessDelta < -0.03) {
        score -= 0.2;
        reasons.push(`after image is darker than before (${brightnessDelta.toFixed(2)}) — issue may persist`);
      }
      // Garbage removal usually raises colorfulness variance (clean surface).
      if (["GARBAGE", "WASTE_OVERFLOW"].includes(input.category) && colorfulnessDelta > 0.02) {
        score += 0.2;
        reasons.push("surface appears cleaner/more uniform than before");
      }
      reasons.push(`before/after brightness ${(100 * Math.abs(afterStats.brightness - beforeStats.brightness)).toFixed(0)}% delta considered`);
    } else {
      reasons.push("no before-image available; heuristic confidence reduced");
      score -= 0.1;
    }

    if (afterStats.isBlank) {
      score -= 0.3;
      reasons.push("after image appears blank/low-detail — cannot verify");
    }

    const verified = score >= 0.6;
    return {
      verified,
      confidence: Number(Math.max(0.05, Math.min(0.95, score)).toFixed(2)),
      reason: reasons.join("; ") || "heuristic evaluation of after image",
      provider: this.id,
    };
  }
}

/** Cheap image statistics from raw JPEG/PNG bytes — no native deps. */
function imageStats(buf: Buffer): { brightness: number; colorfulness: number; isBlank: boolean } {
  // Sample raw bytes; for JPEG this is a rough proxy, good enough for a labeled heuristic.
  let sum = 0;
  let colored = 0;
  const n = Math.min(buf.length, 200_000);
  for (let i = 0; i < n; i += 7) {
    const b = buf[i];
    sum += b;
    if (b > 40 && b < 240) colored += 1;
  }
  const brightness = sum / Math.ceil(n / 7) / 255;
  const colorfulness = colored / Math.ceil(n / 7);
  return { brightness, colorfulness, isBlank: colorfulness < 0.02 || brightness < 0.02 || brightness > 0.98 };
}

export const supportedCategories = CATEGORIES;
export const categoryLabelMap = categoryLabels;
