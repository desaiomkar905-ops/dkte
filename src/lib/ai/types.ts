/**
 * AI provider interfaces.
 *
 * RULE: production results are never simulated. Each provider reports its own
 * `provider` id ("yolo-service", "bedrock", "dev:heuristic", ...) and the UI +
 * Agent Activity log always display it, so a judge can always see whether a
 * real model or the clearly-labeled development provider produced a result.
 */

export type VisionDetection = {
  label: string;
  confidence: number;
  bbox?: [number, number, number, number];
};

export type VisionResult = {
  provider: string; // e.g. "yolo-service" or "dev:hint"
  detections: VisionDetection[];
  category: string | null; // mapped civic category or null
  confidence: number; // overall confidence 0..1
  model?: string; // weight file name when a real model ran (e.g. "civicai-best.pt")
  note?: string; // human-readable note shown in UI (e.g. "Simulated detection")
};

export interface VisionProvider {
  readonly id: string;
  detect(image: Buffer, mime: string, opts?: { demoHint?: string }): Promise<VisionResult>;
}

export type LLMResult = {
  provider: string; // e.g. "bedrock:claude-3-haiku" or "dev:rules"
  summary: string;
  category: string;
  reasoning: string[]; // concise decision explanations (no hidden chain-of-thought)
};

export interface LLMProvider {
  readonly id: string;
  reason(input: {
    description: string;
    visionCategory: string | null;
    visionConfidence: number | null;
    language: string;
  }): Promise<LLMResult>;
}

export type ResolutionVerdict = {
  verified: boolean;
  confidence: number;
  reason: string;
  provider: string;
};

export interface ResolutionVerifier {
  readonly id: string;
  verify(input: {
    category: string;
    originalDescription: string;
    beforeImage: Buffer | null;
    beforeMime: string | null;
    afterImage: Buffer;
    afterMime: string;
  }): Promise<ResolutionVerdict>;
}
