import "server-only";

import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { DifficultyBand } from "@/lib/adaptive/update-mastery";
import {
  type QuestionArchetype,
  questionArchetype,
  questionAttempt,
  type QuestionInstance,
  questionInstance,
  type StudentSkillMastery,
  studentSkillMastery,
} from "../schema";

/** Distinct skill slugs that have active archetypes for a given lesson slug. */
export async function getSkillSlugsForLesson(
  lessonSlug: string
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ skillSlug: questionArchetype.skillSlug })
    .from(questionArchetype)
    .where(
      and(
        eq(questionArchetype.lessonSlug, lessonSlug),
        eq(questionArchetype.isActive, true)
      )
    );
  return rows.map((r) => r.skillSlug);
}

/** Distinct skill slugs that have active archetypes for a given mission slug. */
export async function getSkillSlugsForMission(
  missionSlug: string
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ skillSlug: questionArchetype.skillSlug })
    .from(questionArchetype)
    .where(
      and(
        eq(questionArchetype.missionSlug, missionSlug),
        eq(questionArchetype.isActive, true)
      )
    );
  return rows.map((r) => r.skillSlug);
}

/** Active archetypes for a skill at a band, falling back to the skill's bands. */
export async function getArchetypesForSkillBand(
  skillSlug: string,
  band: DifficultyBand
): Promise<QuestionArchetype[]> {
  const exact = await db
    .select()
    .from(questionArchetype)
    .where(
      and(
        eq(questionArchetype.skillSlug, skillSlug),
        eq(questionArchetype.difficultyBand, band),
        eq(questionArchetype.isActive, true)
      )
    );
  if (exact.length > 0) {
    return exact;
  }
  // Fall back to any band for this skill so the run never dead-ends.
  return await db
    .select()
    .from(questionArchetype)
    .where(
      and(
        eq(questionArchetype.skillSlug, skillSlug),
        eq(questionArchetype.isActive, true)
      )
    );
}

export async function getMasteryForSkills(
  studentId: string,
  skillSlugs: string[]
): Promise<StudentSkillMastery[]> {
  if (skillSlugs.length === 0) {
    return [];
  }
  return await db
    .select()
    .from(studentSkillMastery)
    .where(
      and(
        eq(studentSkillMastery.studentId, studentId),
        inArray(studentSkillMastery.skillSlug, skillSlugs)
      )
    );
}

export async function getRecentAttempts(params: {
  studentId?: string;
  guestSessionId?: string;
  limit?: number;
}) {
  const { studentId, guestSessionId, limit = 10 } = params;
  const where = studentId
    ? eq(questionAttempt.studentId, studentId)
    : guestSessionId
      ? eq(questionAttempt.guestSessionId, guestSessionId)
      : undefined;
  const query = db
    .select({
      archetypeSlug: questionArchetype.slug,
      skillSlug: questionAttempt.skillSlug,
      isCorrect: questionAttempt.isCorrect,
      difficultyBand: questionAttempt.difficultyBand,
    })
    .from(questionAttempt)
    .leftJoin(
      questionArchetype,
      eq(questionAttempt.archetypeId, questionArchetype.id)
    )
    .orderBy(desc(questionAttempt.createdAt))
    .limit(limit);
  const rows = where ? await query.where(where) : await query;
  return rows.map((r) => ({
    archetypeSlug: r.archetypeSlug ?? "",
    skillSlug: r.skillSlug,
    isCorrect: r.isCorrect,
    difficultyBand: r.difficultyBand as DifficultyBand,
  }));
}

/** Count questions a guest has answered since the given time (for daily limit). */
export async function countGuestAttemptsSince(
  guestSessionId: string,
  since: Date
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionAttempt)
    .where(
      and(
        eq(questionAttempt.guestSessionId, guestSessionId),
        gte(questionAttempt.createdAt, since)
      )
    );
  return rows[0]?.count ?? 0;
}

// Loosely typed so callers can pass either the module `db` or a
// `db.transaction` callback's `tx` handle — both implement the same
// select/insert/update query-builder surface used below.
type DbClient = Pick<typeof db, "select" | "insert" | "update">;

export async function recordAttempt(
  values: typeof questionAttempt.$inferInsert,
  dbHandle: DbClient = db
) {
  await dbHandle.insert(questionAttempt).values(values);
}

export async function getAttemptByQuestionInstanceId(
  questionInstanceId: string
) {
  const rows = await db
    .select()
    .from(questionAttempt)
    .where(eq(questionAttempt.questionInstanceId, questionInstanceId))
    .limit(1);
  return rows[0] ?? null;
}

/** Upsert mastery after applying an answer result. */
export async function upsertMastery(
  studentId: string,
  next: {
    skillSlug: string;
    masteryScore: number;
    currentBand: DifficultyBand;
    recentCorrectStreak: number;
    recentWrongStreak: number;
    isCorrect: boolean;
  },
  dbHandle: DbClient = db
) {
  // Manual read-check-upsert to avoid Drizzle onConflictDoUpdate issues
  // with composite PKs across different Postgres/Drizzle versions.
  const existing = await dbHandle
    .select()
    .from(studentSkillMastery)
    .where(
      and(
        eq(studentSkillMastery.studentId, studentId),
        eq(studentSkillMastery.skillSlug, next.skillSlug)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await dbHandle
      .update(studentSkillMastery)
      .set({
        masteryScore: next.masteryScore,
        currentBand: next.currentBand,
        attempts: sql`${studentSkillMastery.attempts} + 1`,
        correct: next.isCorrect
          ? sql`${studentSkillMastery.correct} + 1`
          : sql`${studentSkillMastery.correct}`,
        recentCorrectStreak: next.recentCorrectStreak,
        recentWrongStreak: next.recentWrongStreak,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(studentSkillMastery.studentId, studentId),
          eq(studentSkillMastery.skillSlug, next.skillSlug)
        )
      );
  } else {
    await dbHandle.insert(studentSkillMastery).values({
      studentId,
      skillSlug: next.skillSlug,
      masteryScore: next.masteryScore,
      currentBand: next.currentBand,
      attempts: 1,
      correct: next.isCorrect ? 1 : 0,
      recentCorrectStreak: next.recentCorrectStreak,
      recentWrongStreak: next.recentWrongStreak,
      lastAttemptAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

// =====================================================================
// QuestionInstance — server-authoritative record of an offered question.
// The canonical answer/rules/misconception tags live ONLY here; the browser
// only ever receives a sanitised DTO. See lib/adaptive/question-instance.ts
// for the pure DTO/ownership/expiry helpers built on top of these rows.
// =====================================================================

const QUESTION_INSTANCE_TTL_MS = 30 * 60 * 1000;

export async function createQuestionInstance(values: {
  studentId?: string | null;
  guestSessionId?: string | null;
  archetypeId: string;
  skillSlug: string;
  difficultyBand: DifficultyBand;
  questionType: QuestionInstance["questionType"];
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  rules: Record<string, unknown>;
  misconceptionTags: string[];
  hint: string | null;
  explanation: string | null;
}): Promise<QuestionInstance> {
  const now = new Date();
  const rows = await db
    .insert(questionInstance)
    .values({
      studentId: values.studentId ?? null,
      guestSessionId: values.guestSessionId ?? null,
      archetypeId: values.archetypeId,
      skillSlug: values.skillSlug,
      difficultyBand: values.difficultyBand,
      questionType: values.questionType,
      prompt: values.prompt,
      optionsJson: values.options,
      correctAnswer: values.correctAnswer,
      rulesJson: values.rules,
      misconceptionTagsJson: values.misconceptionTags,
      hint: values.hint,
      explanation: values.explanation,
      createdAt: now,
      expiresAt: new Date(now.getTime() + QUESTION_INSTANCE_TTL_MS),
    })
    .returning();
  return rows[0];
}

export async function getQuestionInstanceById(
  id: string
): Promise<QuestionInstance | null> {
  const rows = await db
    .select()
    .from(questionInstance)
    .where(eq(questionInstance.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Atomically claim an instance for submission: only succeeds if no submission
 * has been recorded yet. Returns the claimed row, or null if another
 * concurrent request already claimed it (or it was never found).
 */
export async function claimQuestionInstanceForSubmission(
  id: string,
  idempotencyKey: string | null
): Promise<QuestionInstance | null> {
  const rows = await db
    .update(questionInstance)
    .set({
      submittedAt: new Date(),
      submittedIdempotencyKey: idempotencyKey,
    })
    .where(and(eq(questionInstance.id, id), isNull(questionInstance.submittedAt)))
    .returning();
  return rows[0] ?? null;
}

/**
 * Purge guest-only question data older than `olderThanHours` — the same
 * retention window already applied to guest chats
 * (`deleteExpiredGuestChats`, called from the existing
 * `/api/cron/cleanup-guests` job). Logged-in students' data (studentId set)
 * is never touched here. Deletes attempts before instances since the
 * instance FK is `onDelete: "set null"`, not cascade.
 */
export async function deleteExpiredGuestQuestionData({
  olderThanHours = 24,
}: { olderThanHours?: number } = {}): Promise<{
  deletedAttempts: number;
  deletedInstances: number;
}> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

  const deletedAttempts = await db
    .delete(questionAttempt)
    .where(
      and(
        isNotNull(questionAttempt.guestSessionId),
        lt(questionAttempt.createdAt, cutoff)
      )
    )
    .returning();

  const deletedInstances = await db
    .delete(questionInstance)
    .where(
      and(
        isNotNull(questionInstance.guestSessionId),
        lt(questionInstance.createdAt, cutoff)
      )
    )
    .returning();

  return {
    deletedAttempts: deletedAttempts.length,
    deletedInstances: deletedInstances.length,
  };
}
