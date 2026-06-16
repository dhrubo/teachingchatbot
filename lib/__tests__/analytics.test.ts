import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db/client";
import { aiCall, studentProfile, user } from "@/lib/db/schema";
import { logAICall, getAIEfficiencyStats } from "@/lib/db/queries/analytics";
import { eq, inArray } from "drizzle-orm";

describe("Analytics Queries", () => {
  let testUserId: string | null = null;
  let testStudentId: string | null = null;
  const loggedCallIds: string[] = [];

  beforeEach(async () => {
    // Create seed user and student profile for test
    const [createdUser] = await db
      .insert(user)
      .values({
        email: `test-analytics-${Date.now()}@sara.com`,
      })
      .returning();
    testUserId = createdUser.id;

    const [createdStudent] = await db
      .insert(studentProfile)
      .values({
        userId: testUserId,
        name: "Test Student",
        schoolYear: "8",
      })
      .returning();
    testStudentId = createdStudent.id;
  });

  afterEach(async () => {
    // Clean up only the specific records we created
    if (loggedCallIds.length > 0) {
      await db.delete(aiCall).where(inArray(aiCall.id, loggedCallIds));
      loggedCallIds.length = 0; // clear array
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

  it("should successfully log an AI call and retrieve aggregated efficiency stats", async () => {
    expect(testStudentId).not.toBeNull();
    const studentId = testStudentId!;

    const loggedCall = await logAICall({
      studentId,
      purpose: "hint",
      modelUsed: "gemini-2.5-flash",
      promptTokens: 150,
      completionTokens: 80,
      estimatedTokensSaved: 50,
      cachedResponseUsed: false,
    });

    expect(loggedCall.id).toBeDefined();
    loggedCallIds.push(loggedCall.id);
    expect(loggedCall.studentId).toBe(studentId);
    expect(loggedCall.purpose).toBe("hint");
    expect(loggedCall.promptTokens).toBe(150);
    expect(loggedCall.completionTokens).toBe(80);
    expect(loggedCall.estimatedTokensSaved).toBe(50);

    // Log a second call
    const loggedCall2 = await logAICall({
      studentId,
      purpose: "explanation",
      modelUsed: "gemini-2.5-flash",
      promptTokens: 250,
      completionTokens: 120,
      estimatedTokensSaved: 150,
      cachedResponseUsed: true,
    });
    loggedCallIds.push(loggedCall2.id);

    // Get aggregated stats
    const stats = await getAIEfficiencyStats(studentId);

    expect(stats.totalCalls).toBe(2);
    expect(stats.totalPromptTokens).toBe(400);
    expect(stats.totalCompletionTokens).toBe(200);
    expect(stats.totalSavedTokens).toBe(200);
  });

  it("should return zeros when no stats exist for a student ID", async () => {
    const emptyStats = await getAIEfficiencyStats("00000000-0000-0000-0000-000000000000");
    expect(emptyStats.totalCalls).toBe(0);
    expect(emptyStats.totalPromptTokens).toBe(0);
    expect(emptyStats.totalCompletionTokens).toBe(0);
    expect(emptyStats.totalSavedTokens).toBe(0);
  });
});
