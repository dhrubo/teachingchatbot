import { describe, expect, it } from "vitest";
import { checkMathAnswer, sanitizeForSpeech } from "./check-answer";

describe("checkMathAnswer — GCSE fractions, compound interest, ratios & speech", () => {
  it("accepts equivalent fraction, decimal, and spoken fraction forms", () => {
    expect(
      checkMathAnswer({
        learnerInput: "19/20",
        canonicalAnswer: "19/20",
      }).isCorrect
    ).toBe(true);

    expect(
      checkMathAnswer({
        learnerInput: "0.95",
        canonicalAnswer: "19/20",
      }).isCorrect
    ).toBe(true);

    expect(
      checkMathAnswer({
        learnerInput: "nineteen over twenty",
        canonicalAnswer: "19/20",
      }).isCorrect
    ).toBe(true);
  });

  it("grades compound interest currency answers and gives a rounding hint for unrounded pennies", () => {
    const exact = checkMathAnswer({
      learnerInput: "£1,157.63",
      canonicalAnswer: "1157.63",
    });
    expect(exact.isCorrect).toBe(true);

    const unrounded = checkMathAnswer({
      learnerInput: "1157.625",
      canonicalAnswer: "1157.63",
    });
    expect(unrounded.isCorrect).toBe(false);
    expect(unrounded.roundingHint).toContain("2 decimal places");
  });

  it("handles spoken ratios and algebraic assignments like 'x = 6'", () => {
    expect(
      checkMathAnswer({
        learnerInput: "3 to 5",
        canonicalAnswer: "3:5",
      }).isCorrect
    ).toBe(true);

    expect(
      checkMathAnswer({
        learnerInput: "x = 6",
        canonicalAnswer: "6",
      }).isCorrect
    ).toBe(true);
  });

  it("requests clarification on genuinely ambiguous spoken expressions", () => {
    const ambiguous = checkMathAnswer({
      learnerInput: "negative three squared",
      canonicalAnswer: "9",
    });
    expect(ambiguous.needsClarification).toBe(true);
    expect(ambiguous.clarificationPrompt).toMatch(/did you mean/i);
  });
});

describe("sanitizeForSpeech", () => {
  it("strips LaTeX commands and converts currency/powers into spoken British English", () => {
    const cleaned = sanitizeForSpeech(
      "Multiply £1000 \\times 1.05^3 and simplify \\frac{3}{4}."
    );
    expect(cleaned).toContain("1000 pounds");
    expect(cleaned).toContain("times");
    expect(cleaned).toContain("cubed");
    expect(cleaned).toContain("3 over 4");
    expect(cleaned).not.toContain("\\frac");
  });
});
