import { describe, expect, it } from "vitest";
import { resolveTutorMode } from "./resolve-tutor-mode";

describe("resolveTutorMode", () => {
  it("defaults to teach for a plain message", () => {
    expect(resolveTutorMode("Can you explain percentages?")).toBe("teach");
  });

  it("resolves mistake_explanation from the [INCORRECT directive", () => {
    expect(
      resolveTutorMode(
        "My answer: -5\n\n[INCORRECT — the right answer is 5. Confirm briefly and continue.]"
      )
    ).toBe("mistake_explanation");
  });

  it("resolves teach from the [CORRECT directive (no distinct 'confirm' mode)", () => {
    expect(
      resolveTutorMode(
        "My answer: 5\n\n[CORRECT — the right answer is 5. Confirm briefly and continue.]"
      )
    ).toBe("teach");
  });

  it("resolves reteach from the [RETEACH marker, independent of CORRECT/INCORRECT", () => {
    expect(
      resolveTutorMode(
        "[RETEACH] Please explain the current idea a different way."
      )
    ).toBe("reteach");
  });

  it("prioritises [RETEACH over [INCORRECT if a message somehow contained both", () => {
    expect(resolveTutorMode("[RETEACH] ... [INCORRECT ...")).toBe("reteach");
  });
});
