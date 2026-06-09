import { streamText } from "ai";
import { recordAiCall } from "./ai-call-log";
import type { ProviderCandidate } from "./providers";
import { isQuotaError } from "./providers";

let requestCounter = 0;

function nextRequestId(): string {
  requestCounter++;
  return `ai-${Date.now()}-${requestCounter}`;
}

const REASONS = [
  "lesson_bundle",
  "reteach",
  "open_answer_grading",
  "parent_report",
  "summary",
  "fallback_quota",
] as const;

export type AiCallReason = (typeof REASONS)[number];

export function logAiCall(
  provider: string,
  model: string,
  reason: AiCallReason,
  requestId: string
): void {
  console.info(
    `[ai] provider=${provider} model=${model} reason=${reason} requestId=${requestId}`
  );
  recordAiCall(provider, model, reason, requestId);
}

export async function streamTextWithFallback(
  candidates: ProviderCandidate[],
  config: Omit<Parameters<typeof streamText>[0], "model" | "maxRetries">,
  onModelSwitch?: (name: string) => void,
  reason: AiCallReason = "lesson_bundle",
  overrideRequestId?: string
): Promise<{
  result: Awaited<ReturnType<typeof streamText>>;
  requestId: string;
  provider: string;
  model: string;
}> {
  const requestId = overrideRequestId ?? nextRequestId();
  let lastError: Error | null = null;
  let attempted = 0;

  for (const candidate of candidates) {
    attempted++;
    try {
      const result = streamText({
        ...(config as any),
        model: candidate.model,
        maxRetries: 0,
      });
      if (attempted > 1) {
        onModelSwitch?.(candidate.name);
        logAiCall(
          candidate.name,
          candidate.modelName,
          "fallback_quota",
          requestId
        );
      } else {
        logAiCall(candidate.name, candidate.modelName, reason, requestId);
      }
      return {
        result,
        requestId,
        provider: candidate.name,
        model: candidate.modelName,
      };
    } catch (error) {
      if (isQuotaError(error)) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("All providers exhausted");
}
