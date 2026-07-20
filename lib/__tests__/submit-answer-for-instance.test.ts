import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuestionInstance } from "@/lib/db/schema";

const dbMocks = vi.hoisted(() => ({
  getQuestionInstanceById: vi.fn(),
  claimQuestionInstanceForSubmission: vi.fn(),
  getAttemptByQuestionInstanceId: vi.fn(),
  getMasteryForSkills: vi.fn(),
  recordAttempt: vi.fn(),
  upsertMastery: vi.fn(),
  createQuestionInstance: vi.fn(),
  getArchetypesForSkillBand: vi.fn(),
  getRecentAttempts: vi.fn(),
  getSkillSlugsForLesson: vi.fn(),
  getSkillSlugsForMission: vi.fn(),
}));

const learningScienceMocks = vi.hoisted(() => ({
  upsertConfidence: vi.fn(),
}));

vi.mock("@/lib/db/queries/questions", () => dbMocks);
vi.mock("@/lib/db/queries/learning-science", () => learningScienceMocks);
vi.mock("@/lib/db/client", () => ({
  db: {
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<void>) => {
      await cb({});
    }),
  },
}));

// Imported AFTER the mocks are registered.
const { submitAnswerForInstance } = await import("../adaptive/engine");

function makeInstance(
  overrides: Partial<QuestionInstance> = {}
): QuestionInstance {
  // Real "now" — the code under test checks expiry against the real clock
  // (Date.now()), so fixtures must be anchored to it, not a fixed past date.
  const now = new Date();
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

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.getMasteryForSkills.mockResolvedValue([]);
  dbMocks.recordAttempt.mockResolvedValue(undefined);
  dbMocks.upsertMastery.mockResolvedValue(undefined);
  learningScienceMocks.upsertConfidence.mockResolvedValue(undefined);
});

describe("submitAnswerForInstance", () => {
  it("grades a correct submission against the canonical answer and updates mastery", async () => {
    const instance = makeInstance();
    dbMocks.getQuestionInstanceById.mockResolvedValue(instance);
    dbMocks.claimQuestionInstanceForSubmission.mockResolvedValue(instance);

    const result = await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      studentId: "student-1",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe("3");
    }
    expect(dbMocks.recordAttempt).toHaveBeenCalledTimes(1);
    expect(dbMocks.recordAttempt.mock.calls[0][0]).toMatchObject({
      isCorrect: true,
      skillSlug: "algebra_solve_one_step",
      difficultyBand: "must",
    });
    expect(dbMocks.upsertMastery).toHaveBeenCalledTimes(1);
  });

  it("grades an incorrect submission and still records the attempt", async () => {
    const instance = makeInstance();
    dbMocks.getQuestionInstanceById.mockResolvedValue(instance);
    dbMocks.claimQuestionInstanceForSubmission.mockResolvedValue(instance);

    const result = await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "-3",
      studentId: "student-1",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.isCorrect).toBe(false);
    }
    expect(dbMocks.recordAttempt.mock.calls[0][0]).toMatchObject({
      isCorrect: false,
      // sign error signal: -3 vs 3
      misconceptionTag: "sign_error",
    });
  });

  it("ignores a forged correctAnswer/skillSlug/difficultyBand in the request — grades against the canonical instance", async () => {
    const instance = makeInstance({ correctAnswer: "3", skillSlug: "real_skill" });
    dbMocks.getQuestionInstanceById.mockResolvedValue(instance);
    dbMocks.claimQuestionInstanceForSubmission.mockResolvedValue(instance);

    // The function signature doesn't even accept these fields, but simulate a
    // client that tries to smuggle them in anyway via a loosely-typed body.
    const forgedParams = {
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      studentId: "student-1",
      idempotencyKey: "key-1",
      correctAnswer: "999",
      skillSlug: "forged_skill",
      difficultyBand: "gcse_bridge",
    };

    const result = await submitAnswerForInstance(forgedParams as never);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      // Graded against "3" (canonical), not the forged "999".
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe("3");
    }
    expect(dbMocks.recordAttempt.mock.calls[0][0]).toMatchObject({
      skillSlug: "real_skill",
      difficultyBand: "must",
    });
  });

  it("rejects submission from a different student (ownership)", async () => {
    const instance = makeInstance({ studentId: "student-1" });
    dbMocks.getQuestionInstanceById.mockResolvedValue(instance);

    const result = await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      studentId: "student-2",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("forbidden");
    expect(dbMocks.claimQuestionInstanceForSubmission).not.toHaveBeenCalled();
  });

  it("rejects submission from a guest against a student-owned instance", async () => {
    const instance = makeInstance({ studentId: "student-1" });
    dbMocks.getQuestionInstanceById.mockResolvedValue(instance);

    const result = await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      guestSessionId: "guest-1",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("forbidden");
  });

  it("rejects an expired instance", async () => {
    const instance = makeInstance({
      expiresAt: new Date("2020-01-01T00:00:00Z"),
    });
    dbMocks.getQuestionInstanceById.mockResolvedValue(instance);

    const result = await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      studentId: "student-1",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("expired");
    expect(dbMocks.claimQuestionInstanceForSubmission).not.toHaveBeenCalled();
  });

  it("returns not_found for a missing instance", async () => {
    dbMocks.getQuestionInstanceById.mockResolvedValue(null);

    const result = await submitAnswerForInstance({
      questionInstanceId: "does-not-exist",
      studentAnswer: "3",
      studentId: "student-1",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("not_found");
  });

  it("safely replays a duplicate submission with the SAME idempotency key instead of re-grading", async () => {
    const submittedInstance = makeInstance({
      submittedAt: new Date("2026-01-01T00:05:00Z"),
      submittedIdempotencyKey: "key-1",
    });
    dbMocks.getQuestionInstanceById.mockResolvedValue(submittedInstance);
    dbMocks.getAttemptByQuestionInstanceId.mockResolvedValue({
      isCorrect: true,
    });

    const result = await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      studentId: "student-1",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.isCorrect).toBe(true);
    }
    // No new attempt/mastery write on replay.
    expect(dbMocks.claimQuestionInstanceForSubmission).not.toHaveBeenCalled();
    expect(dbMocks.recordAttempt).not.toHaveBeenCalled();
    expect(dbMocks.upsertMastery).not.toHaveBeenCalled();
  });

  it("rejects a genuine duplicate submission with a DIFFERENT idempotency key", async () => {
    const submittedInstance = makeInstance({
      submittedAt: new Date("2026-01-01T00:05:00Z"),
      submittedIdempotencyKey: "original-key",
    });
    dbMocks.getQuestionInstanceById.mockResolvedValue(submittedInstance);

    const result = await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      studentId: "student-1",
      idempotencyKey: "a-different-key",
    });

    expect(result.status).toBe("duplicate");
    expect(dbMocks.recordAttempt).not.toHaveBeenCalled();
    expect(dbMocks.upsertMastery).not.toHaveBeenCalled();
  });

  it("handles concurrent duplicate submission: loses the atomic claim race and does not double-update mastery", async () => {
    // First read sees the instance as not-yet-submitted...
    const unsubmitted = makeInstance({ submittedAt: null });
    // ...but by the time we try to claim it, a concurrent request already
    // claimed it with a DIFFERENT idempotency key.
    const wonByOther = makeInstance({
      submittedAt: new Date("2026-01-01T00:00:01Z"),
      submittedIdempotencyKey: "other-request-key",
    });

    dbMocks.getQuestionInstanceById
      .mockResolvedValueOnce(unsubmitted) // initial load
      .mockResolvedValueOnce(wonByOther); // re-check inside replaySubmission
    dbMocks.claimQuestionInstanceForSubmission.mockResolvedValue(null); // lost the race

    const result = await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      studentId: "student-1",
      idempotencyKey: "this-request-key",
    });

    expect(result.status).toBe("duplicate");
    expect(dbMocks.recordAttempt).not.toHaveBeenCalled();
    expect(dbMocks.upsertMastery).not.toHaveBeenCalled();
  });

  it("clamps out-of-range timeTakenMs before recording the attempt", async () => {
    const instance = makeInstance();
    dbMocks.getQuestionInstanceById.mockResolvedValue(instance);
    dbMocks.claimQuestionInstanceForSubmission.mockResolvedValue(instance);

    await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      studentId: "student-1",
      idempotencyKey: "key-1",
      timeTakenMs: 999_999_999,
    });

    expect(dbMocks.recordAttempt.mock.calls[0][0].timeTakenMs).toBe(
      10 * 60 * 1000
    );
  });

  it("does not persist mastery for guests", async () => {
    const instance = makeInstance({
      studentId: null,
      guestSessionId: "guest-1",
    });
    dbMocks.getQuestionInstanceById.mockResolvedValue(instance);
    dbMocks.claimQuestionInstanceForSubmission.mockResolvedValue(instance);

    const result = await submitAnswerForInstance({
      questionInstanceId: "instance-1",
      studentAnswer: "3",
      guestSessionId: "guest-1",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.mastery).toBeNull();
    }
    expect(dbMocks.upsertMastery).not.toHaveBeenCalled();
  });
});
