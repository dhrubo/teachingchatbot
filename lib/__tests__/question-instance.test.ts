import { describe, expect, it } from "vitest";
import type { QuestionInstance } from "@/lib/db/schema";
import {
  buildSanitizedDto,
  checkOwnership,
  clampConfidence,
  clampTimeTakenMs,
  isExpired,
  MAX_TIME_TAKEN_MS,
} from "../adaptive/question-instance";

function makeInstance(
  overrides: Partial<QuestionInstance> = {}
): QuestionInstance {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    id: "instance-1",
    studentId: "student-1",
    guestSessionId: null,
    archetypeId: "archetype-1",
    skillSlug: "algebra_solve_one_step",
    difficultyBand: "must",
    questionType: "short_text",
    prompt: "Solve for x: x + 2 = 5",
    optionsJson: null,
    correctAnswer: "3",
    rulesJson: { numeric: true },
    misconceptionTagsJson: ["sign_error"],
    hint: "Subtract 2 from both sides",
    explanation: "x = 5 - 2 = 3",
    createdAt: now,
    expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    submittedAt: null,
    submittedIdempotencyKey: null,
    ...overrides,
  };
}

describe("buildSanitizedDto", () => {
  it("never includes canonical grading data", () => {
    const dto = buildSanitizedDto(makeInstance()) as unknown as Record<
      string,
      unknown
    >;
    expect(dto.correctAnswer).toBeUndefined();
    expect(dto.rulesJson).toBeUndefined();
    expect(dto.rules).toBeUndefined();
    expect(dto.misconceptionTagsJson).toBeUndefined();
    expect(dto.misconceptionTags).toBeUndefined();
    expect(dto.hint).toBeUndefined();
    expect(dto.explanation).toBeUndefined();
  });

  it("includes only sanitised display fields", () => {
    const dto = buildSanitizedDto(makeInstance());
    expect(dto).toEqual({
      questionInstanceId: "instance-1",
      prompt: "Solve for x: x + 2 = 5",
      options: null,
      questionType: "short_text",
      difficultyBand: "must",
      skillSlug: "algebra_solve_one_step",
    });
  });
});

describe("checkOwnership", () => {
  it("accepts the matching student", () => {
    const instance = makeInstance({ studentId: "student-1" });
    expect(checkOwnership(instance, { studentId: "student-1" })).toBe(true);
  });

  it("rejects a different student (forged/mismatched ownership)", () => {
    const instance = makeInstance({ studentId: "student-1" });
    expect(checkOwnership(instance, { studentId: "student-2" })).toBe(false);
  });

  it("rejects a guest caller against a student-owned instance", () => {
    const instance = makeInstance({ studentId: "student-1" });
    expect(checkOwnership(instance, { guestSessionId: "guest-1" })).toBe(
      false
    );
  });

  it("accepts the matching guest session", () => {
    const instance = makeInstance({
      studentId: null,
      guestSessionId: "guest-1",
    });
    expect(checkOwnership(instance, { guestSessionId: "guest-1" })).toBe(true);
  });

  it("rejects a different guest session", () => {
    const instance = makeInstance({
      studentId: null,
      guestSessionId: "guest-1",
    });
    expect(checkOwnership(instance, { guestSessionId: "guest-2" })).toBe(
      false
    );
  });

  it("rejects an unauthenticated caller with no ids", () => {
    const instance = makeInstance({ studentId: "student-1" });
    expect(checkOwnership(instance, {})).toBe(false);
  });
});

describe("isExpired", () => {
  it("is not expired before expiresAt", () => {
    const instance = makeInstance({
      expiresAt: new Date("2026-01-01T00:30:00Z"),
    });
    expect(isExpired(instance, new Date("2026-01-01T00:00:00Z"))).toBe(false);
  });

  it("is expired at/after expiresAt", () => {
    const instance = makeInstance({
      expiresAt: new Date("2026-01-01T00:30:00Z"),
    });
    expect(isExpired(instance, new Date("2026-01-01T00:30:00Z"))).toBe(true);
    expect(isExpired(instance, new Date("2026-01-01T01:00:00Z"))).toBe(true);
  });
});

describe("clampTimeTakenMs", () => {
  it("clamps negative values to 0", () => {
    expect(clampTimeTakenMs(-500)).toBe(0);
  });

  it("clamps values above the max down to the max", () => {
    expect(clampTimeTakenMs(999_999_999)).toBe(MAX_TIME_TAKEN_MS);
  });

  it("passes through valid values", () => {
    expect(clampTimeTakenMs(1500)).toBe(1500);
  });

  it("returns null for non-numeric input (forged telemetry)", () => {
    expect(clampTimeTakenMs("forever")).toBeNull();
    expect(clampTimeTakenMs(undefined)).toBeNull();
    expect(clampTimeTakenMs(Number.NaN)).toBeNull();
  });
});

describe("clampConfidence", () => {
  it("clamps to the 1-5 range", () => {
    expect(clampConfidence(0)).toBe(1);
    expect(clampConfidence(10)).toBe(5);
    expect(clampConfidence(3)).toBe(3);
  });

  it("returns null for non-numeric input", () => {
    expect(clampConfidence("high")).toBeNull();
  });
});
