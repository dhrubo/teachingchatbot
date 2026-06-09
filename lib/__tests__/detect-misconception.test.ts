import { describe, expect, it } from "vitest";
import { detectMisconception } from "../adaptive/detect-misconception";

describe("detectMisconception", () => {
  it("returns null for a correct answer", () => {
    expect(
      detectMisconception({
        question: { correctAnswer: "7", rules: {} },
        studentAnswer: "7",
        misconceptionTags: ["sign_error"],
      })
    ).toBeNull();
  });

  it("flags a sign error when magnitude matches but sign is flipped", () => {
    expect(
      detectMisconception({
        question: { correctAnswer: "5", rules: {} },
        studentAnswer: "-5",
        misconceptionTags: ["sign_error"],
      })
    ).toBe("sign_error");
  });

  it("flags inverse-operation slips for off-by-one numeric answers", () => {
    expect(
      detectMisconception({
        question: { correctAnswer: "8", rules: {} },
        studentAnswer: "7",
        misconceptionTags: ["forgot_inverse_operation"],
      })
    ).toBe("forgot_inverse_operation");
  });

  it("falls back to the primary declared misconception", () => {
    expect(
      detectMisconception({
        question: { correctAnswer: "6x", rules: {} },
        studentAnswer: "5x",
        misconceptionTags: ["did_not_collect_like_terms"],
      })
    ).toBe("did_not_collect_like_terms");
  });

  it("returns null when no tags are available", () => {
    expect(
      detectMisconception({
        question: { correctAnswer: "6x", rules: {} },
        studentAnswer: "wrong",
        misconceptionTags: [],
      })
    ).toBeNull();
  });
});
