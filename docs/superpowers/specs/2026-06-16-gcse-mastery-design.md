# Design Spec: GCSE Mastery Platform (MVP Student Mode & Guardian Mode)

## 1. Introduction & Core Goal
The core goal of the **GCSE Mastery** platform is to build a gamified, token-efficient, adaptive learning platform for GCSE students. The platform replaces conversational tutoring chats with a structured learning map (Duolingo-style) driven by local, deterministic quiz templates, utilizing AI specifically for hints, misconceptions, and parent summaries to maximize learning value and ensure token efficiency.

---

## 2. Core Architecture: Unified Profile-Based System (Approach 1)
To support seamless parent-student transitions and support multi-child families under a single subscription, the platform adopts a **Unified Profile-Based System**:
* The logged-in parent account is the **primary user**.
* Student profiles (children) are owned by this primary parent user.
* When launching the app, a Netflix-style **Profile Selector** screen is shown.
* Setting an active student profile writes a secure session cookie/localStorage state (`active_student_id`) which configures all student dashboards, missions, and adaptive challenges.

---

## 3. Database Schema Extensions (`lib/db/schema.ts`)
We will extend our existing Postgres Drizzle schema with the following schema updates:

### A. Add GCSE Metadata to `StudentProfile`
We add fields to track selected subjects and GCSE exam boards:
* `selectedSubjects`: `json("selectedSubjects").$type<string[]>().notNull().default([])` (e.g., `["Maths", "Science"]`)
* `examBoard`: `varchar("examBoard", { length: 32 })` (e.g., `'AQA'`, `'Edexcel'`, `'OCR'`, or `'Unspecified'`)

### B. Student Misconceptions (`StudentMisconception` table)
Aggregates student errors across various skills for pattern detection:
```typescript
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
```

### C. AI Logs & Efficiency (`AICall` table)
Tracks tokens, cost, and estimated cache savings:
```typescript
export const aiCall = pgTable("AICall", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  studentId: uuid("studentId")
    .references(() => studentProfile.id, { onDelete: "set null" }),
  purpose: varchar("purpose", { length: 64 }).notNull(), // 'hint' | 'explanation' | 'misconception' | 'weekly_summary'
  modelUsed: varchar("modelUsed", { length: 64 }).notNull(),
  promptTokens: integer("promptTokens").notNull().default(0),
  completionTokens: integer("completionTokens").notNull().default(0),
  estimatedTokensSaved: integer("estimatedTokensSaved").notNull().default(0), // tokens saved by using template-engine instead of live generation
  cachedResponseUsed: boolean("cachedResponseUsed").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
```

### D. Weekly Parent Reports (`WeeklyReport` table)
Stores parent progress overviews:
```typescript
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

---

## 4. Navigation Flow & Entry Points
* **`/` (Landing & Profile Switcher):**
  * If signed out: GCSE Mastery marketing screen with Auth controls.
  * If signed in: Profile selector screen displaying active profiles ("Alex - Year 8", "Sam - Year 9") and a prominent parent portal CTA ("Go to Guardian Dashboard").
* **`/onboarding` (Profile Creation):**
  * Stepper to add a student name, school year, subjects (Maths, Science placeholder), and exam board. Creates a new `StudentProfile`.
* **`/student` (Student Mode Hub):**
  * Gamified subject map, circular topic nodes (Mission progress), and stats panel (XP, Streaks, Badges).
* **`/guardian` (Guardian Portal):**
  * Aggregate views of children progress, active student mastery heatmap, custom goal setting panel, weekly AI summaries, and the **AI Efficiency Dashboard**.

---

## 5. Screen & Feature Specifications

### A. Socratic AI Assistance (In Adaptive Challenge)
When a student is doing a challenge (gated and graded locally via our deterministic `QuestionArchetype` engine), two AI assistance tools are accessible:
1. **AI Hint Button:** Sends the active question details to the AI, instructing it to provide a highly concise, warm, scaffolding hint *without giving away the answer*.
2. **AI "Why Was I Wrong?" Button:** Appears upon answering incorrectly. It sends the student's wrong answer alongside the correct template answer, returning a structured JSON diagnosis containing a clear misconception description.

### B. AI Efficiency Dashboard
A core product feature on the Guardian Portal showcasing cost-effectiveness and carbon savings:
* **Metrics Tracked:**
  * Total questions answered.
  * Total AI calls made.
  * Tokens consumed vs. estimated tokens saved (by serving deterministic template questions).
  * AI Efficiency percentage: `(1 - AI Calls / Total Answered) * 100`.
  * Cost per learner.

---

## 6. Implementation Checklist & Transition
1. Apply the schema updates in `lib/db/schema.ts` and generate a migration.
2. Build backend query helpers and `/api/` endpoints for profile management, weekly reports, and AI token logging.
3. Build the `/` Profile Selector screen and `/onboarding` stepper UI.
4. Build the unified `/student` subject dashboard and vertical Topic Map.
5. Build the `/guardian` parent dashboard, including the interactive Mastery Heatmap, Goal Assigning panel, and AI Efficiency statistics.
6. Verify and compile the Next.js routes.
