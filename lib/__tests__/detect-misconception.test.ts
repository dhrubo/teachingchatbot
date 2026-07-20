import { describe, expect, it } from "vitest";
import { detectMisconception } from "../adaptive/detect-misconception";

describe("detectMisconception", () => {
  it("returns a null code for a correct answer", () => {
    expect(
      detectMisconception({
        question: { correctAnswer: "7", rules: {} },
        studentAnswer: "7",
        misconceptionTags: ["sign_error"],
      }).code
    ).toBeNull();
  });

  it("flags a sign error when magnitude matches but sign is flipped", () => {
    const result = detectMisconception({
      question: { correctAnswer: "5", rules: {} },
      studentAnswer: "-5",
      misconceptionTags: ["sign_error"],
    });
    expect(result.code).toBe("sign_error");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("flags inverse-operation slips for off-by-one numeric answers", () => {
    const result = detectMisconception({
      question: { correctAnswer: "8", rules: {} },
      studentAnswer: "7",
      misconceptionTags: ["forgot_inverse_operation"],
    });
    expect(result.code).toBe("forgot_inverse_operation");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("does NOT fall back to the archetype's declared misconception when no signal matches", () => {
    // Previously this guessed misconceptionTags[0] just because the answer
    // was wrong. A wrong answer alone is not evidence of a specific
    // misconception — it must return no diagnosis instead.
    const result = detectMisconception({
      question: { correctAnswer: "6x", rules: {} },
      studentAnswer: "5x",
      misconceptionTags: ["did_not_collect_like_terms"],
    });
    expect(result.code).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("returns a null code when no tags are available", () => {
    expect(
      detectMisconception({
        question: { correctAnswer: "6x", rules: {} },
        studentAnswer: "wrong",
        misconceptionTags: [],
      }).code
    ).toBeNull();
  });
});
