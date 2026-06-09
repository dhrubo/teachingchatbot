import { describe, expect, it } from "vitest";
import {
  type ChallengeConsentState,
  canOfferChallenge,
  canShowChallengeQuestion,
  canStartChallenge,
  consentStateForPhase,
  MIN_CONCEPT_CARDS_BEFORE_CHALLENGE,
} from "../challenge-gate";

describe("canShowChallengeQuestion", () => {
  it("is true ONLY when state is active", () => {
    const states: ChallengeConsentState[] = [
      "not_ready",
      "cards_in_progress",
      "ready_to_offer",
      "accepted",
      "active",
      "complete",
    ];
    for (const state of states) {
      expect(canShowChallengeQuestion(state)).toBe(state === "active");
    }
  });
});

describe("canOfferChallenge", () => {
  it("requires at least MIN_CONCEPT_CARDS_BEFORE_CHALLENGE cards", () => {
    expect(MIN_CONCEPT_CARDS_BEFORE_CHALLENGE).toBe(3);
    expect(canOfferChallenge({ conceptCardsSeen: 0 })).toBe(false);
    expect(canOfferChallenge({ conceptCardsSeen: 2 })).toBe(false);
    expect(canOfferChallenge({ conceptCardsSeen: 3 })).toBe(true);
    expect(canOfferChallenge({ conceptCardsSeen: 5 })).toBe(true);
  });

  it("respects a custom minimum", () => {
    expect(canOfferChallenge({ conceptCardsSeen: 1, minConceptCards: 1 })).toBe(
      true
    );
  });
});

describe("canStartChallenge", () => {
  it("requires BOTH an explicit click AND enough cards", () => {
    // explicit click but not enough cards → no
    expect(
      canStartChallenge({ explicitUserClick: true, conceptCardsSeen: 2 })
    ).toBe(false);
    // enough cards but no explicit click (e.g. typed "ok") → no
    expect(
      canStartChallenge({ explicitUserClick: false, conceptCardsSeen: 5 })
    ).toBe(false);
    // both satisfied → yes
    expect(
      canStartChallenge({ explicitUserClick: true, conceptCardsSeen: 3 })
    ).toBe(true);
  });

  it("never starts on a typed acknowledgement (no explicit click)", () => {
    // Simulates "ok"/"yes"/"next" — there is no explicit Start click.
    expect(
      canStartChallenge({ explicitUserClick: false, conceptCardsSeen: 99 })
    ).toBe(false);
  });
});

describe("consentStateForPhase", () => {
  it("never reports active for non-challenge phases (topic/lesson start)", () => {
    expect(consentStateForPhase("intro", 0)).toBe("not_ready");
    expect(consentStateForPhase("lesson", 0)).toBe("not_ready");
    // A challenge question must NOT be showable on topic/lesson start.
    expect(canShowChallengeQuestion(consentStateForPhase("intro", 99))).toBe(
      false
    );
    expect(canShowChallengeQuestion(consentStateForPhase("lesson", 99))).toBe(
      false
    );
  });

  it("only reaches ready_to_offer after 3 cards", () => {
    expect(consentStateForPhase("cards", 1)).toBe("cards_in_progress");
    expect(consentStateForPhase("cards", 3)).toBe("ready_to_offer");
    expect(consentStateForPhase("gate", 3)).toBe("ready_to_offer");
  });

  it("activates only in the challenge phase", () => {
    expect(consentStateForPhase("challenge", 3)).toBe("active");
    expect(canShowChallengeQuestion(consentStateForPhase("challenge", 3))).toBe(
      true
    );
  });

  it("marks complete after results", () => {
    expect(consentStateForPhase("results", 3)).toBe("complete");
    expect(consentStateForPhase("complete", 3)).toBe("complete");
  });
});
