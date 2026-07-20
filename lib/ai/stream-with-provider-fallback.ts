import { streamText, type ModelMessage } from "ai";
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
  "hint",
  "explanation",
  "voice_tutor",
] as const;

export type AiCallReason = (typeof REASONS)[number];

export function logAiCall(
  provider: string,
  model: string,
  reason: AiCallReason,
  requestId: string,
  promptVersion?: string
): void {
  console.info(
    `[ai] provider=${provider} model=${model} reason=${reason} requestId=${requestId}` +
      (promptVersion ? ` promptVersion=${promptVersion}` : "")
  );
  recordAiCall(provider, model, reason, requestId, { promptVersion });
}

export async function streamTextWithFallback(
  candidates: ProviderCandidate[],
  config: Omit<Parameters<typeof streamText>[0], "model" | "maxRetries" | "prompt"> & { messages: ModelMessage[] },
  onModelSwitch?: (name: string) => void,
  reason: AiCallReason = "lesson_bundle",
  overrideRequestId?: string,
  /** Logged with every call — see lib/ai/prompts-tutor.ts TUTOR_PROMPT_VERSION. */
  promptVersion?: string
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
        ...config,
        model: candidate.model,
        maxRetries: 0,
      });
      if (attempted > 1) {
        onModelSwitch?.(candidate.id);
        logAiCall(
          candidate.id,
          candidate.modelName,
          "fallback_quota",
          requestId,
          promptVersion
        );
      } else {
        logAiCall(candidate.id, candidate.modelName, reason, requestId, promptVersion);
      }
      return {
        result,
        requestId,
        provider: candidate.id,
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
