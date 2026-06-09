import { describe, expect, it } from "vitest";
import { gradeAnswer, normaliseAlgebraic } from "../questions/grade-answer";

describe("gradeAnswer", () => {
  it("grades numeric answers with tolerance", () => {
    expect(
      gradeAnswer({
        studentAnswer: "40",
        correctAnswer: "40",
        rules: { numeric: true },
      })
    ).toBe(true);
    expect(
      gradeAnswer({
        studentAnswer: "0.33",
        correctAnswer: "0.333",
        rules: { numeric: true, tolerance: 0.01 },
      })
    ).toBe(true);
    expect(
      gradeAnswer({
        studentAnswer: "41",
        correctAnswer: "40",
        rules: { numeric: true },
      })
    ).toBe(false);
  });

  it("ignores currency and percent symbols", () => {
    expect(
      gradeAnswer({
        studentAnswer: "£12",
        correctAnswer: "12",
        rules: { numeric: true },
      })
    ).toBe(true);
    expect(
      gradeAnswer({
        studentAnswer: "75%",
        correctAnswer: "75",
        rules: { numeric: true },
      })
    ).toBe(true);
  });

  it("accepts equivalent fractions", () => {
    expect(
      gradeAnswer({
        studentAnswer: "2/4",
        correctAnswer: "1/2",
        rules: { fraction: true },
      })
    ).toBe(true);
    expect(
      gradeAnswer({
        studentAnswer: "1/3",
        correctAnswer: "1/2",
        rules: { fraction: true },
      })
    ).toBe(false);
  });

  it("accepts equivalent ratios", () => {
    expect(
      gradeAnswer({
        studentAnswer: "6:4",
        correctAnswer: "3:2",
        rules: { ratio: true },
      })
    ).toBe(true);
    expect(
      gradeAnswer({
        studentAnswer: "1:1",
        correctAnswer: "8:8",
        rules: { ratio: true },
      })
    ).toBe(true);
    expect(
      gradeAnswer({
        studentAnswer: "2:3",
        correctAnswer: "3:2",
        rules: { ratio: true },
      })
    ).toBe(false);
  });

  it("normalises algebraic expressions (order, spacing, unit coefficients)", () => {
    expect(
      gradeAnswer({
        studentAnswer: "3 + 2x",
        correctAnswer: "2x+3",
        rules: { normaliseAlgebra: true },
      })
    ).toBe(true);
    expect(
      gradeAnswer({
        studentAnswer: "1x",
        correctAnswer: "x",
        rules: { normaliseAlgebra: true },
      })
    ).toBe(true);
  });

  it("rejects empty answers", () => {
    expect(
      gradeAnswer({
        studentAnswer: "  ",
        correctAnswer: "5",
        rules: { numeric: true },
      })
    ).toBe(false);
  });

  it("falls back to normalised string comparison", () => {
    expect(
      gradeAnswer({ studentAnswer: "Unlikely", correctAnswer: "unlikely" })
    ).toBe(true);
  });
});

describe("normaliseAlgebraic", () => {
  it("is order-independent", () => {
    expect(normaliseAlgebraic("2x+3")).toBe(normaliseAlgebraic("3+2x"));
  });
});
