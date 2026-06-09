import "server-only";

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { DifficultyBand } from "@/lib/adaptive/update-mastery";
import {
  type QuestionArchetype,
  questionArchetype,
  questionAttempt,
  type StudentSkillMastery,
  studentSkillMastery,
} from "../schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

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
    .where(eq(studentSkillMastery.studentId, studentId));
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

export async function recordAttempt(
  values: typeof questionAttempt.$inferInsert
) {
  await db.insert(questionAttempt).values(values);
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
  }
) {
  await db
    .insert(studentSkillMastery)
    .values({
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
    })
    .onConflictDoUpdate({
      target: [studentSkillMastery.studentId, studentSkillMastery.skillSlug],
      set: {
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
      },
    });
}
