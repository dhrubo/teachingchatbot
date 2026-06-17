import "server-only";

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { questionAttempt, studentMisconception } from "@/lib/db/schema";
import { upsertWeakness } from "@/lib/db/queries/learning-science";

export const MIN_WRONG_FOR_BATCH = 5;
export const DEFAULT_LOOKBACK_DAYS = 30;

export type BatchResult = {
  analyzed: boolean;
  reasons: string[];
  skillsAnalyzed: number;
  weaknessesUpserted: number;
};

/** A raw wrong-answer row used for grouping. */
export type WrongAnswerRow = {
  skillSlug: string;
  misconceptionTag: string | null;
  studentAnswer: string;
  correctAnswer: string;
  createdAt: Date;
};

/** A group of wrong answers with the same (skillSlug, misconceptionTag). */
export type MisconceptionGroup = {
  skillSlug: string;
  tag: string;
  answers: WrongAnswerRow[];
};

/**
 * Group wrong answers by (skillSlug, misconceptionTag).
 * Pure — no DB calls, trivially testable.
 */
export function groupByMisconception(
  wrongAnswers: WrongAnswerRow[]
): MisconceptionGroup[] {
  const map = new Map<string, WrongAnswerRow[]>();
  for (const wa of wrongAnswers) {
    const key = `${wa.skillSlug}::${wa.misconceptionTag ?? "unknown"}`;
    const list = map.get(key);
    if (list) {
      list.push(wa);
    } else {
      map.set(key, [wa]);
    }
  }

  return Array.from(map.entries())
    .filter(([, answers]) => answers.length >= 2)
    .map(([key, answers]) => {
      const [skillSlug, tag] = key.split("::");
      return { skillSlug, tag, answers };
    });
}

/**
 * Build evidence JSON from a group of wrong answers.
 * Pure — no DB calls.
 */
export function buildEvidence(
  group: MisconceptionGroup
): Record<string, unknown> {
  return {
    count: group.answers.length,
    firstSeen: group.answers[group.answers.length - 1]?.createdAt?.toISOString(),
    lastSeen: group.answers[0]?.createdAt?.toISOString(),
    examples: group.answers.slice(0, 3).map((a) => ({
      studentAnswer: a.studentAnswer,
      correctAnswer: a.correctAnswer,
    })),
  };
}

/**
 * Count wrong answers since the last batch analysis (or ever).
 */
export async function countRecentWrongAnswers(
  studentId: string,
  sinceDays = DEFAULT_LOOKBACK_DAYS
): Promise<number> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(questionAttempt)
    .where(
      and(
        eq(questionAttempt.studentId, studentId),
        eq(questionAttempt.isCorrect, false),
        gte(questionAttempt.createdAt, since)
      )
    );
  return rows[0]?.total ?? 0;
}

/**
 * Check if batch analysis conditions are met.
 */
export async function shouldRunBatchAnalysis(
  studentId: string,
  sinceDays = DEFAULT_LOOKBACK_DAYS
): Promise<{ should: boolean; count: number }> {
  const count = await countRecentWrongAnswers(studentId, sinceDays);
  return { should: count >= MIN_WRONG_FOR_BATCH, count };
}

/**
 * Deterministic batch misconception analysis.
 *
 * Groups recent wrong answers by (skillSlug, misconceptionTag), detects
 * recurring patterns, and upserts into both studentMisconception and
 * StudentWeaknessProfile tables. Pure DB-driven — zero LLM calls.
 *
 * Returns a summary of what was analyzed and upserted.
 */
export async function runBatchMisconceptionAnalysis(
  studentId: string,
  sinceDays = DEFAULT_LOOKBACK_DAYS
): Promise<BatchResult> {
  const reasons: string[] = [];
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const wrongAnswers = await db
    .select({
      skillSlug: questionAttempt.skillSlug,
      misconceptionTag: questionAttempt.misconceptionTag,
      studentAnswer: questionAttempt.studentAnswer,
      correctAnswer: questionAttempt.correctAnswer,
      createdAt: questionAttempt.createdAt,
    })
    .from(questionAttempt)
    .where(
      and(
        eq(questionAttempt.studentId, studentId),
        eq(questionAttempt.isCorrect, false),
        gte(questionAttempt.createdAt, since)
      )
    )
    .orderBy(desc(questionAttempt.createdAt));

  if (wrongAnswers.length === 0) {
    return { analyzed: false, reasons: ["No wrong answers in period"], skillsAnalyzed: 0, weaknessesUpserted: 0 };
  }

  const groups = groupByMisconception(wrongAnswers);
  let weaknessesUpserted = 0;

  for (const group of groups) {
    const { skillSlug, tag, answers } = group;

    // Build evidence
    const evidence = buildEvidence(group);

    // Upsert into StudentWeaknessProfile (rich tracking)
    await upsertWeakness({
      studentId,
      subject: "maths",
      skillSlug,
      misconception: tag,
      evidence,
    });

    // Also upsert into studentMisconception (simple count table)
    const existing = await db
      .select()
      .from(studentMisconception)
      .where(
        and(
          eq(studentMisconception.studentId, studentId),
          eq(studentMisconception.skillSlug, skillSlug),
          eq(studentMisconception.misconception, tag)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(studentMisconception)
        .set({
          count: existing[0].count + 1,
          lastSeenAt: new Date(),
        })
        .where(eq(studentMisconception.id, existing[0].id));
    } else {
      await db.insert(studentMisconception).values({
        studentId,
        skillSlug,
        misconception: tag,
        count: answers.length,
        lastSeenAt: new Date(),
      });
    }

    weaknessesUpserted++;
    reasons.push(`Recorded "${tag}" for ${skillSlug} (${answers.length} occurrences)`);
  }

  return {
    analyzed: true,
    reasons,
    skillsAnalyzed: groups.length,
    weaknessesUpserted,
  };
}

/**
 * Fire-and-forget batch analysis. Runs only if trigger conditions met.
 * Never throws — safe to call without try/catch in non-critical paths.
 */
export async function tryBatchAnalysis(
  studentId: string
): Promise<void> {
  try {
    const { should } = await shouldRunBatchAnalysis(studentId);
    if (!should) return;
    await runBatchMisconceptionAnalysis(studentId);
  } catch (err) {
    console.warn("[batch-misconception] fire-and-forget analysis failed:", err);
  }
}
