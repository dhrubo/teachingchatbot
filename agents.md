# Agent Log: Teaching Chatbot Transformation

This document tracks the changes made to transform the application into a personalized teaching chatbot for a 12-year-old student.

## Project Goal

To create a patient, encouraging, and Socratic tutor AI that exclusively covers a specific Year 8 Maths and Science curriculum.

## High-Level Plan

1.  **Phase 1: Establish Core Identity:** Create a new system prompt and a curriculum knowledge base.
2.  **Phase 2: Refocus AI Tools:** Remove irrelevant tools and add curriculum-aware tools.
3.  **Phase 3: Develop Teaching Capabilities:** Build new tools for generating practice questions and other educational interactions.

---

## Phase 1 Log: Core Identity Established

- **Status:** Completed
- **Actions Taken:**
    1.  **`agents.md`:** Created this documentation file to track progress.
    2.  **`lib/ai/curriculum.ts`:** Created a new file to serve as the curriculum knowledge base, starting with the Year 8 Maths topics.
    3.  **`lib/ai/prompts-tutor.ts`:** Created a new file containing the detailed system prompt for the "Online Tutor" persona.
    4.  **`app/(chat)/api/chat/route.ts`:** Modified the main API route to import and use the new `TUTOR_SYSTEM_PROMPT`.

The application's core AI is now operating with the new tutor persona and curriculum. The next step is to align its tools with its new purpose.

## Phase 2 Log: Tools Refocused

- **Status:** Completed
- **Actions Taken:**
    1.  **Modified `app/(chat)/api/chat/route.ts`:**
        - Removed imports for all previous tool functions (`createDocument`, `getWeather`, etc.).
        - Removed the `experimental_activeTools` property from the `streamText` call.
        - Removed the `tools` object from the `streamText` call.

The AI no longer has access to its old, non-teaching tools. This enforces the new persona and prevents it from suggesting or performing off-topic actions. It now operates as a purely conversational tutor.

## Phase 3 Log (Iteration 1): `getCurriculumTopics` Tool Implemented

- **Status:** Completed
- **Actions Taken:**
    1.  **`lib/ai/tools/get-curriculum-topics.ts`:** Created a new tool file to expose the Year 8 Maths curriculum.
    2.  **Modified `app/(chat)/api/chat/route.ts`:**
        - Imported the `getCurriculumTopics` tool.
        - Re-introduced the `experimental_activeTools` array and `tools` object within the `streamText` call, populating them with `getCurriculumTopics`.

The AI can now programmatically access the curriculum. This enables it to confirm its scope and potentially list available topics for the student.

## Phase 4 Log: Build Fixes & Stabilization

- **Status:** Completed
- **Context:** The earlier edits left `app/(chat)/api/chat/route.ts` in a non-compiling state. The following fixes were applied to get the app building and running.
- **Actions Taken:**
    1.  **`app/(chat)/api/chat/route.ts`:**
        - Removed a leftover dangling statement (`{ status: 200 });`) after the `DELETE` handler that broke parsing.
        - Added the missing `import { TUTOR_SYSTEM_PROMPT } from "@/lib/ai/prompts-tutor"`.
        - Collapsed duplicated `experimental_activeTools` / `tools` keys into a single definition and removed dangling references to the old template tools (`getWeather`, `createDocument`, `editDocument`, `updateDocument`, `requestSuggestions`).
        - The tutor now exposes only the `getCurriculumTopics` tool.
    2.  **`lib/ai/tools/get-curriculum-topics.ts`:**
        - Rewrote the export as a proper AI SDK tool using the `tool({ description, inputSchema, execute })` helper, matching the existing tool idiom in `lib/ai/tools/`. Previously it was a plain async function returning a string, which is not a valid `ToolSet` entry.

- **Environment notes:** Local dev requires `AUTH_SECRET` (generated via `openssl rand -base64 32`) and `POSTGRES_URL` in `.env.local`. AI Gateway works locally via the auto-provided `VERCEL_OIDC_TOKEN`. `BLOB_READ_WRITE_TOKEN` and `REDIS_URL` are optional (guarded in code).

The application now compiles cleanly and runs as a curriculum-scoped Socratic tutor.

---

## Phase 5 Log: Curriculum, Prompt & Home Screen for Year 8/9

- **Status:** Completed
- **Actions Taken:**
    1.  **`lib/ai/curriculum.ts`:** Expanded to cover **both Year 8 and Year 9** Maths, exported as `year8MathsCurriculum`, `year9MathsCurriculum`, and `fullMathsCurriculum`.
    2.  **`lib/ai/prompts-tutor.ts`:** Replaced with a full UK maths tutor + study-coach system prompt (British English, warm/Socratic, course structure, lesson behaviour).
    3.  **`components/chat/suggested-actions.tsx` + `lib/constants.ts`:** Home screen now shows real Year 8/9 maths topics via a **Year 8 / Year 9 toggle** with topic chips (Percentages, Ratio, Pythagoras, Indices, etc.), replacing the generic template suggestions.

## Phase 6 Log: Persistent Student Progress

- **Status:** Completed
- **Data model (`lib/db/schema.ts`):**
    - **`StudentProfile`** — one per child, owned by a user account (parent may own several): name, schoolYear (8/9), examDate, xp, streak, badges, confidence/parent notes, lastSessionAt.
    - **`TopicProgress`** (PK studentId+topic) — status (not_started…mastered), confidence, score 0–5, attempt counts, `gcseDomain`.
    - **`StudentGoal`** — short-term goals: topic, description, status, targetDate, confidence, notes, plus `planSteps` and `progressPercent` (added later).
    - Migrations: `0001`–`0003`.
- **Queries (`lib/db/queries.ts`):** get/create/update students, get/upsert topic progress, goal CRUD.
- **Tools (`lib/ai/tools/`):** `getStudentProgress`, `updateStudentProfile`, `updateTopicProgress`, `manageGoals`. Each takes `{ session }`, verifies ownership, and is curriculum-scoped. The tutor reads progress at session start and writes it back, so XP/scores/goals/exam dates persist across sessions.

## Phase 7 Log: GCSE Pathway & Goal-Based Plans

- **Status:** Completed
- Long-term **AQA GCSE** alignment: every topic rolls up to one of the six GCSE domains (`TopicProgress.gcseDomain`).
- **Goal-based learning plans:** `StudentGoal.planSteps` (Basics → Practice → Mixed → Exam-style) + `progressPercent`, set/advanced via `manageGoals`. Prompt covers plan creation, brief summaries (no plan-dump), in-session and returning check-ins (% + days remaining), adaptive pacing, and a logged-in-only guardrail.

## Phase 8 Log: Conversational Onboarding & Product Rules

- **Status:** Completed
- **Guest onboarding** reworked to be conversational: start teaching immediately, collect level/name gradually and benefit-framed, silent question counting with a soft account nudge ~Q4 and a polite, benefits-led prompt at Q5; seamless session continuity on sign-up.
- **Product behaviour** added to the prompt (guest limits, ≤5 active topics guidance, 0–100% progress framing, exam-prep topic naming).
- **Documentation** added in `docs/` (`product.md`, `help.md`, `developer.md`, `README.md`) with a status legend tagging each rule as enforced / tutor-behaviour / planned to avoid drift.

## Phase 9 Log: Short, Visual, Duolingo-Style Output

- **Status:** Completed
- Added a top-priority **OUTPUT STYLE** section: one idea + visual + 2–3 line explanation + ONE question, then STOP. Max 4–6 lines, no curriculum dumping, visuals (shapes, fraction bars, step arrows). Reconciled conflicts with LESSON BEHAVIOUR and the question ladder; parent reports/summaries exempt.

## Phase 10 Log: Large-Input Chunking (Anti-Stuck)

- **Status:** Completed
- **Prompt** chunking mode for big pasted lists, plus a **server-side pre-processor** (`lib/ai/detect-large-input.ts`) that, on the first message of a new chat, detects a pasted list/syllabus (conservative, structure-based — not naive comma/length) and short-circuits with a chunking reply **without calling the LLM**, logging observability fields. Mid-conversation lists fall back to the prompt rule.

## Phase 11 Log: Topic-Switch → New Session

- **Status:** Completed
- New `startNewTopicSession` tool emits a `new-topic-session` data part; the client (`hooks/use-active-chat.tsx`) opens a fresh `/chat/{id}` session for the new topic, preserving the old chat in history. Prompt covers related-vs-new-topic detection, clarify-on-ambiguous, and never switching silently.

## Phase 12 Log: UI — Sunset Theme, Sound, Auth

- **Status:** Completed
- **Sunset (coral/amber)** colour theme (light + dark) replacing greyscale; pop/wiggle/float animations; hover lift on chips.
- **Web Audio sound effects** (`lib/sounds.ts`) — send / receive / correct / wrong / pop — with a header **mute toggle** saved to localStorage (no audio files, no new deps).
- **Sign in / Sign up free** buttons in the header for guests.

## Phase 13 Log: Interactive Quizzes & Form-Based Answers

- **Status:** Completed
- **`askQuestion` tool** — the tutor poses ANY answer-needing question (quiz OR open prompt like name/year/topic choice) as structured data; `correctAnswer` is optional (present = graded with instant ✅/❌ + sound; absent = just collects the response).
- **`components/chat/answer-panel.tsx`** — answer controls (radio buttons / dropdown / text box) docked **above the chat input**; the student answers there, never by typing in the main chat. Client grades instantly, plays gamified feedback, then continues.
- Questions render as a distinct **"🎯 Challenge" card** in the thread (`components/chat/message.tsx`).
- A **readiness gate** ("I'm ready 🚀 / Explain more / Give me a minute") before graded challenges when introducing new concepts.

## Phase 14 Log: Engagement, Progress UI & Reading Layout

- **Status:** Completed
- **Engagement layer** in the prompt: mentor tone, motivating labels (🎯🔥🧠🚀⚡🎮🏆), inline progress, energetic CTAs, hint-before-reveal on wrong answers, adaptive difficulty.
- **Live progress UI** — header `ProgressPill` (🔥 streak · XP · 🏅 badge · N answered · %), `ProgressBar` above the answer panel, and an **`AchievementToast`** that pops/chimes on a new badge. Data surfaced via `topic-progress` / `xp-streak` / `achievement` stream parts.
- **Pinned "Your topics" panel** (`components/chat/topic-list-panel.tsx`) — parsed from a pasted list, collapsed-by-default thin bar, with **clickable topic rows** (tap to start) and tick-off as topics are worked through. Replaces plain-text A/B/C options.
- **Reading layout** — wider column (`max-w-5xl`), larger tutor text (16px), bigger challenge card / answer options, and the **"Thought for…" reasoning section collapsed by default**.

## Phase 15 Log: Infrastructure & Bug Fixes

- **Status:** Completed
- **Region fix:** pinned Vercel functions to `lhr1` (`vercel.json`) to co-locate with the `eu-west-2` Neon DB — cut `/api/history` from ~1.5s to ~150ms.
- **Deploy fix:** `pnpm-workspace.yaml` approves native build scripts (sharp/esbuild/bufferutil) for pnpm 11.
- **Chunking loop fix:** the server chunking reply now uses a proper `start`/`finish` message frame (was rendering nothing and looping to the home screen) and updates the chat title in the background.

---

## Current Feature Summary

The app is a **teen-friendly, gamified Year 8/9 UK maths tutor** ("Duolingo for maths"):

- **Teaching:** short, visual, Socratic micro-lessons; one interactive question at a time; readiness gate before challenges.
- **Interactive answers:** quizzes and prompts answered via a form panel (radio/select/text) above the chat — not typed into chat — with instant gamified ✅/❌ feedback + sound.
- **Persistence:** per-student profiles, topic mastery (0–5), XP / streaks / badges, short-term goals and exam dates, GCSE-domain rollups — all saved across sessions (multiple children per account).
- **Plans & coaching:** goal-based learning plans with steps + %, check-ins, parent/child reports, GCSE-readiness tracking.
- **UX:** sunset theme, sound effects, live progress badges + achievement toast, pinned topic list for big pastes, large-input chunking, automatic new-session on topic switch.
- **Tools:** `getCurriculumTopics`, `getStudentProgress`, `updateStudentProfile`, `updateTopicProgress`, `manageGoals`, `startNewTopicSession`, `askQuestion` (no legacy weather/document tools).
