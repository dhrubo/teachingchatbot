import "server-only";
import { eq } from "drizzle-orm";
import { runWithDbFallback } from "../client";
import { readLocalStore, writeLocalStore } from "../local-store";
import {
  type EdexcelTier,
  type ExplanationLens,
  type LearnerRecord,
  learner,
  type ToneStyle,
} from "../schema";

export type LearnerConfigUpdate = {
  nickname?: string;
  tier?: EdexcelTier;
  targetGrade?: number;
  preferredLens?: ExplanationLens;
  toneStyle?: ToneStyle;
  speechSpeed?: string;
  dailyGoalMinutes?: number;
  reminderEnabled?: boolean;
  reminderHour?: number;
  reminderMinute?: number;
  timezone?: string;
};

function defaultLearner(id: string): LearnerRecord {
  const now = new Date();
  return {
    id,
    nickname: "Scholar",
    tier: "foundation",
    targetGrade: 5,
    preferredLens: "visual",
    toneStyle: "encouraging",
    speechSpeed: "1.0",
    dailyGoalMinutes: 5,
    reminderEnabled: false,
    reminderHour: 17,
    reminderMinute: 0,
    timezone: "Europe/London",
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 1,
    lastPracticedDate: null,
    totalXp: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getOrCreateLearner(id: string): Promise<LearnerRecord> {
  return await runWithDbFallback(
    async (db) => {
      const existing = await db
        .select()
        .from(learner)
        .where(eq(learner.id, id))
        .limit(1);
      if (existing[0]) {
        return existing[0];
      }

      const created = defaultLearner(id);
      const inserted = await db
        .insert(learner)
        .values(created)
        .onConflictDoNothing()
        .returning();
      if (inserted[0]) {
        return inserted[0];
      }

      const refetched = await db
        .select()
        .from(learner)
        .where(eq(learner.id, id))
        .limit(1);
      return refetched[0] ?? created;
    },
    () => {
      const store = readLocalStore();
      const saved = store.learners[id];
      if (saved) {
        return {
          ...saved,
          createdAt: new Date(saved.createdAt),
          updatedAt: new Date(saved.updatedAt),
        };
      }

      const created = defaultLearner(id);
      store.learners[id] = {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
      writeLocalStore(store);
      return created;
    }
  );
}

export async function updateLearnerConfig(
  id: string,
  patch: LearnerConfigUpdate
): Promise<LearnerRecord> {
  const current = await getOrCreateLearner(id);
  const now = new Date();

  return await runWithDbFallback(
    async (db) => {
      const updated = await db
        .update(learner)
        .set({
          ...patch,
          updatedAt: now,
        })
        .where(eq(learner.id, id))
        .returning();
      return updated[0] ?? { ...current, ...patch, updatedAt: now };
    },
    () => {
      const store = readLocalStore();
      const merged: LearnerRecord = {
        ...current,
        ...patch,
        updatedAt: now,
      };
      store.learners[id] = {
        ...merged,
        createdAt: merged.createdAt.toISOString(),
        updatedAt: merged.updatedAt.toISOString(),
      };
      writeLocalStore(store);
      return merged;
    }
  );
}

export async function updateLearnerStreakFields(
  id: string,
  fields: {
    currentStreak: number;
    longestStreak: number;
    streakFreezes: number;
    lastPracticedDate: string;
    totalXp: number;
  }
): Promise<LearnerRecord> {
  const current = await getOrCreateLearner(id);
  const now = new Date();

  return await runWithDbFallback(
    async (db) => {
      const updated = await db
        .update(learner)
        .set({
          ...fields,
          updatedAt: now,
        })
        .where(eq(learner.id, id))
        .returning();
      return updated[0] ?? { ...current, ...fields, updatedAt: now };
    },
    () => {
      const store = readLocalStore();
      const merged: LearnerRecord = {
        ...current,
        ...fields,
        updatedAt: now,
      };
      store.learners[id] = {
        ...merged,
        createdAt: merged.createdAt.toISOString(),
        updatedAt: merged.updatedAt.toISOString(),
      };
      writeLocalStore(store);
      return merged;
    }
  );
}

export async function listLearnersWithRemindersEnabled(): Promise<
  LearnerRecord[]
> {
  return await runWithDbFallback(
    async (db) =>
      await db.select().from(learner).where(eq(learner.reminderEnabled, true)),
    () => {
      const store = readLocalStore();
      return Object.values(store.learners)
        .filter((l) => l.reminderEnabled)
        .map((l) => ({
          ...l,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
        }));
    }
  );
}
