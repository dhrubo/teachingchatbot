// Deterministic chat title generation — no LLM call by default.
// Set ENABLE_LLM_TITLE_GENERATION=1 to use the LLM for titles.

export function createChatTitle(
  messageText?: string,
  topic?: string
): string {
  if (topic) return `${topic} practice`;
  if (messageText) {
    const trimmed = messageText.trim().slice(0, 60);
    return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
  }
  return "Maths tutoring session";
}

export function isLLMTitleEnabled(): boolean {
  return process.env.ENABLE_LLM_TITLE_GENERATION === "1";
}
