import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db/client";
import {
  aiCall,
  studentProfile,
  user,
  studentGoal,
  questionAttempt,
  questionArchetype,
} from "@/lib/db/schema";
import { createGoal, getGoalsByStudentId } from "@/lib/db/queries/student";
import { getAIEfficiencyStats } from "@/lib/db/queries/analytics";
import { eq, sql, inArray } from "drizzle-orm";

describe("Guardian Dashboard & Analytics Logic", () => {
  let testUserId: string | null = null;
  let testStudentId: string | null = null;
  const createdGoalIds: string[] = [];
  const createdCallIds: string[] = [];
  const createdAttemptIds: string[] = [];
  const createdArchetypeIds: string[] = [];

  beforeEach(async () => {
    // Seed User
    const [createdUser] = await db
      .insert(user)
      .values({
        email: `parent-test-${Date.now()}@sara.com`,
      })
      .returning();
    testUserId = createdUser.id;

    // Seed Student
    const [createdStudent] = await db
      .insert(studentProfile)
      .values({
        userId: testUserId,
        name: "Jamie",
        schoolYear: "8",
      })
      .returning();
    testStudentId = createdStudent.id;
  });

  afterEach(async () => {
    // Delete only the records created by this test file to prevent concurrency collisions
    if (createdGoalIds.length > 0) {
      await db.delete(studentGoal).where(inArray(studentGoal.id, createdGoalIds));
      createdGoalIds.length = 0;
    }
    if (createdAttemptIds.length > 0) {
      await db.delete(questionAttempt).where(inArray(questionAttempt.id, createdAttemptIds));
      createdAttemptIds.length = 0;
    }
    if (createdCallIds.length > 0) {
      await db.delete(aiCall).where(inArray(aiCall.id, createdCallIds));
      createdCallIds.length = 0;
    }
    if (createdArchetypeIds.length > 0) {
      await db.delete(questionArchetype).where(inArray(questionArchetype.id, createdArchetypeIds));
      createdArchetypeIds.length = 0;
    }
    if (testStudentId) {
      await db.delete(studentProfile).where(eq(studentProfile.id, testStudentId));
      testStudentId = null;
    }
    if (testUserId) {
      await db.delete(user).where(eq(user.id, testUserId));
      testUserId = null;
    }
  });

  it("should create and fetch a parent assigned practice target", async () => {
    expect(testStudentId).not.toBeNull();
    const studentId = testStudentId!;

    const goal = await createGoal({
      studentId,
      description: "Complete 10 Fraction problems",
      topic: "Fractions",
      targetDate: new Date("2026-12-31"),
      planSteps: [
        { label: "Basics", status: "todo" },
        { label: "Practice", status: "todo" },
      ],
      progressPercent: 10,
    });

    expect(goal.id).toBeDefined();
    createdGoalIds.push(goal.id);
    expect(goal.studentId).toBe(studentId);
    expect(goal.topic).toBe("Fractions");
    expect(goal.description).toBe("Complete 10 Fraction problems");
    expect(goal.progressPercent).toBe(10);

    const goalsList = await getGoalsByStudentId({ studentId });
    expect(goalsList.length).toBe(1);
    expect(goalsList[0].id).toBe(goal.id);
  });

  it("should calculate correct AI cost savings and efficiency metrics", async () => {
    expect(testStudentId).not.toBeNull();
    const studentId = testStudentId!;

    // Log an AI call
    const [loggedCall] = await db
      .insert(aiCall)
      .values({
        studentId,
        purpose: "hint",
        modelUsed: "gemini-2.5-flash",
        promptTokens: 100,
        completionTokens: 50,
        estimatedTokensSaved: 300,
      })
      .returning();
    createdCallIds.push(loggedCall.id);

    // Seed a question archetype to resolve reference
    const [archetype] = await db
      .insert(questionArchetype)
      .values({
        slug: `test-arch-${Date.now()}`,
        subject: "maths",
        yearGroup: 8,
        missionSlug: "fractions",
        lessonSlug: "intro-fractions",
        skillSlug: "fractions_basics",
        gcseDomain: "number",
        difficultyBand: "must",
        questionType: "short_text",
        template: "Solve {a} + {b}",
        variableSchemaJson: { a: [1, 2], b: [3, 4] },
        answerExpression: "a + b",
      })
      .returning();
    createdArchetypeIds.push(archetype.id);

    // Log a deterministic (AI-free) attempt
    const [attempt] = await db
      .insert(questionAttempt)
      .values({
        studentId,
        archetypeId: archetype.id,
        skillSlug: "fractions_basics",
        difficultyBand: "must",
        prompt: "Solve 2 + 3",
        studentAnswer: "5",
        correctAnswer: "5",
        isCorrect: true,
      })
      .returning();
    createdAttemptIds.push(attempt.id);

    // Retrieve stats
    const stats = await getAIEfficiencyStats(studentId);
    const totalCalls = stats.totalCalls;
    const totalTokens = stats.totalPromptTokens + stats.totalCompletionTokens;
    const tokensSaved = stats.totalSavedTokens;

    const attemptsCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questionAttempt)
      .where(eq(questionAttempt.studentId, studentId));
    const totalAttempts = attemptsCountResult[0]?.count ?? 0;

    const efficiencyPercentage =
      totalAttempts + totalCalls > 0
        ? Math.round((totalAttempts / (totalAttempts + totalCalls)) * 100)
        : 100;

    expect(totalCalls).toBe(1);
    expect(totalTokens).toBe(150);
    expect(tokensSaved).toBe(300);
    expect(totalAttempts).toBe(1);
    expect(efficiencyPercentage).toBe(50); // 1 / (1 + 1) * 100 = 50%
  });
});
