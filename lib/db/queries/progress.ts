import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { runWithDbFallback } from "../client";
import { readLocalStore, writeLocalStore } from "../local-store";
import {
  type DailyPracticeLogRecord,
  dailyPracticeLog,
  type ExplanationLens,
  type StoredTutorTurn,
  type TopicProgressRecord,
  type TutorSessionRecord,
  topicProgress,
  tutorSession,
} from "../schema";

const SPACED_INTERVALS = [1, 3, 7, 14, 30] as const;

export function computeNextIntervalDays(
  previousDays: number,
  wasCorrect: boolean
): number {
  if (!wasCorrect) {
    return 1;
  }
  for (const step of SPACED_INTERVALS) {
    if (step > previousDays) {
      return step;
    }
  }
  return 30;
}

export async function getLearnerTopicProgress(
  learnerId: string
): Promise<TopicProgressRecord[]> {
  return await runWithDbFallback(
    async (db) =>
      await db
        .select()
        .from(topicProgress)
        .where(eq(topicProgress.learnerId, learnerId))
        .orderBy(desc(topicProgress.lastStudiedAt)),
    () => {
      const store = readLocalStore();
      return Object.values(store.progress)
        .filter((row) => row.learnerId === learnerId)
        .map((row) => ({
          ...row,
          nextReviewAt: row.nextReviewAt ? new Date(row.nextReviewAt) : null,
          lastStudiedAt: new Date(row.lastStudiedAt),
        }))
        .sort((a, b) => b.lastStudiedAt.getTime() - a.lastStudiedAt.getTime());
    }
  );
}

export async function getSingleTopicProgress(
  learnerId: string,
  topicSlug: string
): Promise<TopicProgressRecord | null> {
  return await runWithDbFallback(
    async (db) => {
      const rows = await db
        .select()
        .from(topicProgress)
        .where(
          and(
            eq(topicProgress.learnerId, learnerId),
            eq(topicProgress.topicSlug, topicSlug)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },
    () => {
      const store = readLocalStore();
      const key = `${learnerId}:${topicSlug}`;
      const saved = store.progress[key];
      if (!saved) {
        return null;
      }
      return {
        ...saved,
        nextReviewAt: saved.nextReviewAt ? new Date(saved.nextReviewAt) : null,
        lastStudiedAt: new Date(saved.lastStudiedAt),
      };
    }
  );
}

export async function recordTopicActivity(input: {
  learnerId: string;
  topicSlug: string;
  lensUsed: ExplanationLens;
  stage: string;
  questionAttempt?: { correct: boolean; difficultyWeight?: number };
}): Promise<TopicProgressRecord> {
  const existing = await getSingleTopicProgress(
    input.learnerId,
    input.topicSlug
  );
  const now = new Date();
  const lensesSet = new Set<ExplanationLens>(existing?.lensesTried ?? []);
  lensesSet.add(input.lensUsed);
  const lensesTried = Array.from(lensesSet);

  let questionsAnswered = existing?.questionsAnswered ?? 0;
  let questionsCorrect = existing?.questionsCorrect ?? 0;
  let masteryScore = existing?.masteryScore ?? 10;
  let intervalDays = existing?.intervalDays ?? 1;

  if (input.questionAttempt) {
    questionsAnswered += 1;
    const weight = input.questionAttempt.difficultyWeight ?? 1;
    if (input.questionAttempt.correct) {
      questionsCorrect += 1;
      masteryScore = Math.min(100, masteryScore + Math.round(14 * weight));
      intervalDays = computeNextIntervalDays(intervalDays, true);
    } else {
      masteryScore = Math.max(5, masteryScore - 6);
      intervalDays = 1;
    }
  } else {
    const lensBonus = existing?.lensesTried.includes(input.lensUsed) ? 2 : 6;
    masteryScore = Math.min(85, Math.max(masteryScore, 10) + lensBonus);
  }

  const nextReviewAt = new Date(
    now.getTime() + intervalDays * 24 * 60 * 60 * 1000
  );

  const nextRow: TopicProgressRecord = {
    learnerId: input.learnerId,
    topicSlug: input.topicSlug,
    masteryScore,
    currentStage: input.stage,
    lensesTried,
    questionsAnswered,
    questionsCorrect,
    intervalDays,
    nextReviewAt,
    lastStudiedAt: now,
  };

  return await runWithDbFallback(
    async (db) => {
      await db
        .insert(topicProgress)
        .values(nextRow)
        .onConflictDoUpdate({
          target: [topicProgress.learnerId, topicProgress.topicSlug],
          set: {
            masteryScore: nextRow.masteryScore,
            currentStage: nextRow.currentStage,
            lensesTried: nextRow.lensesTried,
            questionsAnswered: nextRow.questionsAnswered,
            questionsCorrect: nextRow.questionsCorrect,
            intervalDays: nextRow.intervalDays,
            nextReviewAt: nextRow.nextReviewAt,
            lastStudiedAt: nextRow.lastStudiedAt,
          },
        });
      return nextRow;
    },
    () => {
      const store = readLocalStore();
      store.progress[`${input.learnerId}:${input.topicSlug}`] = {
        ...nextRow,
        nextReviewAt: nextRow.nextReviewAt?.toISOString() ?? null,
        lastStudiedAt: nextRow.lastStudiedAt.toISOString(),
      };
      writeLocalStore(store);
      return nextRow;
    }
  );
}

export async function getOrCreateTutorSession(
  learnerId: string,
  topicSlug: string,
  defaultLens: ExplanationLens
): Promise<TutorSessionRecord> {
  return await runWithDbFallback(
    async (db) => {
      const existing = await db
        .select()
        .from(tutorSession)
        .where(
          and(
            eq(tutorSession.learnerId, learnerId),
            eq(tutorSession.topicSlug, topicSlug)
          )
        )
        .orderBy(desc(tutorSession.updatedAt))
        .limit(1);
      if (existing[0]) {
        return existing[0];
      }

      const created = await db
        .insert(tutorSession)
        .values({
          learnerId,
          topicSlug,
          activeLens: defaultLens,
          stage: "1.1",
          turnsJson: [],
        })
        .returning();
      return created[0];
    },
    () => {
      const store = readLocalStore();
      const key = `${learnerId}:${topicSlug}`;
      const saved = store.sessions[key];
      if (saved) {
        return {
          ...saved,
          updatedAt: new Date(saved.updatedAt),
        };
      }

      const now = new Date();
      const created: TutorSessionRecord = {
        id: generateUUID(),
        learnerId,
        topicSlug,
        activeLens: defaultLens,
        stage: "1.1",
        turnsJson: [],
        updatedAt: now,
      };
      store.sessions[key] = {
        ...created,
        updatedAt: now.toISOString(),
      };
      writeLocalStore(store);
      return created;
    }
  );
}

export async function appendTutorSessionTurns(input: {
  sessionId: string;
  learnerId: string;
  topicSlug: string;
  activeLens: ExplanationLens;
  stage: string;
  newTurns: StoredTutorTurn[];
}): Promise<void> {
  const now = new Date();
  await runWithDbFallback(
    async (db) => {
      const existing = await db
        .select()
        .from(tutorSession)
        .where(eq(tutorSession.id, input.sessionId))
        .limit(1);
      const history = [
        ...(existing[0]?.turnsJson ?? []),
        ...input.newTurns,
      ].slice(-24);
      await db
        .update(tutorSession)
        .set({
          activeLens: input.activeLens,
          stage: input.stage,
          turnsJson: history,
          updatedAt: now,
        })
        .where(eq(tutorSession.id, input.sessionId));
    },
    () => {
      const store = readLocalStore();
      const key = `${input.learnerId}:${input.topicSlug}`;
      const prev = store.sessions[key];
      const history = [...(prev?.turnsJson ?? []), ...input.newTurns].slice(
        -24
      );
      store.sessions[key] = {
        id: prev?.id ?? input.sessionId,
        learnerId: input.learnerId,
        topicSlug: input.topicSlug,
        activeLens: input.activeLens,
        stage: input.stage,
        turnsJson: history,
        updatedAt: now.toISOString(),
      };
      writeLocalStore(store);
    }
  );
}

export async function clearTutorSessionTurns(
  learnerId: string,
  topicSlug: string
): Promise<void> {
  const now = new Date();
  await runWithDbFallback(
    async (db) => {
      await db
        .update(tutorSession)
        .set({ turnsJson: [], updatedAt: now })
        .where(
          and(
            eq(tutorSession.learnerId, learnerId),
            eq(tutorSession.topicSlug, topicSlug)
          )
        );
    },
    () => {
      const store = readLocalStore();
      const key = `${learnerId}:${topicSlug}`;
      const prev = store.sessions[key];
      if (prev) {
        prev.turnsJson = [];
        prev.updatedAt = now.toISOString();
        writeLocalStore(store);
      }
    }
  );
}

export async function upsertDailyPracticeLog(input: {
  learnerId: string;
  practiceDate: string;
  minutesDelta: number;
  xpDelta: number;
  turnsDelta: number;
  usedFreeze?: boolean;
}): Promise<DailyPracticeLogRecord> {
  return await runWithDbFallback(
    async (db) => {
      const existing = await db
        .select()
        .from(dailyPracticeLog)
        .where(
          and(
            eq(dailyPracticeLog.learnerId, input.learnerId),
            eq(dailyPracticeLog.practiceDate, input.practiceDate)
          )
        )
        .limit(1);

      const nextRow: DailyPracticeLogRecord = {
        learnerId: input.learnerId,
        practiceDate: input.practiceDate,
        minutesPracticed:
          (existing[0]?.minutesPracticed ?? 0) + input.minutesDelta,
        xpEarned: (existing[0]?.xpEarned ?? 0) + input.xpDelta,
        turnsCompleted: (existing[0]?.turnsCompleted ?? 0) + input.turnsDelta,
        usedFreeze: Boolean(existing[0]?.usedFreeze || input.usedFreeze),
      };

      await db
        .insert(dailyPracticeLog)
        .values(nextRow)
        .onConflictDoUpdate({
          target: [dailyPracticeLog.learnerId, dailyPracticeLog.practiceDate],
          set: {
            minutesPracticed: nextRow.minutesPracticed,
            xpEarned: nextRow.xpEarned,
            turnsCompleted: nextRow.turnsCompleted,
            usedFreeze: nextRow.usedFreeze,
          },
        });
      return nextRow;
    },
    () => {
      const store = readLocalStore();
      const key = `${input.learnerId}:${input.practiceDate}`;
      const prev = store.practiceLogs[key];
      const nextRow: DailyPracticeLogRecord = {
        learnerId: input.learnerId,
        practiceDate: input.practiceDate,
        minutesPracticed: (prev?.minutesPracticed ?? 0) + input.minutesDelta,
        xpEarned: (prev?.xpEarned ?? 0) + input.xpDelta,
        turnsCompleted: (prev?.turnsCompleted ?? 0) + input.turnsDelta,
        usedFreeze: Boolean(prev?.usedFreeze || input.usedFreeze),
      };
      store.practiceLogs[key] = nextRow;
      writeLocalStore(store);
      return nextRow;
    }
  );
}

export async function getRecentPracticeLogs(
  learnerId: string,
  limit = 14
): Promise<DailyPracticeLogRecord[]> {
  return await runWithDbFallback(
    async (db) =>
      await db
        .select()
        .from(dailyPracticeLog)
        .where(eq(dailyPracticeLog.learnerId, learnerId))
        .orderBy(desc(dailyPracticeLog.practiceDate))
        .limit(limit),
    () => {
      const store = readLocalStore();
      return Object.values(store.practiceLogs)
        .filter((log) => log.learnerId === learnerId)
        .sort((a, b) => b.practiceDate.localeCompare(a.practiceDate))
        .slice(0, limit);
    }
  );
}
