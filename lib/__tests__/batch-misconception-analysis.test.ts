import { describe, expect, it } from "vitest";
import {
  groupByMisconception,
  buildEvidence,
  MIN_WRONG_FOR_BATCH,
  type WrongAnswerRow,
  type MisconceptionGroup,
} from "../learning-science/batch-misconception-analysis";

function makeWa(
  skillSlug: string,
  misconceptionTag: string | null,
  overrides: Partial<WrongAnswerRow> = {}
): WrongAnswerRow {
  return {
    skillSlug,
    misconceptionTag,
    studentAnswer: "5",
    correctAnswer: "10",
    createdAt: new Date("2025-01-15"),
    ...overrides,
  };
}

describe("groupByMisconception", () => {
  it("returns empty array for no wrong answers", () => {
    expect(groupByMisconception([])).toEqual([]);
  });

  it("returns empty when no group has >=2 answers", () => {
    const rows = [
      makeWa("algebra", "sign_error"),
      makeWa("fractions", "invert_fail"),
    ];
    expect(groupByMisconception(rows)).toEqual([]);
  });

  it("groups by (skillSlug, misconceptionTag)", () => {
    const rows = [
      makeWa("algebra", "sign_error"),
      makeWa("algebra", "sign_error"),
      makeWa("algebra", "inverse_op"),
      makeWa("algebra", "inverse_op"),
      makeWa("fractions", "invert_fail"),
    ];
    const groups = groupByMisconception(rows);
    expect(groups).toHaveLength(2);

    const sign = groups.find((g) => g.tag === "sign_error")!;
    expect(sign.skillSlug).toBe("algebra");
    expect(sign.answers).toHaveLength(2);

    const inverse = groups.find((g) => g.tag === "inverse_op")!;
    expect(inverse.skillSlug).toBe("algebra");
    expect(inverse.answers).toHaveLength(2);
  });

  it("groups answers in insertion order", () => {
    const rows = [
      makeWa("algebra", "sign_error", { studentAnswer: "1" }),
      makeWa("algebra", "sign_error", { studentAnswer: "2" }),
    ];
    const groups = groupByMisconception(rows);
    expect(groups[0].answers[0].studentAnswer).toBe("1");
    expect(groups[0].answers[1].studentAnswer).toBe("2");
  });

  it("treats null misconceptionTag as 'unknown' key", () => {
    const rows = [
      makeWa("algebra", null),
      makeWa("algebra", null),
    ];
    const groups = groupByMisconception(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].tag).toBe("unknown");
  });

  it("does NOT merge null and actual tag groups", () => {
    const rows = [
      makeWa("algebra", null),
      makeWa("algebra", null),
      makeWa("algebra", "sign_error"),
    ];
    const groups = groupByMisconception(rows);
    // null group has 2 (returned), sign_error has 1 (filtered)
    expect(groups).toHaveLength(1);
    expect(groups[0].tag).toBe("unknown");
  });

  it("groups across different skills separately", () => {
    const rows = [
      makeWa("algebra", "sign_error"),
      makeWa("algebra", "sign_error"),
      makeWa("fractions", "sign_error"),
      makeWa("fractions", "sign_error"),
    ];
    const groups = groupByMisconception(rows);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.answers.length >= 2)).toBe(true);
  });
});

describe("buildEvidence", () => {
  const makeGroup = (
    answers: Partial<WrongAnswerRow>[]
  ): MisconceptionGroup => ({
    skillSlug: "algebra",
    tag: "sign_error",
    answers: answers.map((a, i) =>
      makeWa("algebra", "sign_error", {
        studentAnswer: `ans-${i}`,
        correctAnswer: "10",
        createdAt: new Date(2025, 0, 10 + i),
        ...a,
      })
    ),
  });

  it("includes count", () => {
    const evidence = buildEvidence(makeGroup([{}, {}]));
    expect(evidence.count).toBe(2);
  });

  it("includes firstSeen / lastSeen from timestamps", () => {
    const evidence = buildEvidence(
      makeGroup([{ createdAt: new Date(2025, 0, 1) }, { createdAt: new Date(2025, 0, 5) }])
    );
    // answers[0] is first arg (Jan 1) → lastSeen
    // answers[1] is second arg (Jan 5) → firstSeen (oldest in group)
    expect(evidence.firstSeen).toContain("2025-01-05");
    expect(evidence.lastSeen).toContain("2025-01-01");
  });

  it("includes up to 3 examples", () => {
    const evidence = buildEvidence(makeGroup([{}, {}, {}, {}, {}]));
    expect((evidence.examples as any[])).toHaveLength(3);
  });

  it("includes fewer examples when group is small", () => {
    const evidence = buildEvidence(makeGroup([{}]));
    expect((evidence.examples as any[])).toHaveLength(1);
  });

  it("each example has studentAnswer and correctAnswer", () => {
    const evidence = buildEvidence(makeGroup([{ studentAnswer: "42", correctAnswer: "7" }]));
    const example = (evidence.examples as any[])[0];
    expect(example.studentAnswer).toBe("42");
    expect(example.correctAnswer).toBe("7");
  });
});

describe("MIN_WRONG_FOR_BATCH threshold", () => {
  it("is 5", () => {
    expect(MIN_WRONG_FOR_BATCH).toBe(5);
  });
});
