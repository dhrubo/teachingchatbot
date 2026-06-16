import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ChatbotError } from "@/lib/errors";
import {
  type StudentGoal,
  type StudentProfile,
  studentGoal,
  studentProfile,
  studentMisconception,
} from "../schema";

// --- Student profile ---

export async function getStudentsByUserId({
  userId,
}: {
  userId: string;
}): Promise<StudentProfile[]> {
  try {
    return await db
      .select()
      .from(studentProfile)
      .where(eq(studentProfile.userId, userId))
      .orderBy(asc(studentProfile.createdAt));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get students");
  }
}

/**
 * Gets the student profile associated with a user.
 * If activeStudentId is provided, returns that specific profile.
 * Otherwise, falls back to the first student profile found.
 */
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

export async function createStudent({
  userId,
  name,
  schoolYear,
  selectedSubjects,
  examBoard,
}: {
  userId: string;
  name: string;
  schoolYear?: "8" | "9";
  selectedSubjects?: string[];
  examBoard?: string;
}): Promise<StudentProfile> {
  try {
    const [created] = await db
      .insert(studentProfile)
      .values({
        userId,
        name,
        schoolYear,
        selectedSubjects: selectedSubjects ?? [],
        examBoard: examBoard ?? "Unspecified",
      })
      .returning();
    return created;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create student");
  }
}

export async function updateStudentProfile({
  studentId,
  userId,
  data,
}: {
  studentId: string;
  userId: string;
  data: Partial<
    Pick<
      StudentProfile,
      | "name"
      | "schoolYear"
      | "examDate"
      | "xp"
      | "streak"
      | "badges"
      | "confidenceNotes"
      | "parentReportNotes"
      | "lastSessionAt"
    >
  >;
}): Promise<StudentProfile | undefined> {
  try {
    const [updated] = await db
      .update(studentProfile)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(studentProfile.id, studentId), eq(studentProfile.userId, userId))
      )
      .returning();
    return updated;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update student profile"
    );
  }
}

// --- Short-term goals ---

export async function getGoalsByStudentId({
  studentId,
}: {
  studentId: string;
}): Promise<StudentGoal[]> {
  try {
    return await db
      .select()
      .from(studentGoal)
      .where(eq(studentGoal.studentId, studentId))
      .orderBy(desc(studentGoal.startedAt));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get goals");
  }
}

export async function createGoal({
  studentId,
  description,
  topic,
  targetDate,
  confidence,
  notes,
  planSteps,
  progressPercent,
}: {
  studentId: string;
  description: string;
  topic?: string | null;
  targetDate?: Date | null;
  confidence?: "low" | "medium" | "high" | null;
  notes?: string | null;
  planSteps?: StudentGoal["planSteps"] | null;
  progressPercent?: number | null;
}): Promise<StudentGoal> {
  try {
    const [row] = await db
      .insert(studentGoal)
      .values({
        studentId,
        description,
        topic: topic ?? null,
        targetDate: targetDate ?? null,
        confidence: confidence ?? null,
        notes: notes ?? null,
        ...(planSteps != null && { planSteps }),
        ...(progressPercent != null && { progressPercent }),
        status: "in_progress",
      })
      .returning();
    return row;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create goal");
  }
}

export async function updateGoal({
  goalId,
  studentId,
  data,
}: {
  goalId: string;
  studentId: string;
  data: Partial<
    Pick<
      StudentGoal,
      | "description"
      | "topic"
      | "status"
      | "confidence"
      | "targetDate"
      | "notes"
      | "planSteps"
      | "progressPercent"
    >
  >;
}): Promise<StudentGoal | undefined> {
  try {
    const [row] = await db
      .update(studentGoal)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(studentGoal.id, goalId), eq(studentGoal.studentId, studentId))
      )
      .returning();
    return row;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to update goal");
  }
}

export async function recordStudentMisconception({
  studentId,
  skillSlug,
  misconception,
}: {
  studentId: string;
  skillSlug: string;
  misconception: string;
}): Promise<void> {
  try {
    const [existing] = await db
      .select()
      .from(studentMisconception)
      .where(
        and(
          eq(studentMisconception.studentId, studentId),
          eq(studentMisconception.skillSlug, skillSlug),
          eq(studentMisconception.misconception, misconception)
        )
      );

    if (existing) {
      await db
        .update(studentMisconception)
        .set({
          count: existing.count + 1,
          lastSeenAt: new Date(),
        })
        .where(eq(studentMisconception.id, existing.id));
    } else {
      await db
        .insert(studentMisconception)
        .values({
          studentId,
          skillSlug,
          misconception,
          count: 1,
          lastSeenAt: new Date(),
        });
    }
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to record student misconception"
    );
  }
}
