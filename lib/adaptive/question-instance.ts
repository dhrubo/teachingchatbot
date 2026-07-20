import type { QuestionInstance } from "@/lib/db/schema";
import type { DifficultyBand } from "./update-mastery";

// Pure helpers over a QuestionInstance row — no DB calls, trivially testable.
// These encode the security-relevant decisions (what the browser is allowed
// to see, who owns an instance, whether it's still live) so the request
// handler and its tests don't have to re-derive them ad hoc.

export type SanitisedQuestionDto = {
  questionInstanceId: string;
  prompt: string;
  options: string[] | null;
  questionType: QuestionInstance["questionType"];
  difficultyBand: DifficultyBand;
  // Non-sensitive display/context metadata — used by the hint and
  // explain-error endpoints to scope their prompt, NOT part of the canonical
  // grading data (that's correctAnswer/rulesJson/misconceptionTagsJson/
  // hint/explanation, all deliberately omitted here).
  skillSlug: string;
};

/**
 * The DTO sent to the browser BEFORE submission. Never include
 * correctAnswer, rulesJson, misconceptionTagsJson, hint or explanation here —
 * those are the canonical grading data and must stay server-side until after
 * the student has submitted an answer.
 */
export function buildSanitizedDto(
  instance: QuestionInstance
): SanitisedQuestionDto {
  return {
    questionInstanceId: instance.id,
    prompt: instance.prompt,
    options: instance.optionsJson,
    questionType: instance.questionType,
    difficultyBand: instance.difficultyBand as DifficultyBand,
    skillSlug: instance.skillSlug,
  };
}

export type Caller = { studentId?: string; guestSessionId?: string };

/** True if `caller` is the studentId/guestSessionId this instance was issued to. */
export function checkOwnership(
  instance: QuestionInstance,
  caller: Caller
): boolean {
  if (instance.studentId) {
    return Boolean(caller.studentId) && caller.studentId === instance.studentId;
  }
  if (instance.guestSessionId) {
    return (
      Boolean(caller.guestSessionId) &&
      caller.guestSessionId === instance.guestSessionId
    );
  }
  // An instance created without an owner can't be legitimately claimed.
  return false;
}

export function isExpired(
  instance: Pick<QuestionInstance, "expiresAt">,
  now: Date = new Date()
): boolean {
  return instance.expiresAt.getTime() <= now.getTime();
}

// Generous upper bound for a single question — long enough for a slow reader,
// short enough to make "answered in 3 hours" telemetry meaningless either way.
export const MAX_TIME_TAKEN_MS = 10 * 60 * 1000;

/** Clamp untrusted client telemetry. Returns null for non-numeric input. */
export function clampTimeTakenMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(MAX_TIME_TAKEN_MS, Math.round(value)));
}

/** Clamp optional self-reported confidence (1-5) from the client. */
export function clampConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(1, Math.min(5, Math.round(value)));
}
