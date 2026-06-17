// =============================================================================
// CHALLENGE CONSENT GATE — single source of truth.
//
// CRITICAL RULE: No challenge or question may be shown until the student
// explicitly accepts Challenge Mode. This is enforced in CODE, not just in the
// LLM prompt. Every route / component / tool that could surface a question must
// route its decision through these helpers — do NOT re-implement gate logic.
// =============================================================================

export type ChallengeConsentState =
  | "not_ready" // mission/lesson not started yet
  | "cards_in_progress" // student is reading concept cards
  | "ready_to_offer" // enough cards seen; CTA may be shown
  | "accepted" // student clicked "Start Challenge Mode" (transition)
  | "active" // full-screen challenge is running — questions allowed
  | "complete"; // challenge finished — results shown

/** Minimum concept cards a student must see before Challenge Mode is offered. */
export const MIN_CONCEPT_CARDS_BEFORE_CHALLENGE = 6;

/**
 * The ONLY state in which a real (graded) challenge question may be rendered,
 * an answer input shown, an answer submitted, or the adaptive engine queried.
 */
export function canShowChallengeQuestion(
  state: ChallengeConsentState
): boolean {
  return state === "active";
}

/** Whether the "Start Challenge Mode" CTA may be offered yet. */
export function canOfferChallenge(params: {
  conceptCardsSeen: number;
  minConceptCards?: number;
}): boolean {
  const min = params.minConceptCards ?? MIN_CONCEPT_CARDS_BEFORE_CHALLENGE;
  return params.conceptCardsSeen >= min;
}

/**
 * The authoritative guard for *entering* Challenge Mode. BOTH conditions are
 * required, no exceptions:
 *   1. the student explicitly clicked "Start Challenge Mode", AND
 *   2. they have seen at least MIN_CONCEPT_CARDS_BEFORE_CHALLENGE cards.
 *
 * Challenge Mode must NEVER start because the student typed "ok"/"yes"/"next"
 * etc., because a topic was selected, or because the LLM said so. Call this from
 * the only action allowed to activate the challenge.
 */
export function canStartChallenge(params: {
  explicitUserClick: boolean;
  conceptCardsSeen: number;
  minConceptCards?: number;
}): boolean {
  return (
    params.explicitUserClick === true &&
    canOfferChallenge({
      conceptCardsSeen: params.conceptCardsSeen,
      minConceptCards: params.minConceptCards,
    })
  );
}

/** Map a mission phase to a consent state (keeps the orchestrator in sync). */
export function consentStateForPhase(
  phase: string,
  conceptCardsSeen: number
): ChallengeConsentState {
  switch (phase) {
    case "intro":
    case "lesson":
      return "not_ready";
    case "cards":
      return canOfferChallenge({ conceptCardsSeen })
        ? "ready_to_offer"
        : "cards_in_progress";
    case "gate":
      return "ready_to_offer";
    case "challenge":
      return "active";
    case "results":
    case "review_mistakes":
    case "content_complete":
    case "complete":
      return "complete";
    default:
      return "not_ready";
  }
}

/**
 * Dev-only diagnostic: call when a question render/fetch is suppressed by the
 * gate so premature-question regressions are visible during development.
 */
export function logSuppressedQuestion(context?: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[challenge-gate] suppressed premature question render${
        context ? ` (${context})` : ""
      }`
    );
  }
}
