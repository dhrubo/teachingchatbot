import type { AiCallReason } from "./stream-with-provider-fallback";

type AiCallEntry = {
  requestId: string;
  provider: string;
  model: string;
  reason: AiCallReason;
  timestamp: number;
};

const MAX_LOG = 200;
const log: AiCallEntry[] = [];

export function recordAiCall(
  provider: string,
  model: string,
  reason: AiCallReason,
  requestId: string
): void {
  log.push({ provider, model, reason, requestId, timestamp: Date.now() });
  if (log.length > MAX_LOG) {
    log.splice(0, log.length - MAX_LOG);
  }
}

export function getRecentAiCalls(limit = 50): AiCallEntry[] {
  return log.slice(-limit);
}
