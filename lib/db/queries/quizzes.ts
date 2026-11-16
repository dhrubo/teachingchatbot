import "server-only";
import { desc, eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { runWithDbFallback } from "../client";
import { readLocalStore, writeLocalStore } from "../local-store";
import {
  type QuizAttemptRecord,
  quizAttempt,
  type StoredQuizQuestion,
} from "../schema";

export type BestQuizScoreSummary = {
  bestScorePercent: number;
  attemptsCount: number;
  passed: boolean;
  cleanLatest: boolean;
};

export async function createQuizAttempt(input: {
  learnerId: string;
  topicSlug: string;
  questions: StoredQuizQuestion[];
}): Promise<QuizAttemptRecord> {
  const now = new Date();
  const id = generateUUID();

  const row: QuizAttemptRecord = {
    id,
    learnerId: input.learnerId,
    topicSlug: input.topicSlug,
    status: "in_progress",
    totalQuestions: input.questions.length,
    currentIndex: 0,
    correctCount: 0,
    scorePercent: 0,
    tabSwitchCount: 0,
    pasteCount: 0,
    rapidGuessCount: 0,
    hintsUsed: 0,
    integrityFlags: [],
    questionsJson: input.questions,
    startedAt: now,
    completedAt: null,
  };

  return await runWithDbFallback(
    async (db) => {
      const inserted = await db.insert(quizAttempt).values(row).returning();
      return inserted[0] ?? row;
    },
    () => {
      const store = readLocalStore();
      store.quizAttempts[id] = {
        ...row,
        startedAt: now.toISOString(),
        completedAt: null,
      };
      writeLocalStore(store);
      return row;
    }
  );
}

export async function getQuizAttemptById(
  attemptId: string
): Promise<QuizAttemptRecord | null> {
  return await runWithDbFallback(
    async (db) => {
      const rows = await db
        .select()
        .from(quizAttempt)
        .where(eq(quizAttempt.id, attemptId))
        .limit(1);
      return rows[0] ?? null;
    },
    () => {
      const store = readLocalStore();
      const saved = store.quizAttempts[attemptId];
      if (!saved) {
        return null;
      }
      return {
        ...saved,
        startedAt: new Date(saved.startedAt),
        completedAt: saved.completedAt ? new Date(saved.completedAt) : null,
      };
    }
  );
}

export async function saveQuizAttemptProgress(
  record: QuizAttemptRecord
): Promise<QuizAttemptRecord> {
  return await runWithDbFallback(
    async (db) => {
      const updated = await db
        .update(quizAttempt)
        .set({
          status: record.status,
          currentIndex: record.currentIndex,
          correctCount: record.correctCount,
          scorePercent: record.scorePercent,
          tabSwitchCount: record.tabSwitchCount,
          pasteCount: record.pasteCount,
          rapidGuessCount: record.rapidGuessCount,
          hintsUsed: record.hintsUsed,
          integrityFlags: record.integrityFlags,
          questionsJson: record.questionsJson,
          completedAt: record.completedAt,
        })
        .where(eq(quizAttempt.id, record.id))
        .returning();
      return updated[0] ?? record;
    },
    () => {
      const store = readLocalStore();
      store.quizAttempts[record.id] = {
        ...record,
        startedAt: record.startedAt.toISOString(),
        completedAt: record.completedAt
          ? record.completedAt.toISOString()
          : null,
      };
      writeLocalStore(store);
      return record;
    }
  );
}

export async function getLearnerQuizAttempts(
  learnerId: string,
  limit = 20
): Promise<QuizAttemptRecord[]> {
  return await runWithDbFallback(
    async (db) =>
      await db
        .select()
        .from(quizAttempt)
        .where(eq(quizAttempt.learnerId, learnerId))
        .orderBy(desc(quizAttempt.startedAt))
        .limit(limit),
    () => {
      const store = readLocalStore();
      return Object.values(store.quizAttempts)
        .filter((row) => row.learnerId === learnerId)
        .map((row) => ({
          ...row,
          startedAt: new Date(row.startedAt),
          completedAt: row.completedAt ? new Date(row.completedAt) : null,
        }))
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, limit);
    }
  );
}

export async function getBestQuizScoresByTopic(
  learnerId: string
): Promise<Record<string, BestQuizScoreSummary>> {
  const attempts = await getLearnerQuizAttempts(learnerId, 100);
  const completed = attempts.filter((a) => a.status === "completed");
  const result: Record<string, BestQuizScoreSummary> = {};

  for (const attempt of completed) {
    const existing = result[attempt.topicSlug];
    if (existing) {
      existing.attemptsCount += 1;
      if (attempt.scorePercent > existing.bestScorePercent) {
        existing.bestScorePercent = attempt.scorePercent;
        existing.passed = attempt.scorePercent >= 80;
      }
    } else {
      result[attempt.topicSlug] = {
        bestScorePercent: attempt.scorePercent,
        attemptsCount: 1,
        passed: attempt.scorePercent >= 80,
        cleanLatest: attempt.integrityFlags.length === 0,
      };
    }
  }

  return result;
}
