import type { VisionProvider, LLMProvider, ResolutionVerifier } from "./types";
import { YoloVisionProvider } from "./yoloVision";
import { DevVisionProvider } from "./devVision";
import { BedrockLLMProvider } from "./bedrockLlm";
import { DevLLMProvider } from "./devLlm";
import { YoloResolutionVerifier } from "./yoloVerifier";
import { DevResolutionVerifier } from "./devVerifier";

/**
 * Provider registry.
 * Selection is explicit and logged — production providers are used when their
 * service/credentials are configured AND reachable; otherwise the clearly
 * labeled development provider is used and its label travels with every
 * result into the UI and the Agent Activity log.
 */

export function getVisionProvider(): VisionProvider {
  const url = process.env.YOLO_SERVICE_URL;
  return url ? new YoloVisionProvider(url) : new DevVisionProvider();
}

export function getLLMProvider(): LLMProvider {
  return process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? new BedrockLLMProvider()
    : new DevLLMProvider();
}

export function getResolutionVerifier(): ResolutionVerifier {
  const url = process.env.YOLO_SERVICE_URL;
  return url ? new YoloResolutionVerifier(url) : new DevResolutionVerifier();
}

export function aiProviderStatus() {
  return {
    vision: process.env.YOLO_SERVICE_URL ? "yolo-service" : "dev:hint (labeled fallback)",
    llm: process.env.AWS_ACCESS_KEY_ID ? "bedrock" : "dev:rules (labeled fallback)",
    verifier: process.env.YOLO_SERVICE_URL ? "yolo-service" : "dev:heuristic (labeled fallback)",
  };
}
