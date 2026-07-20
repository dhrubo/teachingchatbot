import type { TutorMode } from "./prompts-tutor";

/**
 * The app decides the tutor's mode from deterministic markers in the last
 * user turn — never the model. See:
 *   - `[INCORRECT`/`[CORRECT` — built by submitAnswer in hooks/use-active-chat.tsx
 *     after a graded Challenge Mode answer.
 *   - `[RETEACH` — built by requestReteach in hooks/use-active-chat.tsx, an
 *     explicit "explain it differently" request, independent of whether the
 *     last answer was right or wrong.
 * Pure and exported so it's unit-testable without spinning up the route.
 */
export function resolveTutorMode(userText: string): TutorMode {
  if (userText.includes("[RETEACH")) {
    return "reteach";
  }
  if (userText.includes("[INCORRECT")) {
    return "mistake_explanation";
  }
  return "teach";
}
