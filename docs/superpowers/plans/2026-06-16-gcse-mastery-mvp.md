# GCSE Mastery MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the GCSE tutoring app into a Duolingo-style GCSE Mastery platform, adding Multi-Profile Selection, GCSE subjects/exam board onboarding, Socratic AI Hint/Feedback drawers, a Parent Heatmap, and an AI Efficiency Token Dashboard.

**Architecture:** A Unified Profile-Based parent-child data model (Approach 1) built on our existing Next.js App Router and Drizzle PostgreSQL layout. Active student context is managed seamlessly via an `active_student_id` secure session cookie.

**Tech Stack:** Next.js (App Router), React, Drizzle ORM, PostgreSQL (Neon), Tailwind CSS, Framer Motion, SWR.

---

## File Structure & Dependencies
The following files will be created or modified:
* **Schema & Queries:**
  * Modify: `lib/db/schema.ts` (Extend `studentProfile`, define `studentMisconception`, `aiCall`, `weeklyReport`)
  * Create: `lib/db/queries/analytics.ts` (AI calls, efficiency stats)
  * Modify: `lib/db/queries/student.ts` (Add profile list, multi-profile retrieval, and update `getStudentProfile`)
* **API Endpoints:**
  * Create: `app/api/profiles/route.ts` (Retrieve & create student profiles)
  * Create: `app/api/profiles/active/route.ts` (Set or toggle active student profile via cookie)
  * Create: `app/api/guardian/weekly-report/route.ts` (Retrieve parent summaries)
  * Create: `app/api/guardian/efficiency/route.ts` (Get AI cost/token efficiency statistics)
  * Create: `app/api/ai/hint/route.ts` (Socratic hints)
  * Create: `app/api/ai/explain-error/route.ts` ("Why was I wrong?" feedback)
* **Frontend Components & Pages:**
  * Create: `components/chat/profile-selector.tsx` (Grid-based profile selection & Add Profile CTA)
  * Create: `components/chat/onboarding-stepper.tsx` (Interactive wizard for student details)
  * Modify: `app/(chat)/page.tsx` (Conditional route displaying Profile Selector if active profile not set)
  * Create: `app/(parent)/guardian/page.tsx` (Parent dashboard, Heatmap, goals, AI Efficiency graphs)

---

## Tasks

### Task 1: Database Schema Extensions

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `lib/db/migrations/` (automatically generated migration)

- [ ] **Step 1: Extend `studentProfile` and define new tables in `lib/db/schema.ts`**

Add `selectedSubjects`, `examBoard` to `studentProfile`. Create `studentMisconception`, `aiCall`, and `weeklyReport` tables.

```typescript
// Add imports at top of schema.ts if not present: pgTable, text, integer, uuid, timestamp, boolean, varchar, json
// Modify studentProfile table inside lib/db/schema.ts:
export const studentProfile = pgTable("StudentProfile", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").notNull().references(() => user.id),
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
  // New fields:
  selectedSubjects: json("selectedSubjects").$type<string[]>().notNull().default([]),
  examBoard: varchar("examBoard", { length: 32 }).notNull().default("Unspecified"),
});

// Create new tables in lib/db/schema.ts:
export const studentMisconception = pgTable("StudentMisconception", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  studentId: uuid("studentId")
    .notNull()
    .references(() => studentProfile.id, { onDelete: "cascade" }),
  skillSlug: text("skillSlug").notNull(),
  misconception: text("misconception").notNull(),
  count: integer("count").notNull().default(1),
  lastSeenAt: timestamp("lastSeenAt").notNull().defaultNow(),
});

export const aiCall = pgTable("AICall", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  studentId: uuid("studentId")
    .references(() => studentProfile.id, { onDelete: "set null" }),
  purpose: varchar("purpose", { length: 64 }).notNull(), // 'hint' | 'explanation' | 'misconception' | 'weekly_summary'
  modelUsed: varchar("modelUsed", { length: 64 }).notNull(),
  promptTokens: integer("promptTokens").notNull().default(0),
  completionTokens: integer("completionTokens").notNull().default(0),
  estimatedTokensSaved: integer("estimatedTokensSaved").notNull().default(0),
  cachedResponseUsed: boolean("cachedResponseUsed").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const weeklyReport = pgTable("WeeklyReport", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  studentId: uuid("studentId")
    .notNull()
    .references(() => studentProfile.id, { onDelete: "cascade" }),
  summaryText: text("summaryText").notNull(),
  startOfWeek: timestamp("startOfWeek").notNull(),
  endOfWeek: timestamp("endOfWeek").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
```

- [ ] **Step 2: Generate Drizzle migrations**

Run: `pnpm db:generate`
Expected: SQL migration generated successfully under `lib/db/migrations/`.

- [ ] **Step 3: Run database migration**

Run: `pnpm db:migrate`
Expected: Migration executed successfully.

- [ ] **Step 4: Commit schema changes**

Run: `git add lib/db/schema.ts && git commit -m "db: extend schema for GCSE Mastery"`

---

### Task 2: Backend Query Helpers for Profiles & AI Logging

**Files:**
- Create: `lib/db/queries/analytics.ts`
- Modify: `lib/db/queries/student.ts`

- [ ] **Step 1: Update student queries to fetch active profiles**

Modify `lib/db/queries/student.ts` to read an optional `activeStudentId`.
```typescript
// Update getStudentProfile in lib/db/queries/student.ts:
export async function getStudentProfile(
  userId: string,
  activeStudentId?: string | null
): Promise<StudentProfile | null> {
  if (activeStudentId) {
    const [found] = await db
      .select()
      .from(studentProfile)
      .where(and(eq(studentProfile.id, activeStudentId), eq(studentProfile.userId, userId)));
    if (found) return found;
  }
  const students = await getStudentsByUserId({ userId });
  return students[0] ?? null;
}
```

- [ ] **Step 2: Create AI logs query helpers**

Create `lib/db/queries/analytics.ts`:
```typescript
import "server-only";
import { db } from "@/lib/db/client";
import { aiCall, weeklyReport } from "../schema";
import { eq, sql } from "drizzle-orm";

export async function logAICall({
  studentId,
  purpose,
  modelUsed,
  promptTokens,
  completionTokens,
  estimatedTokensSaved = 0,
  cachedResponseUsed = false,
}: {
  studentId?: string;
  purpose: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  estimatedTokensSaved?: number;
  cachedResponseUsed?: boolean;
}) {
  return await db.insert(aiCall).values({
    studentId,
    purpose,
    modelUsed,
    promptTokens,
    completionTokens,
    estimatedTokensSaved,
    cachedResponseUsed,
  });
}

export async function getAIEfficiencyStats(studentId: string) {
  const [stats] = await db
    .select({
      totalCalls: sql<number>`count(*)::int`,
      totalPromptTokens: sql<number>`sum(${aiCall.promptTokens})::int`,
      totalCompletionTokens: sql<number>`sum(${aiCall.completionTokens})::int`,
      totalSavedTokens: sql<number>`sum(${aiCall.estimatedTokensSaved})::int`,
    })
    .from(aiCall)
    .where(eq(aiCall.studentId, studentId));

  return stats || { totalCalls: 0, totalPromptTokens: 0, totalCompletionTokens: 0, totalSavedTokens: 0 };
}
```

- [ ] **Step 3: Add unit tests for AI logging**

Create `lib/__tests__/analytics.test.ts` to verify logging functions. Run `pnpm test:unit` to verify everything compiles and runs cleanly.

- [ ] **Step 4: Commit query helpers**

Run: `git add lib/db/queries/ && git commit -m "queries: add analytics loggers and multi-profile selectors"`

---

### Task 3: Profile Switcher & Student Onboarding Stepper

**Files:**
- Create: `components/chat/profile-selector.tsx`
- Create: `components/chat/onboarding-stepper.tsx`
- Modify: `app/(chat)/page.tsx`
- Create: `app/api/profiles/route.ts`
- Create: `app/api/profiles/active/route.ts`

- [ ] **Step 1: Create Profiles & Active Profiles API**

Create `/app/api/profiles/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getStudentsByUserId, createStudent } from "@/lib/db/queries/student";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const profiles = await getStudentsByUserId({ userId: session.user.id });
  return NextResponse.json(profiles);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { name, schoolYear, selectedSubjects, examBoard } = await req.json();
  const newStudent = await createStudent({
    userId: session.user.id,
    name,
    schoolYear,
  });
  // Add subjects and board config directly
  return NextResponse.json(newStudent);
}
```

Create `/app/api/profiles/active/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { studentId } = await req.json();
  const cookieStore = await cookies();
  cookieStore.set("active_student_id", studentId, { httpOnly: true, path: "/" });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Implement Onboarding Stepper component**

Build a step-by-step onboarding stepper modal in `components/chat/onboarding-stepper.tsx` supporting: Name -> School Year -> GCSE Subjects (Maths/Science) -> Exam Board. On submit, trigger profile creation and select as active profile.

- [ ] **Step 3: Implement Profile Selector Grid**

Build a visual Netflix-style grid in `components/chat/profile-selector.tsx` with rounded avatar blocks containing student names and details (Year 8/9). Provide an option to view the "Guardian Dashboard".

- [ ] **Step 4: Update home redirection page (`app/(chat)/page.tsx`)**

Read the `active_student_id` cookie. If it is unset, render the `<ProfileSelector />` page directly instead of redirecting.

- [ ] **Step 5: Verify the page loads cleanly in dev mode**

---

### Task 4: Student Dashboard and Topic Map

**Files:**
- Create: `app/(chat)/student/page.tsx`
- Create: `components/chat/student-header.tsx`

- [ ] **Step 1: Create Student Dashboard Hub (`app/(chat)/student/page.tsx`)**

Loads stats (XP, Streak, Badges) and displays beautiful circular topic nodes representing missions (Duolingo-style trees).

- [ ] **Step 2: Build gamified path nodes**

Use Framer Motion to make active nodes pulse and locked nodes have muted grayscale colors. Provide an overlay modal when clicking nodes allowing the student to launch the adaptive challenge.

- [ ] **Step 3: Verify navigation flows**

Ensure student pages compile. Run `pnpm build` to verify Next.js builds successfully.

---

### Task 5: Socratic AI Hint & Explanation Endpoints

**Files:**
- Create: `app/api/ai/hint/route.ts`
- Create: `app/api/ai/explain-error/route.ts`
- Modify: `components/chat/challenge-mode.tsx` (Wire hint and explain-error components)

- [ ] **Step 1: Create Socratic Hint API Route**

Create `/app/api/ai/hint/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: Request) {
  const { questionPrompt, studentAnswer } = await req.json();
  // Call LLM instructing to provide a short, supportive, Socratic hint
  // without revealing the mathematical answer.
  // Log token counts in the AICall table on finish.
  return NextResponse.json({ hint: "Think about the circumference formula: C = pi * d..." });
}
```

- [ ] **Step 2: Create Misconception Explainer API Route**

Create `/app/api/ai/explain-error/route.ts`:
Analyze the wrong input, map it to a deterministic mathematical explanation, and log misconception records in the database.

- [ ] **Step 3: Wire buttons inside Challenge Mode**

Add the "💡 Hint" and "🧐 Why am I wrong?" triggers to the interactive fullscreen Challenge interface.

- [ ] **Step 4: Commit AI routes**

Run: `git add app/api/ai/ && git commit -m "feat: add Socratic AI hints and misconception explainer routes"`

---

### Task 6: Guardian Dashboard & AI Efficiency Panel

**Files:**
- Create: `app/(parent)/guardian/page.tsx`
- Create: `components/guardian/mastery-heatmap.tsx`
- Create: `components/guardian/efficiency-dashboard.tsx`

- [ ] **Step 1: Create Parent Mastery Heatmap**

Create `components/guardian/mastery-heatmap.tsx` displaying a colored grid of the syllabus (Must, Should, Could, GCSE Bridge) based on the active student's `studentSkillMastery` scores.

- [ ] **Step 2: Create AI Efficiency Dashboard**

Create `components/guardian/efficiency-dashboard.tsx` fetching from `/api/guardian/efficiency` to visualize:
* Questions answered without AI vs with AI.
* Saved tokens from template questions.
* Cost per student.

- [ ] **Step 3: Verify everything builds and test-suite passes**

Run: `pnpm test:unit`
Run: `pnpm build`
Expected: Successful compile and zero type errors.

- [ ] **Step 4: Commit Guardian UI**

Run: `git add app/(parent)/guardian/ components/guardian/ && git commit -m "feat: complete guardian dashboard and AI efficiency visuals"`
