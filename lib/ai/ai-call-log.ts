import type { AiCallReason } from "./stream-with-provider-fallback";

export type RepairStatus = "none" | "repaired" | "fallback";

type AiCallEntry = {
  requestId: string;
  provider: string;
  model: string;
  reason: AiCallReason;
  timestamp: number;
  // All optional/additive so existing call sites keep working unchanged.
  promptVersion?: string;
  latencyMs?: number;
  repairStatus?: RepairStatus;
  // Violation CODES only (e.g. "answer_leak") — never raw response text, and
  // never raw student input. See lib/ai/tutor-validator.ts for the codes.
  violations?: string[];
};

const MAX_LOG = 200;
const log: AiCallEntry[] = [];

export function recordAiCall(
  provider: string,
  model: string,
  reason: AiCallReason,
  requestId: string,
  meta?: {
    promptVersion?: string;
    latencyMs?: number;
    repairStatus?: RepairStatus;
    violations?: string[];
  }
): void {
  log.push({
    provider,
    model,
    reason,
    requestId,
    timestamp: Date.now(),
    ...meta,
  });
  if (log.length > MAX_LOG) {
    log.splice(0, log.length - MAX_LOG);
  }
}

export function getRecentAiCalls(limit = 50): AiCallEntry[] {
  return log.slice(-limit);
}
