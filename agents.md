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

## Phase 16 Log: Gemini Fallback & Topic-Gated Teaching Flow

- **Status:** Completed
- **Gemini fallback:** added `@ai-sdk/google`; `lib/ai/providers.ts` wraps the gateway model in `withGeminiFallback()` — on a thrown gateway error (e.g. the "requires a valid credit card" 403 / rate limits) it transparently retries the same call against Gemini (`GEMINI_FALLBACK_MODEL = "gemini-2.5-flash"`). `USE_GEMINI_ONLY=1` bypasses the gateway entirely for local dev. Gated on `GOOGLE_GENERATIVE_AI_API_KEY`; no-op when unset.
- **Topic-switch loop fix (root cause):** the old flow navigated to a new `/chat/{id}?topic=…` and auto-sent a "Let's start X." kickoff, which the tutor saw as a topic-start and re-triggered `startNewTopicSession` → infinite loop. Removed the navigation, `pendingTopicRef`, the `onFinish` `router.push`, and the `?topic=` auto-send effect.
- **Topics within one chat:** `startNewTopicSession` now begins an **in-chat topic thread** instead of a new chat. Its tool output carries a persisted marker (`{ topicId, title }`); since tool outputs are saved in `message.parts`, topic boundaries survive reload with **no DB schema change**. New `lib/topic-threads.ts` (`deriveTopicThreads`, `deriveTopicState`, `summariseTopics`) rederives threads, phases (`content`/`awaiting-accept`/`challenge`/`done`) and challenge tallies from the message list alone.
- **Full-screen start gate:** `TopicEntryOverlay` shows the topic intro + a "Start learning" button when a topic is created.
- **"Your Topics" header control:** `TopicsMenuButton`/`TopicsMenu` (a right-side `Sheet`) sits next to the Private/Public selector; selecting a topic filters the view to that topic's sub-conversation (`visibleMessages`), shown via `ActiveTopicBar`.
- **Content → challenge gating:** the readiness gate now uses the exact options `["Accept the challenge", "Read next topic", "Explain differently"]` (the client keys off these labels). The challenge stays hidden until "Accept"; "Explain differently" reteaches; "Read next topic" defers (banks) the challenge. `TopicContentCard` renders the gate buttons.
- **One challenge at a time + banked queue:** `AnswerPanel` is now challenge-scoped (renders only in `challenge` phase) with a "Challenge N of M" indicator (`ChallengeProgress`). Deferred challenges are banked and worked through one at a time.
- **Soft close-lock:** leaving/switching a topic with outstanding challenges pops a confirm dialog (`requestLeave`/`confirmLeave`/`cancelLeave` in the context, `AlertDialog` in `shell.tsx`).
- **Reopen reattach:** `resumeTopic` re-emits a marker so follow-ups on a reopened completed topic rejoin that topic's thread.
- **Removed:** `components/chat/topic-list-panel.tsx` (replaced by the header menu + in-thread bar).

---

## Phase 18 Log: Dead Code Cleanup & Modularity

- **Status:** Completed
- **Actions Taken:**
    1.  **Removed dead tool files:** `get-weather.ts`, `create-document.ts`, `edit-document.ts`, `update-document.ts`, `request-suggestions.ts` no longer exist in `lib/ai/tools/`.
    2.  **Cleaned up `lib/types.ts`:** Removed dead `ChatTools` entries (`getWeather`, `createDocument`, `updateDocument`, `requestSuggestions`), keeping only `askQuestion` and `startNewTopicSession`.
    3.  **Cleaned up `components/chat/message.tsx`:** Removed all rendering code for `tool-getWeather`, `tool-createDocument`, `tool-updateDocument`, `tool-requestSuggestions`. The file now only handles `tool-askQuestion`.
    4.  **Cleaned up `app/(chat)/api/chat/route.ts`:** Removed unused `systemPrompt` / `RequestHints` imports and `geolocation` call.
    5.  **Split queries into domain modules:** `lib/db/queries.ts` → `lib/db/queries/{auth,chat,document,student}.ts` + `index.ts`. Imports unchanged via barrel re-exports.
    6.  **Added `vitest` and unit tests** for core logic: `lib/ai/detect-large-input.test.ts` (22 tests), `lib/__tests__/active-question.test.ts` (13 tests), `lib/__tests__/topic-threads.test.ts` (19 tests). Run with `pnpm test:unit`.

## Phase 19 Log: No-Retry Wrong Answer Flow

- **Status:** Completed
- **Actions Taken:**
    1.  **`components/chat/answer-panel.tsx`:** Removed "Try again" button and retry logic. Wrong answers now show the explanation inline for 1.5s, then auto-submit the INCORRECT result to the tutor. The tutor receives the INCORRECT signal and asks a new, slightly easier question.
    2.  **`lib/ai/prompts-tutor.ts`:** Updated all sections referencing "Try again" / retry behavior to describe the new no-retry flow.

## Future Scope

### Science Curriculum Extension

Extend the app from maths-only to include Year 8/9 Science.

**Proposed approach:**
1.  **`lib/ai/curriculum.ts`:** Add `year8ScienceCurriculum` and `year9ScienceCurriculum` (topics: biology cells, chemistry reactions, physics forces/energy, etc.).
2.  **`lib/ai/prompts-tutor.ts`:** Update ROLE to "UK maths and science tutor". Add science-specific teaching guidance (experiments, diagrams, variables, units).
3.  **Home screen:** Extend the Year 8/9 toggle to a subject+year picker (Maths Y8, Maths Y9, Science Y8, Science Y9).
4.  **StudentProfile:** Add a `subjects` field so a student can be enrolled in maths, science, or both.
5.  **TopicProgress:** Use a composite key `(studentId, subject, topic)` so science and maths progress don't collide.
6.  **Prompt sections:** Add science-specific OUTPUT STYLE rules (e.g. "use 🧪 for experiments", draw force diagrams with arrows, explain variables clearly).

### Parent Mode & Syllabus Upload

Allow parents to upload their own syllabus, curriculum, and past test papers before their children use the app.

**Proposed approach:**
1.  **File upload endpoint:** New API route `/api/syllabus/upload` accepting PDF/docx/text. Store uploaded syllabus/test papers in Vercel Blob or Postgres.
2.  **Parent dashboard:** A private area where a parent can:
    - Upload a syllabus (PDF or text) → the system parses it into topic lists.
    - Upload past test papers → the system stores them and references question types.
    - Set custom exam dates and goals for each child.
    - Review child progress reports (already supported via parentReportNotes).
3.  **Syllabus → tutor context:** When a parent uploads a syllabus, inject it into the tutor's context as overriding/replacing the built-in `fullMathsCurriculum`. The tutor then teaches only topics from the uploaded syllabus.
4.  **Test paper analysis:** On upload, extract question types, difficulty levels, and topic coverage. The tutor can then generate practice questions matching the uploaded test style.
5.  **Access control:** Syllabus visibility is per-student, per-parent-account. Only the parent's children's sessions use the custom syllabus.
6.  **DB schema additions:**
    - `ParentSyllabus` table: `id, userId, title, content (parsed topics), fileUrl, createdAt`.
    - `TestPaper` table: `id, syllabusId, fileUrl, questionTypes (json), topics (json), createdAt`.
    - Link to `StudentProfile` to determine which syllabus applies.

## Recommendations

### 1. Monolithic prompt — consider retrieval augmentation
`lib/ai/prompts-tutor.ts` is 550+ lines. This eats context for longer conversations. Consider moving the full curriculum listing, gamification tables, and GCSE pathway details into a retrieval system (e.g. RAG or a tool the tutor calls on-demand) rather than inlining everything.

### 2. `upsertTopicProgress` undefined guard
In `lib/db/queries/student.ts`, the upsert uses `{ ...data }` directly in the `SET` clause. If `data` contains keys with `undefined` values, they may overwrite existing DB rows on conflict. Add a `pickDefined` helper to strip undefined entries before the upsert.

### 3. Guest email uniqueness
`guest-${Date.now()}` is millisecond-precision. Under very high concurrent signup load this could theoretically collide. Consider appending a random suffix or using a UUID.

### 4. Server-side vs prompt chunking paths diverge
The pre-processor in `lib/ai/detect-large-input.ts` returns a static "Open the Your topics bar" message, while the prompt's chunking rule says "Offer a few options (A/B/C…/Other)". A guest and a logged-in user get different experiences. Align these two paths.

### 5. Soft close-lock edge case
The confirm dialog (`requestLeave`) uses `selectedTopicId` to check `hasIncompleteChallenges`, but the user may have already switched `selectedTopicId` by the time the dialog resolves. Add a capture at request time.

### 6. Difficulty progression signal
The no-retry flow submits `[INCORRECT]` to the tutor. The prompt says "ask a slightly easier question", but there's no structured signal telling the tutor *how* much easier to go. Consider passing the student's actual answer in the submission so the tutor can analyse the error pattern.

### 7. Write more tests
Core logic covered (54 tests). Next priorities: `countAnsweredQuestions` edge cases, challenge banked queue behavior, the `resumeTopic` reattach flow, and the `submitAnswer` formatting logic.

---

## Phase 17 Log: Guest History Retention & Data Cleanup

- **Status:** Completed
- **Logged-in-only history:** the sidebar history list is now shown only to regular (logged-in) users; guests see the "Login to save…" prompt instead (`components/chat/sidebar-history.tsx`, gated on `user.type === "guest"`). Guests can still chat and resume within their session, but their history isn't listed or kept long-term.
- **1-day guest retention:** new `deleteExpiredGuestChats()` query (`lib/db/queries.ts`) purges chats belonging to guest users (`email like 'guest-%'`) older than 24h, along with their votes/messages/streams. Runs two ways: **opportunistically** (fire-and-forget on every `createGuestUser`) and via a **daily Vercel cron** (`vercel.json` → `/api/cron/cleanup-guests` at 03:00, protected by `CRON_SECRET`).
- **Delete removes all data:** verified `deleteChatById` already removes the chat plus all chat-scoped rows (votes, messages, streams). Documents/suggestions are user-scoped (not chat-scoped) and correctly untouched.
- **Env:** added `CRON_SECRET` to `.env.example`.

---

## Current Feature Summary

The app is a **teen-friendly, gamified Year 8/9 UK maths tutor** ("Duolingo for maths"):

- **Teaching:** short, visual, Socratic micro-lessons; one interactive question at a time; content shown first, then a gate before any challenge.
- **Topic threads:** one chat holds many per-topic sub-conversations; a full-screen start gate opens each topic; "Your Topics" header menu switches between them; a topic can't be closed (without confirming) until its challenges are done.
- **Interactive answers:** challenges answered via a form panel (radio/select/text) above the chat — not typed into chat — one at a time ("Challenge N of M"), with instant gamified ✅/❌ feedback + sound.
- **Persistence:** per-student profiles, topic mastery (0–5), XP / streaks / badges, short-term goals and exam dates, GCSE-domain rollups — all saved across sessions (multiple children per account). Topic threads/phases are rederived from saved messages, so they survive reload.
- **Plans & coaching:** goal-based learning plans with steps + %, check-ins, parent/child reports, GCSE-readiness tracking.
- **Model routing:** Vercel AI Gateway with a transparent **Gemini fallback** (and a `USE_GEMINI_ONLY` local-dev switch) when the gateway errors / is rate limited.
- **UX:** sunset theme, sound effects, live progress badges + achievement toast, large-input chunking, in-chat topic switching.
- **Tools:** `getCurriculumTopics`, `getStudentProgress`, `updateStudentProfile`, `updateTopicProgress`, `manageGoals`, `startNewTopicSession` (in-chat topic thread + marker), `askQuestion` (no legacy weather/document tools).
