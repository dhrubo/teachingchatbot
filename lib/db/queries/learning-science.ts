import "server-only";

import { and, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  studentConfidence,
  type StudentConfidence,
  revisionQueue,
  type RevisionQueue,
  studentWeaknessProfile,
  type StudentWeaknessProfile,
  studentProfile,
} from "../schema";

// =====================================================================
// StudentConfidence
// =====================================================================

export async function upsertConfidence(params: {
  studentId: string;
  subject: string;
  skillSlug: string;
  topic?: string;
  confidence: number; // 1-5
}): Promise<void> {
  await db
    .insert(studentConfidence)
    .values({
      studentId: params.studentId,
      subject: params.subject,
      skillSlug: params.skillSlug,
      topic: params.topic ?? null,
      confidence: params.confidence,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        studentConfidence.studentId,
        studentConfidence.skillSlug,
      ],
      set: {
        confidence: params.confidence,
        subject: params.subject,
        topic: params.topic ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function getConfidence(
  studentId: string,
  skillSlug: string
): Promise<StudentConfidence | null> {
  const rows = await db
    .select()
    .from(studentConfidence)
    .where(
      and(
        eq(studentConfidence.studentId, studentId),
        eq(studentConfidence.skillSlug, skillSlug)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getConfidenceForSkills(
  studentId: string,
  skillSlugs: string[]
): Promise<StudentConfidence[]> {
  if (skillSlugs.length === 0) return [];
  return db
    .select()
    .from(studentConfidence)
    .where(
      and(
        eq(studentConfidence.studentId, studentId),
        inArray(studentConfidence.skillSlug, skillSlugs)
      )
    );
}

export async function getAllConfidence(
  studentId: string
): Promise<StudentConfidence[]> {
  return db
    .select()
    .from(studentConfidence)
    .where(eq(studentConfidence.studentId, studentId))
    .orderBy(desc(studentConfidence.updatedAt));
}

// =====================================================================
// RevisionQueue
// =====================================================================

const DEFAULT_INTERVALS = [1, 2, 4, 7, 14, 30, 60];

export function getIntervalForReviewCount(
  reviewCount: number,
  isCorrect: boolean,
  confidence: number
): number {
  if (!isCorrect) return 1; // wrong answer → reset to day 1

  // Confidence modifier: low confidence reduces interval, high increases
  const confidenceMod = confidence >= 4 ? 1.5 : confidence <= 2 ? 0.5 : 1;

  const baseIndex = Math.min(reviewCount, DEFAULT_INTERVALS.length - 1);
  const base = DEFAULT_INTERVALS[baseIndex];
  return Math.max(1, Math.round(base * confidenceMod));
}

export async function upsertRevisionQueue(
  studentId: string,
  skillSlug: string,
  subject: string,
  isCorrect: boolean,
  confidence: number,
  masteryScore: number
): Promise<void> {
  const existing = await db
    .select()
    .from(revisionQueue)
    .where(
      and(
        eq(revisionQueue.studentId, studentId),
        eq(revisionQueue.skillSlug, skillSlug)
      )
    )
    .limit(1);

  const now = new Date();
  const reviewCount = existing.length > 0 ? existing[0].reviewCount + 1 : 0;
  const interval = getIntervalForReviewCount(reviewCount, isCorrect, confidence);
  const nextReview = new Date(now.getTime() + interval * 86400000);

  if (existing.length > 0) {
    await db
      .update(revisionQueue)
      .set({
        masteryScore,
        confidence,
        intervalDays: interval,
        nextReviewDate: nextReview,
        reviewCount,
        lastReviewedAt: now,
      })
      .where(eq(revisionQueue.id, existing[0].id));
  } else {
    await db.insert(revisionQueue).values({
      studentId,
      skillSlug,
      subject,
      masteryScore,
      confidence,
      intervalDays: interval,
      nextReviewDate: nextReview,
      reviewCount: 1,
      lastReviewedAt: now,
    });
  }
}

export async function getRevisionQueue(
  studentId: string
): Promise<RevisionQueue[]> {
  return db
    .select()
    .from(revisionQueue)
    .where(eq(revisionQueue.studentId, studentId))
    .orderBy(revisionQueue.nextReviewDate);
}

export async function getDueReviews(
  studentId: string,
  limit = 5
): Promise<RevisionQueue[]> {
  return db
    .select()
    .from(revisionQueue)
    .where(
      and(
        eq(revisionQueue.studentId, studentId),
        lte(revisionQueue.nextReviewDate, new Date())
      )
    )
    .orderBy(revisionQueue.nextReviewDate)
    .limit(limit);
}

export async function getReviewsDueCount(studentId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(revisionQueue)
    .where(
      and(
        eq(revisionQueue.studentId, studentId),
        lte(revisionQueue.nextReviewDate, new Date())
      )
    );
  return rows[0]?.count ?? 0;
}

/** Weakest skills from revision queue — lowest mastery, highest interval decay. */
export async function getWeakRevisionSkills(
  studentId: string,
  limit = 3
): Promise<RevisionQueue[]> {
  return db
    .select()
    .from(revisionQueue)
    .where(eq(revisionQueue.studentId, studentId))
    .orderBy(revisionQueue.masteryScore, revisionQueue.intervalDays)
    .limit(limit);
}

// =====================================================================
// StudentWeaknessProfile
// =====================================================================

export async function upsertWeakness(params: {
  studentId: string;
  subject: string;
  skillSlug: string;
  misconception: string;
  topic?: string;
  confidence?: number;
  evidence?: Record<string, unknown>;
}): Promise<void> {
  const existing = await db
    .select()
    .from(studentWeaknessProfile)
    .where(
      and(
        eq(studentWeaknessProfile.studentId, params.studentId),
        eq(studentWeaknessProfile.skillSlug, params.skillSlug),
        eq(studentWeaknessProfile.misconception, params.misconception)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(studentWeaknessProfile)
      .set({
        frequency: existing[0].frequency + 1,
        confidence: params.confidence ?? existing[0].confidence,
        evidenceJson: params.evidence ?? existing[0].evidenceJson,
        lastSeenAt: new Date(),
      })
      .where(eq(studentWeaknessProfile.id, existing[0].id));
  } else {
    await db.insert(studentWeaknessProfile).values({
      studentId: params.studentId,
      subject: params.subject,
      skillSlug: params.skillSlug,
      misconception: params.misconception,
      topic: params.topic ?? null,
      confidence: params.confidence ?? 3,
      evidenceJson: params.evidence ?? {},
    });
  }
}

export async function getWeaknesses(
  studentId: string
): Promise<StudentWeaknessProfile[]> {
  return db
    .select()
    .from(studentWeaknessProfile)
    .where(eq(studentWeaknessProfile.studentId, studentId))
    .orderBy(desc(studentWeaknessProfile.frequency));
}

export async function getWeaknessesBySubject(
  studentId: string,
  subject: string
): Promise<StudentWeaknessProfile[]> {
  return db
    .select()
    .from(studentWeaknessProfile)
    .where(
      and(
        eq(studentWeaknessProfile.studentId, studentId),
        eq(studentWeaknessProfile.subject, subject)
      )
    )
    .orderBy(desc(studentWeaknessProfile.frequency));
}

export async function getMostCommonMistake(
  studentId: string
): Promise<{ misconception: string; frequency: number } | null> {
  const rows = await db
    .select({
      misconception: studentWeaknessProfile.misconception,
      frequency: studentWeaknessProfile.frequency,
    })
    .from(studentWeaknessProfile)
    .where(eq(studentWeaknessProfile.studentId, studentId))
    .orderBy(desc(studentWeaknessProfile.frequency))
    .limit(1);
  return rows[0] ?? null;
}

// =====================================================================
// Explanation style
// =====================================================================

export async function updatePreferredExplanationStyle(
  studentId: string,
  style: "visual" | "worked_example" | "analogy" | "step_by_step" | "exam_style"
): Promise<void> {
  await db
    .update(studentProfile)
    .set({ preferredExplanationStyle: style })
    .where(eq(studentProfile.id, studentId));
}

export async function getPreferredExplanationStyle(
  studentId: string
): Promise<string | null> {
  const rows = await db
    .select({ style: studentProfile.preferredExplanationStyle })
    .from(studentProfile)
    .where(eq(studentProfile.id, studentId))
    .limit(1);
  return rows[0]?.style ?? null;
}
