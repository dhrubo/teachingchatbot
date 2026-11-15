import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export type EdexcelTier = "foundation" | "higher";
export type ExplanationLens =
  | "story"
  | "visual"
  | "pattern"
  | "exam"
  | "socratic";
export type ToneStyle = "encouraging" | "calm" | "friendly" | "direct";

export const learner = pgTable("RanedeerLearner", {
  id: uuid("id").primaryKey().notNull(),
  nickname: varchar("nickname", { length: 48 }).notNull().default("Scholar"),
  tier: varchar("tier", { enum: ["foundation", "higher"] })
    .notNull()
    .default("foundation"),
  targetGrade: integer("targetGrade").notNull().default(5),
  preferredLens: varchar("preferredLens", {
    enum: ["story", "visual", "pattern", "exam", "socratic"],
  })
    .notNull()
    .default("visual"),
  toneStyle: varchar("toneStyle", {
    enum: ["encouraging", "calm", "friendly", "direct"],
  })
    .notNull()
    .default("encouraging"),
  speechSpeed: varchar("speechSpeed", { length: 8 }).notNull().default("1.0"),
  dailyGoalMinutes: integer("dailyGoalMinutes").notNull().default(5),
  reminderEnabled: boolean("reminderEnabled").notNull().default(false),
  reminderHour: integer("reminderHour").notNull().default(17),
  reminderMinute: integer("reminderMinute").notNull().default(0),
  timezone: varchar("timezone", { length: 64 })
    .notNull()
    .default("Europe/London"),
  currentStreak: integer("currentStreak").notNull().default(0),
  longestStreak: integer("longestStreak").notNull().default(0),
  streakFreezes: integer("streakFreezes").notNull().default(1),
  lastPracticedDate: varchar("lastPracticedDate", { length: 10 }),
  totalXp: integer("totalXp").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type LearnerRecord = InferSelectModel<typeof learner>;

export const topicProgress = pgTable(
  "RanedeerTopicProgress",
  {
    learnerId: uuid("learnerId")
      .notNull()
      .references(() => learner.id, { onDelete: "cascade" }),
    topicSlug: varchar("topicSlug", { length: 96 }).notNull(),
    masteryScore: integer("masteryScore").notNull().default(0),
    currentStage: varchar("currentStage", { length: 32 })
      .notNull()
      .default("1.1"),
    lensesTried: json("lensesTried")
      .$type<ExplanationLens[]>()
      .notNull()
      .default([]),
    questionsAnswered: integer("questionsAnswered").notNull().default(0),
    questionsCorrect: integer("questionsCorrect").notNull().default(0),
    intervalDays: integer("intervalDays").notNull().default(1),
    nextReviewAt: timestamp("nextReviewAt"),
    lastStudiedAt: timestamp("lastStudiedAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.learnerId, table.topicSlug] }),
  })
);

export type TopicProgressRecord = InferSelectModel<typeof topicProgress>;

export type StoredTutorTurn = {
  id: string;
  role: "learner" | "tutor";
  text: string;
  spokenText?: string;
  lens?: ExplanationLens;
  stage?: string;
  createdAt: string;
};

export const tutorSession = pgTable("RanedeerTutorSession", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  learnerId: uuid("learnerId")
    .notNull()
    .references(() => learner.id, { onDelete: "cascade" }),
  topicSlug: varchar("topicSlug", { length: 96 }).notNull(),
  activeLens: varchar("activeLens", {
    enum: ["story", "visual", "pattern", "exam", "socratic"],
  })
    .notNull()
    .default("visual"),
  stage: varchar("stage", { length: 32 }).notNull().default("1.1"),
  turnsJson: json("turnsJson").$type<StoredTutorTurn[]>().notNull().default([]),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type TutorSessionRecord = InferSelectModel<typeof tutorSession>;

export const pushSubscriptionRecord = pgTable("RanedeerPushSubscription", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  learnerId: uuid("learnerId")
    .notNull()
    .references(() => learner.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("userAgent"),
  lastNotifiedDate: varchar("lastNotifiedDate", { length: 10 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type PushSubscriptionRow = InferSelectModel<
  typeof pushSubscriptionRecord
>;

export const dailyPracticeLog = pgTable(
  "RanedeerDailyPracticeLog",
  {
    learnerId: uuid("learnerId")
      .notNull()
      .references(() => learner.id, { onDelete: "cascade" }),
    practiceDate: varchar("practiceDate", { length: 10 }).notNull(),
    minutesPracticed: integer("minutesPracticed").notNull().default(0),
    xpEarned: integer("xpEarned").notNull().default(0),
    turnsCompleted: integer("turnsCompleted").notNull().default(0),
    usedFreeze: boolean("usedFreeze").notNull().default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.learnerId, table.practiceDate] }),
  })
);

export type DailyPracticeLogRecord = InferSelectModel<typeof dailyPracticeLog>;
