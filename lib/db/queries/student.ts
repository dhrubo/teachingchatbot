import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatbotError } from "@/lib/errors";
import {
  studentGoal,
  type StudentGoal,
  type StudentProfile,
  studentProfile,
  topicProgress,
  type TopicProgress,
} from "../schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

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

export async function createStudent({
  userId,
  name,
  schoolYear,
}: {
  userId: string;
  name: string;
  schoolYear?: "8" | "9";
}): Promise<StudentProfile> {
  try {
    const [created] = await db
      .insert(studentProfile)
      .values({ userId, name, schoolYear })
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

// --- Topic progress ---

export async function getTopicProgressByStudentId({
  studentId,
}: {
  studentId: string;
}): Promise<TopicProgress[]> {
  try {
    return await db
      .select()
      .from(topicProgress)
      .where(eq(topicProgress.studentId, studentId))
      .orderBy(asc(topicProgress.topic));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get topic progress"
    );
  }
}

export async function upsertTopicProgress({
  studentId,
  topic,
  data,
}: {
  studentId: string;
  topic: string;
  data: Partial<
    Pick<
      TopicProgress,
      | "gcseDomain"
      | "status"
      | "confidence"
      | "score"
      | "successfulAttempts"
      | "supportNeededAttempts"
      | "lastPractisedAt"
    >
  >;
}): Promise<TopicProgress> {
  try {
    const [row] = await db
      .insert(topicProgress)
      .values({ studentId, topic, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [topicProgress.studentId, topicProgress.topic],
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return row;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update topic progress"
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
