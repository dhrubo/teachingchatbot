import { describe, expect, it } from "vitest";
import { type AnswerAttempt, detectAnswerPatterns } from "./answer-patterns";

function attempt(
  chosen: string,
  wasCorrect: boolean,
  overrides: Partial<AnswerAttempt> = {}
): AnswerAttempt {
  return {
    concept: "Fractions",
    prompt: "1/2 + 1/3 = ?",
    correctAnswer: "5/6",
    chosen,
    wasCorrect,
    ...overrides,
  };
}

describe("detectAnswerPatterns", () => {
  it("returns null with no attempts", () => {
    expect(detectAnswerPatterns([])).toBeNull();
  });

  it("returns null when all attempts are correct", () => {
    expect(
      detectAnswerPatterns([attempt("5/6", true), attempt("7/12", true)])
    ).toBeNull();
  });

  it("returns null on a single wrong answer (not yet a pattern)", () => {
    expect(detectAnswerPatterns([attempt("2/5", false)])).toBeNull();
  });

  it("flags a repeated specific distractor (same wrong choice twice)", () => {
    const p = detectAnswerPatterns([
      attempt("2/5", false),
      attempt("2/5", false),
    ]);
    expect(p?.kind).toBe("repeated-distractor");
    expect(p?.tutorObservation).toContain("2/5");
    expect(p?.studentNote).toContain("2/5");
  });

  it("matches the distractor case-insensitively / ignoring spacing", () => {
    const p = detectAnswerPatterns([
      attempt("Two Fifths", false),
      attempt("two  fifths", false),
    ]);
    expect(p?.kind).toBe("repeated-distractor");
  });

  it("flags repeat-wrong when the wrong answers differ", () => {
    const p = detectAnswerPatterns([
      attempt("2/5", false),
      attempt("3/5", false),
    ]);
    expect(p?.kind).toBe("repeat-wrong");
  });

  it("prefers repeated-distractor over generic repeat-wrong", () => {
    const p = detectAnswerPatterns([
      attempt("2/5", false),
      attempt("2/5", false),
      attempt("3/5", false),
    ]);
    expect(p?.kind).toBe("repeated-distractor");
  });

  it("flags repeat-wrong even after a strong start (two different wrong answers)", () => {
    const p = detectAnswerPatterns([
      attempt("5/6", true),
      attempt("5/6", true),
      attempt("2/5", false),
      attempt("3/7", false),
    ]);
    expect(p?.kind).toBe("repeat-wrong");
  });


  it("does not flag slipping when overall accuracy stays high", () => {
    const p = detectAnswerPatterns([
      attempt("5/6", true),
      attempt("5/6", true),
      attempt("5/6", true),
    ]);
    expect(p).toBeNull();
  });
});
