import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  name: text("name"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  role: varchar("role", { length: 16 }).notNull().default("user"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// A student (child) belonging to a user account. One account (parent) may
// own several students.
export const studentProfile = pgTable("StudentProfile", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  name: text("name").notNull(),
  schoolYear: varchar("schoolYear", { enum: ["8", "9"] }),
  examDate: timestamp("examDate"),
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  badges: json("badges").$type<string[]>().notNull().default([]),
  confidenceNotes: text("confidenceNotes"),
  parentReportNotes: text("parentReportNotes"),
  lastSessionAt: timestamp("lastSessionAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type StudentProfile = InferSelectModel<typeof studentProfile>;

// Short-term, agreed learning goals for a student (e.g. "Practise
// percentages by 20 June"). Separate from the long-term GCSE pathway.
export const studentGoal = pgTable("StudentGoal", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  studentId: uuid("studentId")
    .notNull()
    .references(() => studentProfile.id, { onDelete: "cascade" }),
  topic: text("topic"),
  description: text("description").notNull(),
  status: varchar("status", {
    enum: ["not_started", "in_progress", "achieved", "needs_more_work"],
  })
    .notNull()
    .default("not_started"),
  confidence: varchar("confidence", { enum: ["low", "medium", "high"] }),
  targetDate: timestamp("targetDate"),
  // Overall completion of the goal/plan, 0–100.
  progressPercent: integer("progressPercent").notNull().default(0),
  // Ordered learning-plan steps, e.g.
  // [{ label: "Basics", status: "done" }, { label: "Practice", status: "in_progress" }].
  planSteps: json("planSteps")
    .$type<{ label: string; status: "todo" | "in_progress" | "done" }[]>()
    .notNull()
    .default([]),
  notes: text("notes"),
  startedAt: timestamp("startedAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type StudentGoal = InferSelectModel<typeof studentGoal>;

export const missionProgress = pgTable(
  "MissionProgress",
  {
    studentId: uuid("studentId")
      .notNull()
      .references(() => studentProfile.id, { onDelete: "cascade" }),
    missionId: text("missionId").notNull(),
    status: varchar("status", {
      enum: ["not_started", "in_progress", "completed", "mastered"],
    })
      .notNull()
      .default("not_started"),
    phase: varchar("phase", {
      enum: ["intro", "lesson", "cards", "challenge", "results"],
    })
      .notNull()
      .default("intro"),
    score: integer("score").notNull().default(0),
    challengesDone: integer("challengesDone").notNull().default(0),
    challengesTotal: integer("challengesTotal").notNull().default(0),
    conceptCardsViewed: integer("conceptCardsViewed").notNull().default(0),
    lastLessonAt: timestamp("lastLessonAt"),
    completedAt: timestamp("completedAt"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studentId, table.missionId] }),
  })
);

export type MissionProgress = InferSelectModel<typeof missionProgress>;

// ---- Mission: a curriculum unit (e.g. "Percentages") ----
export const mission = pgTable("Mission", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  yearGroup: integer("yearGroup").notNull(),
  subject: text("subject").notNull().default("maths"),
  gcseDomain: varchar("gcseDomain", { length: 32 }).notNull(),
  order: integer("order").notNull(),
  estimatedMinutes: integer("estimatedMinutes").notNull(),
  isActive: boolean("isActive").notNull().default(true),
});

export type Mission = InferSelectModel<typeof mission>;

// ---- Lesson: a discrete teachable chunk within a mission ----
export const lesson = pgTable("Lesson", {
  id: serial("id").primaryKey(),
  missionId: integer("missionId")
    .notNull()
    .references(() => mission.id),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  order: integer("order").notNull(),
  difficultyBand: varchar("difficultyBand", {
    enum: ["foundation", "core", "stretch", "gcse_bridge"],
  })
    .notNull()
    .default("core"),
  estimatedMinutes: integer("estimatedMinutes").notNull(),
});

export type Lesson = InferSelectModel<typeof lesson>;

// ---- ConceptCard: a flash-card sized teaching point within a lesson ----
export const conceptCard = pgTable("ConceptCard", {
  id: serial("id").primaryKey(),
  lessonId: integer("lessonId")
    .notNull()
    .references(() => lesson.id),
  order: integer("order").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  visual: text("visual"),
  example: text("example"),
  misconception: text("misconception"),
});

export type ConceptCard = InferSelectModel<typeof conceptCard>;

// =================================================================
// Adaptive Learning Engine Schema
// =================================================================

export const difficultyBandEnum = pgEnum("difficultyBand", [
  "must",
  "should",
  "could",
  "gcse_bridge",
]);

export const questionTypeEnum = pgEnum("questionType", [
  "short_text",
  "multiple_choice",
  "numeric",
  "algebraic",
]);

// ---- Skill: a discrete, trackable GCSE skill (e.g. "algebra_solve_one_step") ----
// Skills are referenced by slug from archetypes/mastery, but are not a hard FK
// target — archetypes carry their own skillSlug so the engine can run without a
// fully-populated Skill table.
export const skill = pgTable("Skill", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull().default("maths"),
});

export type Skill = InferSelectModel<typeof skill>;

// ---- LessonSkill: a join table mapping skills to lessons ----
export const lessonSkill = pgTable(
  "LessonSkill",
  {
    lessonId: integer("lessonId")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    skillSlug: text("skillSlug").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.lessonId, table.skillSlug] }),
  })
);

// ---- QuestionArchetype: a reusable GCSE-style question template ----
// One archetype produces hundreds of concrete questions: variableSchemaJson
// supplies pools of values, and answerExpression is a JS template literal
// (e.g. "`${a+b}x`") evaluated with those values to compute the answer.
// Normal lesson, challenge, grading and scoring require ZERO LLM calls.
export const questionArchetype = pgTable("QuestionArchetype", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  subject: text("subject").notNull().default("maths"),
  yearGroup: integer("yearGroup").notNull(),
  missionSlug: text("missionSlug").notNull(),
  lessonSlug: text("lessonSlug").notNull(),
  skillSlug: text("skillSlug").notNull(),
  gcseDomain: text("gcseDomain").notNull(),
  difficultyBand: difficultyBandEnum("difficultyBand").notNull(),
  questionType: questionTypeEnum("questionType")
    .notNull()
    .default("short_text"),
  template: text("template").notNull(),
  variableSchemaJson: json("variableSchemaJson")
    .$type<Record<string, (string | number)[]>>()
    .notNull()
    .default({}),
  answerExpression: text("answerExpression").notNull(),
  acceptableAnswerRulesJson: json("acceptableAnswerRulesJson")
    .$type<{
      numeric?: boolean;
      tolerance?: number;
      caseInsensitive?: boolean;
      normaliseAlgebra?: boolean;
    }>()
    .notNull()
    .default({}),
  hintTemplate: text("hintTemplate"),
  explanationTemplate: text("explanationTemplate"),
  misconceptionTagsJson: json("misconceptionTagsJson")
    .$type<string[]>()
    .notNull()
    .default([]),
  sourceStyle: text("sourceStyle"),
  calculatorAllowed: boolean("calculatorAllowed").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type QuestionArchetype = InferSelectModel<typeof questionArchetype>;

// ---- GeneratedQuestion: optional runtime cache of rendered questions ----
export const generatedQuestion = pgTable("GeneratedQuestion", {
  id: uuid("id").defaultRandom().primaryKey(),
  archetypeId: uuid("archetypeId")
    .notNull()
    .references(() => questionArchetype.id, { onDelete: "cascade" }),
  variablesJson: json("variablesJson")
    .$type<Record<string, number | string>>()
    .notNull()
    .default({}),
  prompt: text("prompt").notNull(),
  optionsJson: json("optionsJson").$type<string[]>(),
  correctAnswer: text("correctAnswer").notNull(),
  hint: text("hint"),
  explanation: text("explanation"),
  difficultyBand: difficultyBandEnum("difficultyBand").notNull(),
  promptHash: text("promptHash").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type GeneratedQuestion = InferSelectModel<typeof generatedQuestion>;

// ---- StudentSkillMastery: persistent skill mastery for logged-in students ----
export const studentSkillMastery = pgTable(
  "StudentSkillMastery",
  {
    studentId: uuid("studentId")
      .notNull()
      .references(() => studentProfile.id, { onDelete: "cascade" }),
    skillSlug: text("skillSlug").notNull(),
    masteryScore: integer("masteryScore").notNull().default(0),
    currentBand: difficultyBandEnum("currentBand").notNull().default("must"),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    recentCorrectStreak: integer("recentCorrectStreak").notNull().default(0),
    recentWrongStreak: integer("recentWrongStreak").notNull().default(0),
    lastAttemptAt: timestamp("lastAttemptAt"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studentId, table.skillSlug] }),
  })
);

export type StudentSkillMastery = InferSelectModel<typeof studentSkillMastery>;

// ---- QuestionAttempt: a single answered question ----
// studentId for logged-in students; guestSessionId for guests (used to enforce
// the 5-questions-per-day guest limit).
export const questionAttempt = pgTable("QuestionAttempt", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("studentId").references(() => studentProfile.id, {
    onDelete: "cascade",
  }),
  guestSessionId: text("guestSessionId"),
  questionId: uuid("questionId").references(() => generatedQuestion.id, {
    onDelete: "set null",
  }),
  archetypeId: uuid("archetypeId")
    .notNull()
    .references(() => questionArchetype.id, { onDelete: "cascade" }),
  skillSlug: text("skillSlug").notNull(),
  difficultyBand: difficultyBandEnum("difficultyBand").notNull(),
  prompt: text("prompt").notNull(),
  studentAnswer: text("studentAnswer").notNull(),
  correctAnswer: text("correctAnswer").notNull(),
  isCorrect: boolean("isCorrect").notNull(),
  timeTakenMs: integer("timeTakenMs"),
  misconceptionTag: text("misconceptionTag"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type QuestionAttempt = InferSelectModel<typeof questionAttempt>;
