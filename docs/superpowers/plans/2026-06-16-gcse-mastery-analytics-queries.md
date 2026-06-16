# GCSE Mastery Analytics Queries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement database query helper functions for multi-profile student retrieval and AI call logging, along with comprehensive unit tests and verification.

**Architecture:** Extend `student.ts` query functions to support `activeStudentId` and implement `analytics.ts` query functions for `aiCall` logging and token stats aggregation using Drizzle SQL.

**Tech Stack:** Next.js (App Router), Drizzle ORM, Vitest.

---

### Task 1: Update Student Profile Queries

**Files:**
- Modify: `lib/db/queries/student.ts`

- [ ] **Step 1: Modify `getStudentProfile` signature and implementation**

In `lib/db/queries/student.ts`, update `getStudentProfile` to accept `activeStudentId?: string | null` and query the matching student profile.

```typescript
export async function getStudentProfile(
  userId: string,
  activeStudentId?: string | null
): Promise<StudentProfile | null> {
  if (activeStudentId) {
    try {
      const [found] = await db
        .select()
        .from(studentProfile)
        .where(
          and(
            eq(studentProfile.id, activeStudentId),
            eq(studentProfile.userId, userId)
          )
        );
      if (found) return found;
    } catch (_error) {
      throw new ChatbotError(
        "bad_request:database",
        "Failed to get student profile by active ID"
      );
    }
  }
  const students = await getStudentsByUserId({ userId });
  return students[0] ?? null;
}
```

- [ ] **Step 2: Verify code compiling**

Run: `npx tsc --noEmit`
Expected: Success with no type errors.

---

### Task 2: Create AI Analytics Logging Queries

**Files:**
- Create: `lib/db/queries/analytics.ts`
- Modify: `lib/db/queries/index.ts`

- [ ] **Step 1: Implement `lib/db/queries/analytics.ts`**

Create `lib/db/queries/analytics.ts` with the following content:

```typescript
import "server-only";

import { db } from "@/lib/db/client";
import { aiCall, type AiCall } from "../schema";
import { ChatbotError } from "@/lib/errors";
import { eq, sql } from "drizzle-orm";

export async function logAICall(data: {
  studentId?: string | null;
  purpose: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  estimatedTokensSaved?: number;
  cachedResponseUsed?: boolean;
}): Promise<AiCall> {
  try {
    const [logged] = await db
      .insert(aiCall)
      .values({
        studentId: data.studentId ?? null,
        purpose: data.purpose,
        modelUsed: data.modelUsed,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        estimatedTokensSaved: data.estimatedTokensSaved ?? 0,
        cachedResponseUsed: data.cachedResponseUsed ?? false,
      })
      .returning();
    return logged;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to log AI call");
  }
}

export async function getAIEfficiencyStats(studentId: string) {
  try {
    const [stats] = await db
      .select({
        totalCalls: sql<number>`count(*)::int`,
        totalPromptTokens: sql<number>`sum(${aiCall.promptTokens})::int`,
        totalCompletionTokens: sql<number>`sum(${aiCall.completionTokens})::int`,
        totalSavedTokens: sql<number>`sum(${aiCall.estimatedTokensSaved})::int`,
      })
      .from(aiCall)
      .where(eq(aiCall.studentId, studentId));

    return {
      totalCalls: stats?.totalCalls ?? 0,
      totalPromptTokens: stats?.totalPromptTokens ?? 0,
      totalCompletionTokens: stats?.totalCompletionTokens ?? 0,
      totalSavedTokens: stats?.totalSavedTokens ?? 0,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get AI efficiency stats"
    );
  }
}
```

- [ ] **Step 2: Re-export in `lib/db/queries/index.ts`**

Update `lib/db/queries/index.ts` to include the following exports:

```typescript
export {
  getAIEfficiencyStats,
  logAICall,
} from "./analytics";
```

- [ ] **Step 3: Verify code compiling**

Run: `npx tsc --noEmit`
Expected: Success with no type errors.

---

### Task 3: Write Analytics Unit Tests

**Files:**
- Create: `lib/__tests__/analytics.test.ts`

- [ ] **Step 1: Implement `lib/__tests__/analytics.test.ts`**

Create `lib/__tests__/analytics.test.ts` with the following test cases to verify logging and stats calculation.

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db/client";
import { aiCall, studentProfile, user } from "@/lib/db/schema";
import { logAICall, getAIEfficiencyStats } from "@/lib/db/queries/analytics";
import { eq } from "drizzle-orm";

describe("Analytics Queries", () => {
  let testUserId: string;
  let testStudentId: string;

  beforeEach(async () => {
    // Clean database records if any
    await db.delete(aiCall);
    await db.delete(studentProfile);
    await db.delete(user);

    // Create seed user and student profile for test
    const [createdUser] = await db
      .insert(user)
      .values({
        email: "test-analytics@sara.com",
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
    await db.delete(aiCall);
    await db.delete(studentProfile);
    await db.delete(user);
  });

  it("should successfully log an AI call and retrieve aggregated efficiency stats", async () => {
    const loggedCall = await logAICall({
      studentId: testStudentId,
      purpose: "hint",
      modelUsed: "gemini-2.5-flash",
      promptTokens: 150,
      completionTokens: 80,
      estimatedTokensSaved: 50,
      cachedResponseUsed: false,
    });

    expect(loggedCall.id).toBeDefined();
    expect(loggedCall.studentId).toBe(testStudentId);
    expect(loggedCall.purpose).toBe("hint");
    expect(loggedCall.promptTokens).toBe(150);
    expect(loggedCall.completionTokens).toBe(80);
    expect(loggedCall.estimatedTokensSaved).toBe(50);

    // Log a second call
    await logAICall({
      studentId: testStudentId,
      purpose: "explanation",
      modelUsed: "gemini-2.5-flash",
      promptTokens: 250,
      completionTokens: 120,
      estimatedTokensSaved: 150,
      cachedResponseUsed: true,
    });

    // Get aggregated stats
    const stats = await getAIEfficiencyStats(testStudentId);

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
```

- [ ] **Step 2: Run unit tests**

Run: `pnpm test:unit`
Expected: All tests including the new `analytics.test.ts` pass successfully.

- [ ] **Step 3: Run full type check**

Run: `npx tsc --noEmit`
Expected: Success with no type errors.
