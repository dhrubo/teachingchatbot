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
export type AccountRole = "parent" | "student";
export type GuardianRelationship =
  | "created_by_parent"
  | "watcher_code"
  | "email_invite";

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

export const account = pgTable("RanedeerAccount", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  role: varchar("role", { enum: ["parent", "student"] }).notNull(),
  displayName: varchar("displayName", { length: 64 }).notNull(),
  username: varchar("username", { length: 48 }).notNull().unique(),
  email: varchar("email", { length: 160 }).unique(),
  passwordHash: text("passwordHash"),
  pinHash: text("pinHash"),
  learnerId: uuid("learnerId").references(() => learner.id, {
    onDelete: "set null",
  }),
  watcherCode: varchar("watcherCode", { length: 12 }).unique(),
  invitedParentEmail: varchar("invitedParentEmail", { length: 160 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type AccountRecord = InferSelectModel<typeof account>;

export const guardianLink = pgTable(
  "RanedeerGuardianLink",
  {
    parentAccountId: uuid("parentAccountId")
      .notNull()
      .references(() => account.id, { onDelete: "cascade" }),
    learnerId: uuid("learnerId")
      .notNull()
      .references(() => learner.id, { onDelete: "cascade" }),
    relationship: varchar("relationship", {
      enum: ["created_by_parent", "watcher_code", "email_invite"],
    })
      .notNull()
      .default("watcher_code"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.parentAccountId, table.learnerId] }),
  })
);

export type GuardianLinkRecord = InferSelectModel<typeof guardianLink>;

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

export type QuizGameRoundType =
  | "step_choice"
  | "missing_working"
  | "fluency_solve"
  | "exam_solve"
  | "boss_solve";

export type StoredTutorTurn = {
  id: string;
  role: "learner" | "tutor";
  text: string;
  spokenText?: string;
  lens?: ExplanationLens;
  stage?: string;
  detectedTopicSlug?: string;
  detectedTopicTitle?: string;
  detectedEdexcelCode?: string;
  boardSteps?: Array<{ label: string; latex: string; note?: string }>;
  examTip?: string;
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

export type StoredQuizQuestion = {
  index: number;
  difficultyLabel: string;
  calculatorAllowed: boolean;
  promptText: string;
  spokenPrompt: string;
  hintSpoken: string;
  canonicalAnswer: string;
  acceptedVariants?: string[];
  unit?: string;
  workedSolution: string;
  roundType?: QuizGameRoundType;
  choices?: string[];
  workingLines?: string[];
  learnerAnswer?: string;
  isCorrect?: boolean;
  timeTakenMs?: number;
};

export const quizAttempt = pgTable("RanedeerQuizAttempt", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  learnerId: uuid("learnerId")
    .notNull()
    .references(() => learner.id, { onDelete: "cascade" }),
  topicSlug: varchar("topicSlug", { length: 96 }).notNull(),
  status: varchar("status", { enum: ["in_progress", "completed"] })
    .notNull()
    .default("in_progress"),
  totalQuestions: integer("totalQuestions").notNull().default(5),
  currentIndex: integer("currentIndex").notNull().default(0),
  correctCount: integer("correctCount").notNull().default(0),
  scorePercent: integer("scorePercent").notNull().default(0),
  tabSwitchCount: integer("tabSwitchCount").notNull().default(0),
  pasteCount: integer("pasteCount").notNull().default(0),
  rapidGuessCount: integer("rapidGuessCount").notNull().default(0),
  hintsUsed: integer("hintsUsed").notNull().default(0),
  integrityFlags: json("integrityFlags")
    .$type<string[]>()
    .notNull()
    .default([]),
  questionsJson: json("questionsJson")
    .$type<StoredQuizQuestion[]>()
    .notNull()
    .default([]),
  startedAt: timestamp("startedAt").notNull().defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type QuizAttemptRecord = InferSelectModel<typeof quizAttempt>;

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
