import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
  pgTable,
  primaryKey,
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

// Per-topic progress for a single student.
export const topicProgress = pgTable(
  "TopicProgress",
  {
    studentId: uuid("studentId")
      .notNull()
      .references(() => studentProfile.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    // Which AQA GCSE Maths content domain this topic rolls up to.
    gcseDomain: varchar("gcseDomain", {
      enum: [
        "number",
        "algebra",
        "ratio_proportion_rates",
        "geometry_measures",
        "probability",
        "statistics",
      ],
    }),
    status: varchar("status", {
      enum: [
        "not_started",
        "introduced",
        "practising",
        "secure",
        "mastered",
      ],
    })
      .notNull()
      .default("not_started"),
    confidence: varchar("confidence", { enum: ["low", "medium", "high"] })
      .notNull()
      .default("low"),
    score: integer("score").notNull().default(0),
    successfulAttempts: integer("successfulAttempts").notNull().default(0),
    supportNeededAttempts: integer("supportNeededAttempts")
      .notNull()
      .default(0),
    lastPractisedAt: timestamp("lastPractisedAt"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studentId, table.topic] }),
  })
);

export type TopicProgress = InferSelectModel<typeof topicProgress>;

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
