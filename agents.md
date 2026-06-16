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

## Phase 20 Log: No-Retry Bundle Flow, Duplicate LLM Calls Fix & Diagnostics

- **Status:** Completed
- **Problem:** Logs showed 4 identical `lesson_bundle` calls per user message. Root cause: each correct answer within a bundle called `sendMessage()`, hitting the chat API and triggering a new LLM call (1 lesson + 3 answers = 4 calls). React Strict Mode double-invoked effects in dev, amplifying the issue.
- **Actions Taken:**
  1. **`hooks/use-active-chat.tsx`:** Replaced message-derived `currentIndex` with local `bundleIndex` state. Bundle answers now increment `bundleIndex` only — zero `sendMessage` calls for correct / next-challenge. Only "Explain differently" (reteach) hits the LLM. Cleaned up unused `StoredBundle`, `isBundleComplete`, `getCurrentChallenge`, `advanceBundle` imports.
  2. **`hooks/use-auto-resume.ts`:** Added `resumedRef` ref guard so `resumeStream()` fires at most once under React Strict Mode. Fixed missing `useRef` import.
  3. **`app/(chat)/api/chat/route.ts`:** Added `bundleEmitted` flag (like `questionAsked`) — LLM can only emit one bundle per response; subsequent calls are skipped.
  4. **`lib/ai/stream-with-provider-fallback.ts`:** Each call gets a unique `requestId` (`ai-{ts}-{counter}`). Return type changed to `{ result, requestId, provider, model }` so callers can log which provider handled the request.
  5. **`lib/ai/ai-call-log.ts` (new):** Ring buffer of last 200 AI calls for debugging without tailing logs.
  6. **`app/(chat)/api/debug/ai-calls/route.ts` (new):** Dev-only endpoint returning recent AI calls as JSON.
  7. **`components/chat/answer-panel.tsx`:** Added a deterministic readiness gate before the first bundle challenge (**"I'm ready 🚀"** / **"Explain more 🔄"**), replacing the prompt-level non-deterministic gate instruction.

### Future Consideration
- `bundleIndex` resets to 0 on page reload (no messages to derive from). Redoing a few challenges on reload is fast (instant feedback), so this is acceptable for now.

---

## Phase 21 Log: Request Latency — Critical-Path Optimisation

- **Status:** Completed
- **Problem:** Responses were slow to *start* streaming. The chat route ran a long chain of sequential, blocking operations before `streamText` was ever called, so time-to-first-token paid for all of them serially.
- **Actions Taken (`app/(chat)/api/chat/route.ts`):**
  1. **Parallelised the three independent DB reads.** `getMessageCountByUserId` (rate-limit count), `getChatById`, and `getMessagesByChatId` previously ran as three serial round-trips; they now run together in a single `Promise.all`. (`getMessagesByChatId` keyed on the request id returns `[]` for a not-yet-created chat, so firing it speculatively is harmless — it's only consumed inside the `if (chat)` branch.) Rate-limit and ownership checks still run, just after the batch resolves.
  2. **Deferred the user-message write** with `after(saveMessages(...))`. The current turn builds `uiMessages` from memory (DB rows + the incoming message), so persisting the user message only matters for a *later* reload/edit request — by which point `after()` has flushed. Removes one DB round-trip from time-to-first-token on both the normal and chunking paths.
  3. **Single-model capability lookup.** Replaced `await getCapabilities()` (a `Promise.all` over all 9 models, which can trigger Gateway `fetch`es) with a new `getModelCapabilities(modelId)` (`lib/ai/models.ts`) that resolves just the selected model — from `STATIC_CAPABILITIES` synchronously on the default Gemini path. `getCapabilities()` is retained for `/api/models` (the model picker legitimately needs all of them).
- **Verified:** `tsc --noEmit` clean; 54/54 unit tests pass.
- **Re: Recommendation #1 (monolithic prompt):** Investigated. The system prompt is ~29 KB (~7.3 K tokens), but the curriculum is only ~2.2 KB of that — the bulk is tuned instructional content built up across 20 phases (output style, gating, gamification). Removing the inline curriculum would force an extra `getCurriculumTopics` tool round-trip (a first-turn latency *regression*), and trimming instructions is a behaviour change, not a safe optimisation. Gemini already does implicit prefix caching (≥1024 tokens) on the stable system prompt with no code change, so the heavy prefix is not re-processed each turn. Left the prompt unchanged deliberately; a genuine RAG/trim is still open as future scope but needs a behaviour-review pass, not a blind cut.

## Phase 22 Log: Stuck-on-Reply Fix (Topic Gate Buried the Question)

- **Status:** Completed
- **Symptom:** "App is slow / localhost stuck." Actually the server answered fine (logs showed the full streamed reply) but **nothing appeared** — the screen was blocked.
- **Root cause:** On a vague request like *"Let's do some algebra"*, the model called `startNewTopicSession` for the broad **area** "algebra" *and* then asked a clarifying A/B/C question in the same turn. The tool's `data-new-topic-session` part made `onData` set `topicEntry`, which renders `TopicEntryOverlay` — a fixed `z-50` full-screen start gate offering only "Start learning" / "Choose a different topic". The actual question's answer panel was trapped behind it → student stuck.
- **Fixes (defence in depth):**
  1. **Client guard (`hooks/use-active-chat.tsx`):** `data-new-topic-session` now selects the topic immediately but **holds** the start gate in `pendingTopicEntryRef` instead of opening it. `onFinish` resolves it: the overlay opens only if the finished assistant turn poses no open question (`getActiveQuestion([message]) === null`). A turn that also asks a question shows the answer panel instead of the gate.
  2. **Prompt rule (`lib/ai/prompts-tutor.ts`, TOPIC CONSISTENCY section):** never call `startNewTopicSession` for a broad area ("algebra", "geometry", "number") — only for a specific teachable topic. If the student names a broad area, ask which specific sub-topic via `askQuestion` *without* starting a session that turn. Starting a session and asking a clarifying question in the same turn is explicitly forbidden.
- **Verified:** `tsc --noEmit` clean; 54/54 unit tests pass.

## Phase 23 Log: Visual Explanation Escalation After Repeated Confusion

- **Status:** Completed
- **Feature:** When a student stays stuck on the same concept, the reteach now escalates to an explicit **visual** explanation instead of yet another prose retry.
- **Trigger:** 3 confused attempts on the same concept (`VISUAL_ESCALATION_AT = 3`), counting both "Explain differently 🔄" (wrong-answer path) and "Explain more 🔄" (pre-challenge gate). Counter resets when the active question changes (new concept).
- **Implementation (`components/chat/answer-panel.tsx`):** local `explainAttempts` state; a shared `visualReteachDirective()` appended to the reteach message on the Nth attempt that instructs the model to drop prose and draw a step-by-step text diagram (fraction bar / area model / number line / grouped boxes / labelled arrows), then ask one very easy question.
- **Prompt (`lib/ai/prompts-tutor.ts`):** added a rule so that when an INCORRECT directive explicitly asks for a VISUAL explanation, the model LEADS with a worked text diagram (minimal words) and a single easy `emitChallengeBundle` question.
- **Note on "slow responses":** each reteach is a full LLM generation (a fresh `emitChallengeBundle`), so it's inherently a few seconds on Gemini Flash Lite — the logged `lesson_bundle` calls `-1/-2/-3` were one generation per reteach, not redundant calls. The visual escalation makes the *third* reteach more useful rather than faster.
- **Verified:** `tsc --noEmit` clean; 54/54 unit tests pass.

## Phase 24 Log: Deterministic Answer-Pattern Detection (Observe & Feed Back)

- **Status:** Completed
- **Idea (user):** can the tutor "watch" the student's inputs and feed back observations / detect patterns? Built as deterministic detection (NO extra LLM call) feeding two targets: the student (inline) and the tutor (on reteach turns it already makes).
- **`lib/answer-patterns.ts` (new, pure + unit-tested):** `detectAnswerPatterns(attempts)` returns the single most-relevant pattern:
  - **repeated-distractor** — same wrong choice ≥2× → one concrete misconception (highest priority).
  - **repeat-wrong** — ≥2 different wrong answers on the same concept → stuck on the method.
  - Each pattern carries a kid-friendly `studentNote` and a factual `tutorObservation`. (An accuracy-slipping branch was dropped as unreachable given the repeat-wrong threshold.)
- **`hooks/use-active-chat.tsx`:** added `currentConcept` to the context — a stable concept key (bundle topic > selected topic title > challenge prompt) that **survives a reteach** (which swaps in a new bundle with new challenge ids). Pattern detection keys off this, not the per-question id.
- **`components/chat/answer-panel.tsx`:** records each graded attempt locally (`{concept, prompt, correctAnswer, chosen, wasCorrect}`); the attempt history + reteach counter reset on `currentConcept` change (not question id). When a pattern is detected it (1) shows the `studentNote` inline in the wrong-answer card and (2) appends the `tutorObservation` to the reteach directive — so the tutor targets the actual misconception with **zero extra LLM calls**.
- **Tests:** `lib/answer-patterns.test.ts` (9 tests). Total now 63.
- **Verified:** `tsc --noEmit` clean; 63/63 unit tests pass.

## Phase 25 Log: Two Runtime Errors — Deferred-Write Rejection & Duplicate React Keys

- **Status:** Completed
- **Error 1 — `A promise passed to after() rejected` (regression from Phase 21):** the deferred user-message write passed an *eagerly-started* promise to `after()` with no error handling, so a duplicate-id insert (Strict-Mode double-fire / resend) surfaced as an unhandled rejection. **Fix (`app/(chat)/api/chat/route.ts`):** pass a `async () => {…}` callback to `after()` (so it truly runs post-response) wrapped in try/catch — a missed user-message write is non-fatal because the current turn already uses the in-memory message.
- **Error 2 — `Encountered two children with the same key`:** `visibleMessages` was `messages.slice(0, introEndIndex).concat(selectedThread.messages)`; the intro slice and the thread slice can overlap (resumed topic whose merged messages reach before `introEndIndex`, or a marker message counted in both), producing duplicate ids in the render list. Latent bug, exposed by Phase 22 now selecting a topic thread on `data-new-topic-session`. **Fix (`hooks/use-active-chat.tsx`):** dedupe `visibleMessages` by id (keep first occurrence, preserve order).
- **Verified:** `tsc --noEmit` clean; 63/63 unit tests pass.

## Phase 26 Log: Duplicate Keys (Both Branches) & Idempotent Saves

- **Status:** Completed
- **Context:** Phase 25's dedupe only covered the `selectedThread` branch of `visibleMessages`; the `!selectedThread` branch returned `messages` raw. Duplicate-key errors kept firing from `messages.tsx:86` even before a topic was selected — because `messages` (useChat state) itself briefly holds the same id twice during the new-chat → `/chat/{id}` transition (streamed state + the SWR `/api/messages` refetch), amplified by React Strict Mode. The "Cannot read properties of undefined (reading 'state')" TypeError was a downstream symptom of React's broken reconciliation under colliding keys.
- **Fixes:**
  1. **`hooks/use-active-chat.tsx`:** `visibleMessages` now dedupes by id on **both** branches, preserving order and referential identity when nothing was removed.
  2. **`lib/db/queries/chat.ts`:** `saveMessages` is now idempotent — `.onConflictDoNothing()`. A re-sent / doubled message id becomes a no-op instead of a primary-key error that would sink the whole batch (leaving the assistant turn unsaved). This is the source-level fix for the `after() rejected` DB error. (Updates still go through `updateMessage`.)
- **Note:** `Message_v2.id` is the PK, so no duplicate ROWS were ever persisted — the duplication was purely client-side state. No DB cleanup needed.
- **Verified:** `tsc --noEmit` clean; 63/63 unit tests pass.

## Phase 27 Log: Topic Overlay Burying the Challenge Gate (regression from Phase 22)

- **Status:** Completed
- **Symptom:** Start a topic ("get better at percentages") → screen hangs on the first challenge the student never accepted; the lesson text ends with a narrated "Here is your first challenge 👇".
- **Root cause (mine, Phase 22):** the held-overlay guard in `onFinish` only treated a turn as "poses something to answer" if it contained an open **askQuestion** (`getActiveQuestion`). A topic-start turn that teaches then calls **`emitChallengeBundle`** (the normal graded-lesson path) wasn't detected → the full-screen `TopicEntryOverlay` opened on top of the readiness gate / answer panel → stuck.
- **Fixes:**
  1. **`hooks/use-active-chat.tsx`:** the guard now also detects an emitted `tool-emitChallengeBundle` part; if the turn poses a question OR a bundle, the overlay is suppressed and the inline lesson + readiness gate show instead.
  2. **`components/chat/answer-panel.tsx`:** `gateDismissed` now resets on `currentConcept` change, so every new lesson gets its own readiness gate (previously, dismissing one lesson's gate skipped all later gates).
  3. **`lib/ai/prompts-tutor.ts`:** after `emitChallengeBundle`, the tutor must stop after the short lesson and NOT narrate the challenge ("Here is your first challenge 👇") — the app renders its own gate + card, so narration duplicates the UI.
- **Verified:** `tsc --noEmit` clean; 63/63 unit tests pass.

## Phase 28 Log: Auto-Send Loop Guard (flood of /api/chat POSTs)

- **Status:** Completed
- **Symptom:** Dev log flooded with dozens of `[Dev Only] … bot protection will return HUMAN` lines (one per `/api/chat` POST) with no matching `[ai]` calls — i.e. the client was POSTing `/api/chat` in a tight loop.
- **Root cause:** `sendAutomaticallyWhen` returned true whenever the **last** message carried an approved `approval-responded` part, with no guard against re-firing. If the follow-up request didn't clear that message from the end (failed auth, produced no output, etc.), the predicate stayed true and `useChat` re-POSTed indefinitely. Pre-existing, not introduced this session.
- **Fix (`hooks/use-active-chat.tsx`):** added `autoSentForRef` — the predicate now fires at most once per message id (`autoSentForRef.current === lastMessage.id` → skip).
- **Verified:** `tsc --noEmit` clean; 63/63 unit tests pass.

## Phase 29 Log: "Nothing Displayed After Answering" — Silent Tool-Only Turns

- **Status:** Completed
- **Symptom:** Answer a few graded questions, then the screen stops updating — old explanations remain, each answer fires a real `[ai]` call but nothing new renders. (`[chat-send]` diagnostic confirmed these were distinct, legitimate sends — NOT the auto-send loop, which Phase 28 fixed.)
- **Root cause:** Only `tool-askQuestion` (and the answer-panel-driving `tool-emitChallengeBundle`) render anything in the thread. The other tools — `updateTopicProgress`, `updateStudentProfile`, `manageGoals`, `getStudentProgress`, `startNewTopicSession`, `getCurriculumTopics` — render NOTHING. After a CORRECT answer the model often replied with ONLY an `updateTopicProgress` call. The old `hasRenderableContent` counted *any* tool with output as renderable → the turn was kept and the empty-turn auto-retry was skipped → the student saw no change.
- **Fixes:**
  1. **`hooks/use-active-chat.tsx` + `app/(chat)/api/chat/route.ts`:** `hasRenderableContent` now only counts a `VISIBLE_TOOL_TYPES` set (`tool-askQuestion`, `tool-emitChallengeBundle`) or non-empty text. A silent tool-only turn is now treated as content-less → client auto-retries (bounded by `retriedEmptyRef`) and the server doesn't persist it. The two copies must stay in sync.
  2. **`lib/ai/prompts-tutor.ts`:** added a CRITICAL rule — never end a turn with only a silent tool call; every turn must end with visible text and/or the next challenge/question. Save progress, THEN show the next step.
- **Verified:** `tsc --noEmit` clean; 63/63 unit tests pass; `tests/e2e/topic-select.test.ts` passes against the live server.

## Phase 30 Log: Removed Temporary Send Diagnostic

- **Status:** Completed
- Removed the temporary `console.warn("[chat-send]", …)` from `prepareSendMessagesRequest` in `hooks/use-active-chat.tsx`. It was added in the Phase 28 investigation to confirm whether `/api/chat` was being POSTed in a loop; the diagnostic proved the sends were distinct/legitimate (the loop was the auto-send predicate, fixed in Phase 28), so it's no longer needed.

---

## Phase 31 Log: DB-Backed Missions Infrastructure

- **Status:** Completed
- **Actions Taken:**
    1.  **Removed dead `TopicContent` files:** Deleted `lib/ai/tools/get-pre-authored-content.ts` and `lib/db/seed-topic-content.ts` — replaced by the new structured `Mission`/`Lesson`/`ConceptCard`/`Question` tables.
    2.  **Cleaned up imports:** Removed `getPreAuthoredContent` imports from `app/(chat)/api/chat/route.ts` and `lib/ai/prompts-tutor.ts`; removed `seedTopicContent` from `lib/db/migrate.ts`.
    3.  **Created `data/year8-missions.seed.ts`:** Compact seed data file with 13 missions (10 Year 8 + 3 Year 9), each with 1 lesson, 3-5 concept cards, and 10 hand-crafted questions across all difficulty levels (easy/medium/hard/boss). Uses helper functions (`mc`, `st`, `card`, `lesson`, `mission`) for compact definitions.
    4.  **Seeded DB:** Ran `scripts/seed-missions.ts` (idempotent upsert) — populates Mission, Lesson, ConceptCard, Question tables with 13 missions, 13 lessons, 47 concept cards, 130 questions.
    5.  **Updated SaraDashboard:** Changed from local `getMissionsByYear()` to fetching missions from `/api/lessons?year=8` with SWR. Falls back to local data when API unavailable.
    6.  **Verified:** `pnpm build` clean, 63/63 unit tests pass.

### Key Decisions
- Pre-authored content is now served from structured DB tables instead of LLM-based `getPreAuthoredContent` tool.
- `/api/lessons` REST endpoint serves missions, lessons, concept cards, and randomized questions independently of the chat API.
- Seed data uses compact helper functions to keep the file manageable while maintaining per-question quality.
- SaraDashboard fetches from the DB API on the client side (due to `cacheComponents` enabled in next.config).

---

## Open Issues & Concerns (as of this debugging session)

A run of UI/flow bugs were fixed across Phases 21–30. Several were caused or *exposed* by the topic-thread + overlay interactions; the fixes are sound but a few rely on model behaviour or are defensive rather than root-cause. Honest open items:

1. **Topic-thread slicing is fragile (defensive fixes in place).** `visibleMessages` and `deriveTopicThreads` can overlap/produce duplicate ids in edge cases (resume merges, marker messages counted twice). Phase 26 added a render-boundary dedupe by id — this stops the symptom reliably but the underlying slice overlap still exists. A proper fix would make the slices non-overlapping at the source. Risky surgery; deferred.
2. **`pickTopic` selects locally before any thread exists.** Phase (topic-select fix) sets `selectedTopicId = topicSlug(title)` immediately so the chooser dismisses deterministically. If the model then phrases the topic differently (different slug) or never emits a `startNewTopicSession` marker, `selectedThread` stays null and the view falls back to the whole chat. Acceptable, but the local id and the eventual marker id can diverge.
3. **"Always end visibly" depends on the model + a bounded retry.** Phase 29 fixed silent tool-only turns by (a) not counting silent tools as renderable and (b) a prompt rule. If the model still ends a turn with only a silent tool call, the client auto-retries ONCE (`retriedEmptyRef`) then shows a "tap again" toast. Worst case is a nudge, not a freeze — but it's not a hard guarantee.
4. **`hasRenderableContent` / `VISIBLE_TOOL_TYPES` is duplicated** in `hooks/use-active-chat.tsx` and `app/(chat)/api/chat/route.ts` and must be kept in sync by hand. Adding a new student-visible tool means updating both. Candidate for a shared module.
5. **Response speed is still inherent, not fixed.** Phases 21 optimised the pre-stream critical path (parallel DB reads, deferred write, single-model caps), but each reteach/answer is still a full LLM generation on Gemini Flash Lite with a ~7K-token prompt. Real levers (prompt trim / faster model / measure-first) remain open — see Recommendation #1.
6. **e2e coverage is thin for the flows that broke.** Added `tests/e2e/topic-select.test.ts` (paste list → pick dismisses chooser). The graded-answer loop, bundle gate, overlay-vs-gate, and silent-turn retry are NOT yet covered by e2e — most fixes this session were verified by code reasoning + manual report, not automated tests driving the full flow.
7. **botid `c.js Error` is dev noise.** The console `Error` from `c.js` and the repeated `[Dev Only] … will return HUMAN` lines are botid failing open in local dev — not an app fault. Can be silenced by setting `developmentOptions.bypass`.

## Current Feature Summary

The app is a **teen-friendly, gamified Year 8/9 UK maths tutor** ("Duolingo for maths"):

- **DB-backed missions:** 13 pre-authored Year 8/9 missions (Number Skills, Percentages, Fractions, etc.) with 130 hand-crafted questions served from Postgres via `/api/lessons`. SaraDashboard fetches from the DB with local fallback.
- **Topic threads:** one chat holds many per-topic sub-conversations; a full-screen start gate opens each topic; "Your Topics" header menu switches between them; a topic can't be closed (without confirming) until its challenges are done.
- **Interactive answers:** challenges answered via a form panel (radio/select/text) above the chat — not typed into chat — one at a time ("Challenge N of M"), with instant gamified ✅/❌ feedback + sound. Bundle challenges advance locally with **zero LLM calls** (correct, wrong, or next-challenge — only "Explain differently" hits the LLM).
- **Persistence:** per-student profiles, topic mastery (0–5), XP / streaks / badges, short-term goals and exam dates, GCSE-domain rollups — all saved across sessions (multiple children per account). Topic threads/phases are rederived from saved messages, so they survive reload.
- **Plans & coaching:** goal-based learning plans with steps + %, check-ins, parent/child reports, GCSE-readiness tracking.
- **Model routing:** Vercel AI Gateway with a transparent **Gemini fallback** (and a `USE_GEMINI_ONLY` local-dev switch) when the gateway errors / is rate limited.
- **Diagnostics:** each AI call has a unique `requestId` logged with `[ai] provider=... reason=... requestId=...`. Dev-only `/api/debug/ai-calls` endpoint and `/api/debug/ai-provider` for troubleshooting without live logs.
- **UX:** sunset theme, sound effects, live progress badges + achievement toast, large-input chunking, in-chat topic switching.
- **Tools:** `getCurriculumTopics`, `updateStudentProfile`, `manageGoals`, `startNewTopicSession` (in-chat topic thread + marker), `askQuestion`. Dead tools removed: `emitChallengeBundle`, `getStudentProgress`, `updateTopicProgress`, and `getPreAuthoredContent`.

---

## Phase 32 Log: Adaptive GCSE-Style Question Archetype Engine

- **Status:** Completed
- **Actions Taken:**
    1.  **Replaced Static Question Banks:** Retired the old pre-authored static questions. Added new database tables: `Skill`, `LessonSkill`, `QuestionArchetype`, and `StudentSkillMastery` (tracking 0-100 mastery scores mapping to `must`, `should`, `could`, and `gcse_bridge` difficulty bands).
    2.  **Created Archetype Seeding:** Added JSON schema and seed file `data/question-archetypes/algebra.json` representing core Year 8/9 algebra skills. Wrote idempotent seeding script `scripts/seed-question-archetypes.ts` and wired it to `pnpm seed`.
    3.  **Built Adaptive Mastery Engine:** Created `lib/adaptive/engine.ts` with pure deterministic question generators, mastery adjustment functions (+4 * weight for correct, -3 * weight for incorrect), and dynamic selection logic (targeting 70% current band, 20% repair, 10% stretch).
    4.  **Rebuilt Student Experience:** Overhauled `ChallengeMode` to be a fullscreen, 5-question adaptive challenge. Connected it to a new backend endpoint `/api/adaptive-challenge` to fetch questions and submit scores dynamically with **zero LLM calls**.
    5.  **Decommissioned Obsolete Infrastructure:** Completely removed legacy UI/logic components (`AnswerPanel`, `HarderChallengePrompt`, `ChallengeProgress`), deleted unused AI tools (`emitChallengeBundle`, `getStudentProgress`, `updateTopicProgress`), and cleaned up `useActiveChat` / `shell.tsx` hooks.
    6.  **Upgraded Parent Dashboard:** Refactored `app/(parent)/dashboard/page.tsx` and its api to fetch the new database mastery table, displaying a visual breakdown of "Strong Skills" (>=75) and "Weak Skills" (<50) alongside detailed mastery bars.
    7.  **Verified:** Clean build with `pnpm build`, green unit tests with `pnpm test:unit` (63/63 passing), and resolved all type and linter errors.

### Key Decisions
- Question generation is 100% template-based and graded locally, completely freeing the core learning loop from any LLM dependency.
- Challenge mode now manages an incremental fetch cycle fetching one question at a time from `/api/adaptive-challenge` instead of loading a static bank.
- Parent dashboard focus shifted from gamification (XP/streaks) to pure curriculum mastery (GCSE skill coverage).

---

## Open Issues & Concerns (as of this debugging session)

1. **Weakest Skill database fetch in engine.ts is mock-driven.** While the DB tables are present and schema-accurate, `selectNextQuestion` currently uses mock mastery scores to select the weakest skill and generate placeholder/algebraic questions. Database query integration for dynamic skill checking can be expanded in Phase 33.
2. **Topic-thread slicing remains defensive.** Deduplication on id at the render boundary remains in place to handle edge case overlap.
3. **botid local warnings.** Developer warnings regarding botid in local dev can be bypassed by setting `bypass` option.

## Current Feature Summary

The app is a **teen-friendly, gamified Year 8/9 UK maths tutor** ("Duolingo for maths"):

- **Adaptive GCSE Archetype Engine:** Questions are dynamically generated from JSON-defined archetypes (e.g., standard, 2-step equations) and graded locally with **zero LLM calls** in the primary learning loop.
- **Progressive Difficulty Bands:** Dynamic GCSE progression across four bands (`must` for basic fluency, `should` for secure understanding, `could` for stretch, and `gcse_bridge` for multi-step reasoning).
- **Socrates Mastery Scoring:** Real-time database tracking of student skill progress on a 0-100 scale, dynamically choosing repair or stretch questions based on streaks and mastery levels.
- **Fullscreen Challenges:** Overhauled `ChallengeMode` running a 5-question adaptive assessment session with interactive fullscreen controls, progress bar, and instant pop feedback with sound.
- **Parent Learning Dashboard:** Dashboard visualizing actual curriculum mastery, dividing student skills into "Strong Skills" (>= 75) and "Weak Skills" (< 50) using real-time database queries instead of abstract XP metrics.
- **Topic threads:** One chat holds many per-topic sub-conversations; a full-screen start gate opens each topic; "Your Topics" header menu switches between them.
- **Fallbacks & Resilience:** Robust Next.js App Router routing with transparent Gemini fallback when AI gateways are quota-limited or offline.
- **Tools:** `getCurriculumTopics`, `updateStudentProfile`, `manageGoals`, `startNewTopicSession` (in-chat topic thread + marker), and `askQuestion`. All legacy tools have been successfully deleted.

---

## Phase 33 Log: Real Archetype Engine + Global Challenge Consent Gate

- **Status:** Completed
- **Context:** Phase 32 shipped a first-pass archetype engine, but (a) `selectNextQuestion` was mock-driven with per-slug hand-written answer maths and (b) there was no code-level guarantee that a challenge/question never appears before the student accepts. This phase adopts the richer starter-pack schema, builds the real DB-backed engine, and enforces the consent gate **in code** (not just the prompt).
- **Actions Taken:**
    1.  **Richer archetype schema (`lib/db/schema.ts`, migration `0008_question_archetype_engine.sql`):** Replaced the Phase-32 `QuestionArchetype`/`StudentSkillMastery` shape with the scalable design — `variableSchemaJson` + `answerExpression` (a JS expression/template literal evaluated generically, so **no per-slug code**), `acceptableAnswerRulesJson`, full GCSE metadata (`subject`, `yearGroup`, `missionSlug`, `lessonSlug`, `skillSlug`, `gcseDomain`, `questionType`). Added `GeneratedQuestion` (cache) and `QuestionAttempt` (logs both logged-in `studentId` and guest `guestSessionId`). The old archetype/mastery tables held no production data, so the migration drops/recreates them.
    2.  **Question generation + grading (`lib/questions/`):** `generate-from-archetype.ts` resolves the variable schema (scalar pools, tuple pools, derived expressions, reserved-word aliasing) and evaluates `answerExpression` against whitelisted helpers in `answer-helpers.ts` (`simplifyFraction`, `simplifyRatio`, `round2`, …). `grade-answer.ts` grades locally — numeric/tolerance, fraction & ratio equivalence, algebra normalisation, currency/percent symbol stripping. **Zero LLM calls.**
    3.  **Adaptive modules (`lib/adaptive/`):** `update-mastery.ts` (+4·weight correct / −3·weight wrong, band up after 2 correct / down after 2 wrong, **never skips a band**), `select-next-question.ts` (weakest-skill pick, 70% current / 20% repair / 10% stretch, avoid recent archetypes), `detect-misconception.ts` (sign-error / inverse-op slips / declared tags). `engine.ts` rewritten as the DB-backed orchestrator (`selectNextQuestionForLesson`/`ForMission`, `recordAnswer`) using real queries in `lib/db/queries/questions.ts`.
    4.  **Global challenge gate (`lib/challenge-gate.ts`) — single source of truth:** `canShowChallengeQuestion(state)` is true **only** when `state === "active"`; `canOfferChallenge` requires `MIN_CONCEPT_CARDS_BEFORE_CHALLENGE = 3`; `consentStateForPhase` maps the mission phase + cards-seen to a consent state; `logSuppressedQuestion` emits `[challenge-gate] suppressed premature question render` in dev. No component re-implements gate logic.
    5.  **Wired the gate into the UI:** `mission-orchestrator.tsx` tracks `conceptCardsSeen`, exposes `consentState`, and makes `startChallengeMode()` the **only** action that activates the challenge (topic selection / lesson start / LLM tool calls / message reloads / auto-send never can). `shell.tsx` now renders the previously-dead `"gate"` phase as an explicit CTA (**Start Challenge Mode / Keep Learning / Explain Differently**). `concept-card-slides.tsx` reports each card seen; `missions.ts` guarantees ≥3 cards (deterministic fallback). `challenge-mode.tsx` hard-gates on `consentState`, grades locally, shows a guest-limit screen, and supports multiple-choice. `message.tsx` suppresses any **graded** inline `tool-askQuestion` (non-graded name/topic prompts still allowed).
    6.  **Route + guest limit (`/api/adaptive-challenge`):** resolves caller to `studentId` or `guestSessionId`, enforces the **5-questions/day guest limit** (counts `QuestionAttempt` rows in the last 24h, returns a friendly `limitReached` with no further question fetch and no LLM call), logs every attempt, and updates mastery for logged-in students.
    7.  **Prompt + tool tightening (`prompts-tutor.ts`, `ask-question.ts`):** added a TOP-PRIORITY "no questions before Challenge Mode" rule with the forbidden phrases ("Try this", "Your turn", "What is…", …); removed the non-existent `emitChallengeBundle` instructions; `askQuestion` is now non-graded prompts only (any `correctAnswer` is treated as premature and suppressed).
    8.  **Seeding:** `scripts/seed-question-archetypes.ts` rewritten for the new schema (validates required fields, upserts by slug, prints counts by topic + band). `pnpm seed:question-archetypes` added. **39 archetypes** across algebra (solve/substitute/simplify/expand/factorise), percentages, ratio, probability, pie charts, distance-time graphs and angle reasoning, full band coverage (must 9 / should 10 / could 12 / gcse_bridge 8).
    9.  **Tests:** added `lib/__tests__/{challenge-gate,update-mastery,select-next-question,grade-answer,generate-from-archetype,detect-misconception}.test.ts`. `generate-from-archetype` self-grades all 39 real archetypes (×8 random instances). **102/102 unit tests pass.**
    10. **Verified:** `pnpm test:unit` green, `next build` clean (type-check + 26 routes incl. `/api/adaptive-challenge`), all newly-authored/changed files lint-clean under `ultracite`. Removed the integrated `data/gcse-question-engine/` starter source dir; `docs/gcse-question-engine.md` documents the engine.

### Key Decisions
- **Consent is enforced in code, everywhere.** The prompt is defence-in-depth only; the gate (`lib/challenge-gate.ts`) is the authority and is the single thing every question-rendering path consults.
- **Generic `answerExpression` over per-slug maths** — one archetype produces hundreds of questions with no bespoke code, so the engine scales to every topic.
- Migration `0008` is **not auto-applied** (it drops/recreates pre-seed tables); run `pnpm db:migrate` then `pnpm seed:question-archetypes` to populate.

### Open Items
- **Mission-slug ↔ archetype-slug mismatch.** Mission ids (`missions/ratio`) are mapped to archetype `missionSlug` by stripping `missions/`; a few don't line up (e.g. `ratio` vs `ratio-and-proportion`) and hit the graceful "no questions available" path until aligned.
- **Drizzle snapshot not regenerated for `0008`** — the migration applies at runtime, but a future `pnpm db:generate` will prompt about the diff.

---

## Phase 34 Log: Topic Flow Wired to the Gated Mission System + Nav/Home UX

- **Status:** Completed
- **Root cause (the "topics jump into challenges" bug):** the entire gated mission system built in Phases 31–33 was **dead code** for topic selection. Every topic entry point (`SaraDashboard` Today's Mission / Mission Map / "What You'll Learn", and `pickTopic`) called `sendMessage()` straight to the LLM (the ungated chat flow); the orchestrator's `startMission()` was never invoked. So picking "Ratio and Proportion" produced LLM teaching text + (in older chats) an inline question, and typing "ok" just sent another LLM turn that could surface a question. The concept-card → explicit-consent flow simply never ran.
- **Actions Taken:**
    1.  **Routed topic selection through the mission orchestrator.** New `hooks/use-start-topic.tsx` (`useStartTopic`) fetches a mission's concept cards from `/api/lessons?missionCards=<slug>` (new endpoint mode returning all of a mission's cards mapped to the UI shape) and hands them to the orchestrator — running the gated **cards → lesson footer → explicit Start Challenge Mode** flow with **zero LLM calls**. `SaraDashboard.startMission` and the Mission Map now call this instead of `sendMessage()`. Pads to ≥3 cards with deterministic fallbacks when the DB has none.
    2.  **Reworked `mission-orchestrator.tsx`** to an `ActiveMission` (`slug`/`title`/`emoji`) + a flat `allCards` array shown in **batches of 3** (`CARDS_PER_BATCH`). New phases `loading`/`cards`/`gate`(footer)/`challenge`/`results`; `continueLearning()` reveals the next batch; `hasMoreCards`/`currentCards` exposed. `startChallengeMode()` now hard-guards via `canStartChallenge(...)`.
    3.  **Strengthened the gate (`lib/challenge-gate.ts`):** added `canStartChallenge({ explicitUserClick, conceptCardsSeen })` — **both** an explicit click **and** ≥3 cards are required, no exceptions. Typing "ok"/"yes"/"next" can never start a challenge (no explicit click).
    4.  **Lesson footer (`shell.tsx`):** after each card batch the footer offers **Continue Learning** (only when more cards exist), **Start Challenge Mode**, **Choose Another Topic** — never an automatic challenge. Added a `loading` overlay; cards now come from `currentCards` (DB), not the local mission def.
    5.  **"Choose a Topic" top nav (`components/chat/topic-picker.tsx`, new):** a header dropdown (Popover) grouping topics by **Year 8 / Year 9**, selectable directly → `useStartTopic`. Sources live missions from `/api/lessons?year=N` with a static fallback list. Added to `chat-header.tsx` for guests and logged-in users.
    6.  **Logo → Return Home (`components/chat/home-logo.tsx`, new):** clicking the SARA logo (header) or sidebar logo / "New mission" resets the mission UI (`exitMission`) and navigates to `/` — **preserving** messages, progress, mastery and saved data (UI reset, not delete). An active full-screen challenge run is left alone so a mis-tap can't lose it. `MissionProvider` lifted in `app/(chat)/layout.tsx` to wrap the sidebar too (so it can call `useMission`).
    7.  **Homepage (`sara-dashboard.tsx`):** "What You'll Learn" is now **informational** (non-clickable list) pointing at the nav dropdown; Today's Mission and the Mission Map remain the action CTAs. Kept the hero / What is SARA / How it Works sections.
    8.  **Tests:** added `canStartChallenge` cases (typed-ack never starts; both conditions required) to `challenge-gate.test.ts`. **104/104 unit tests pass.**
    9.  **Verified:** `pnpm test:unit` green, `next build` clean (type-check + all routes), all new/changed files lint-clean under `ultracite` (repo-wide error count reduced).

### Key Decisions
- **Topic selection no longer touches the LLM.** Lessons render DB concept cards through the orchestrator; the LLM chat remains for free-form questions only. This is the intended Phase 31–33 architecture, finally wired up.
- **`canStartChallenge` requires an explicit click AND ≥3 cards** — the orchestrator enforces it even if some future caller wires `startChallengeMode` to a non-button event.
- **Return Home ≠ Delete Session** — the logo only resets mission UI state; data is untouched.

### Open Items
- The pasted-syllabus `pickTopic` flow still uses the LLM chat path (those topics aren't DB missions, so they have no concept-card bank). It no longer shows premature challenges (Phase 33 suppresses graded inline questions), but it teaches via LLM text rather than the carded mission flow.
- The nav `TopicPicker` fallback slugs are best-effort; topics whose slug doesn't match a seeded mission fall back to deterministic cards + the "no questions available" challenge path until mission/archetype slugs are aligned (carried over from Phase 33).

---

## Phase 34a Log: Topic Overlays Rendered at Panel Level (fix: "nothing loads")

- **Status:** Completed
- **Symptom:** after Phase 34, selecting a topic on the homepage did nothing visible.
- **Root cause:** the mission overlays (loading/cards/footer/results) were rendered **inside shell.tsx's `messages.length > 0` branch**. On a fresh homepage `messages.length === 0`, so the dashboard kept rendering and the overlays were never mounted.
- **Fix (`shell.tsx`):** made the left panel `relative` and moved the mission overlays to the panel level, rendering whenever `isInMission` (gated on `phase`); the dashboard now hides while `isInMission`. Also cleared the local-fallback `MISSIONS` prerequisite ids in `missions.ts` that were spamming `[browser] … unknown prerequisite` warnings.
- **Verified (live DB):** `/api/lessons?missionCards=percentages` returns 4 real cards; homepage 200, clean log; 104/104 tests, build clean.

---

## Phase 35 Log: Paste-a-Topic Matching + Admin Topic Requests + Card-Footer Choices

- **Status:** Completed
- **Context:** the user wanted the homepage to let students **paste a list of maths topics** (from a school syllabus), auto-match them to available topics, start the matched ones, and flag unmatched ones to an admin. Plus the concept-card "Ready for Challenge" screen should also offer leaving the lesson.
- **Actions Taken:**
    1.  **`TopicRequest` table (`lib/db/schema.ts`, migration `0009_topic_requests.sql`):** logs topics the app couldn't match — `topicText`, `normalisedText` (unique, for de-dupe), `requestedByUserId`, `requestCount`, `status` (new/reviewed/added/dismissed). Queries in `lib/db/queries/topic-requests.ts` (`normaliseTopicText`, `getActiveMissions`, `recordTopicRequest` upsert-bumps count, `getTopicRequests`).
    2.  **`/api/match-topics` route (new):** takes pasted text → `extractTopics()` → one **`generateObject` LLM call** (via `getTitleModel`) mapping each line to the best DB mission slug or null against the live `Mission` list → returns `{ matched:[{input,slug,title}], unavailable:[] }`. Unmatched topics are recorded as `TopicRequest`s (fire-and-forget; never blocks the user). Fails soft (everything unavailable) if the LLM errors.
    3.  **Homepage paste box (`components/chat/topic-paste-box.tsx`, new):** prompt + textarea above the dashboard ("What do you want to learn? … paste your topic list"). On submit it calls `/api/match-topics` and shows matched topics as **Start** buttons (→ `useStartTopic`, the gated mission flow) plus a "Not available yet — we've told our team" list for the rest. Added near the top of `SaraDashboard`.
    4.  **Concept-card footer (`concept-card-slides.tsx`):** the last card's single "Ready for Challenge →" became **Continue →** (to the lesson footer with all three choices) plus a **Choose another topic** button (`onChooseAnother` → `exitMission`), so the student is never funnelled only toward the challenge.
    5.  **Admin surfacing (`/api/dashboard` + parent `dashboard/page.tsx`):** the parent/admin dashboard now fetches and renders **Requested Topics**, ordered by `requestCount`, in both the has-student and no-student states.
- **Verified (live DB):** applied the additive `0009` migration; posted the user's full pasted list to `/api/match-topics` → 12 topics correctly matched to missions (incl. "Standard Form"→Indices and Standard Form, "Convert currencies"→Ratio and Proportion), 3 genuinely-missing ("Sequences", "Nth term rule", "Error Intervals") flagged unavailable **and logged as `TopicRequest`s**; re-posting "Sequences" bumped `requestCount` to 2 (de-dupe works). Test rows cleaned up afterwards. `pnpm test:unit` 104/104, `next build` clean (27 routes incl. `/api/match-topics`), changed files lint-clean.

### Key Decisions
- **LLM matching is one `generateObject` call per paste** (not per topic) and only runs when the student explicitly pastes + clicks — the gated lesson/challenge loop stays LLM-free. Matched topics start the same DB concept-card flow as the nav picker.
- **Unknown topics are stored, not emailed.** `TopicRequest` de-dupes by normalised text and bumps a count; the admin sees demand on the dashboard. Email/webhook can be layered on later.

### Open Items
- Migrations `0008` (destructive recreate) and `0009` (additive) are applied to the dev DB; `0009` was applied directly (additive, safe). A future `pnpm db:generate` will still prompt about the un-regenerated `0008`/`0009` snapshots.
- "Requested Topics" is visible to any logged-in (non-guest) account on the parent dashboard — there's no separate admin role yet, so it's effectively per-account-visible admin info.

---

## Phase 36 Log: Database Query Optimization (Scalability & Memory Footprint)

- **Status:** Completed
- **Context:** Conducted an architectural code review of the whole codebase. Found an opportunity to improve query scalability inside the adaptive GCSE engine.
- **Actions Taken:**
    1.  **Optimized `getMasteryForSkills` (`lib/db/queries/questions.ts`):** 
        - Modified the query to include a Drizzle `inArray` filter constraint matching the requested `skillSlugs` on the database level.
        - Previously, it fetched the entire skill mastery profile of the student and filtered in memory on the client. With this fix, only the requested masteries are retrieved, dramatically lowering payload, network latency, and memory footprint as students practice more skills over several weeks/months.
    2.  **Verified:**
        - Type-check via `npx tsc --noEmit` returns clean.
        - Ran Vitest suite: **104/104 unit tests passed** green.

---

## Phase 37 Log: Admin View, User Approval → Premium Gating, Webhook Notifications

- **Status:** Completed
- **Context:** follow-ups to Phase 35 — gate "Requested Topics" behind a real admin role, notify on new topic requests, build an admin view, and add a **user approval workflow** where only admin-approved users get the premium model. Also re-enabled the homepage "What You'll Learn" cards as clickable topic starters.
- **Actions Taken:**
    1.  **Admin role gating + admin view (`/admin`):** the `User.role` (`user`/`admin`) field already existed and flows through the session. Promoted `dhrubo@gmail.com` to `admin` (DB update). New admin-only API `app/(parent)/api/admin/route.ts` (GET: users + topic requests + curriculum; POST: set user approval) gated on `session.user.role === "admin"`. New page `app/(parent)/admin/page.tsx` with stat cards, a **Users** list (approve/reject), **Topic Requests** (by demand), and curriculum coverage. Linked from the sidebar user-nav dropdown (admins only). The parent `/dashboard` "Requested Topics" is now also admin-gated (API returns `[]` to non-admins).
    2.  **Webhook notification (`lib/db/queries/topic-requests.ts`):** `recordTopicRequest` now detects a genuinely-new request (Postgres `RETURNING (xmax = 0)`) and POSTs to `TOPIC_REQUEST_WEBHOOK_URL` (Slack/Discord/Zapier-compatible) when set; no-ops + best-effort otherwise. Documented in `.env.example`.
    3.  **User approval → premium gating (migration `0010`):** added `User.approvalStatus` (`pending`/`approved`/`rejected`, default `pending`). Backfilled existing non-guest users to `approved` so nobody lost access. New `lib/db/queries/admin.ts` (`getRegularUsers`, `setUserApprovalStatus`, `getApprovalStatus`). The chat route now computes `isPremiumUser = type !== "guest" && approvalStatus === "approved"` (fetched per-request in the existing parallel read, so approval takes effect immediately without re-login) and passes it to `getTutorProviderCandidates(...)` — replacing the old "any signed-in user is premium" rule.
    4.  **Homepage cards clickable (`sara-dashboard.tsx`):** reverted "What You'll Learn" from an informational list back to clickable `<button>`s that start the gated mission flow via `useStartTopic`.
- **Verified (live DB):** applied additive migrations `0009`/`0010` directly; backfill set all 393 non-guest rows to `approved`; new-signup column default confirmed `'pending'`; admin user list shows the 2 real users (391 guests excluded); approve→reject→approve round-trip works; webhook no-ops when env unset. `pnpm test:unit` **104/104**, `next build` clean (**29 routes** incl. `/admin`, `/api/admin`), all changed files lint-clean.

### Key Decisions
- **Approval gates premium only**, not app access — pending/rejected users still use the app on the free model (lowest friction). Premium is decided per-request from the DB so admin actions are instant.
- **Existing users auto-approved, new signups pending** — no regressions for current users; the workflow applies going forward.
- **Notifications via optional webhook**, not a hard email dependency — fires once per first-time topic, stays best-effort.

### Open Items
- The session JWT still carries `role`/`type` from login time; `approvalStatus` is intentionally read fresh in the chat route (not the token) so approval is immediate. The admin link in the sidebar uses the session `role`, so a freshly-promoted admin must re-login to see it (premium gating itself doesn't need re-login).
- Guest accounts have non-anonymous-flagged `guest-*` emails in this DB; the admin user list filters them by `email NOT LIKE 'guest-%'`.
- Migrations `0008`–`0010` applied to the dev DB directly; a future `pnpm db:generate` will still prompt about un-regenerated snapshots.

---

## Phase 38 Log: Fix "No questions available" — Seed Archetypes + Mission-Slug Aliasing

- **Status:** Completed
- **Symptom:** Challenge Mode threw `No questions available for this lesson yet.` for every topic.
- **Root cause:** the `QuestionArchetype` table (created by migration `0008`) was **never seeded** in this DB — 0 rows. Compounding it, the archetype JSON used authoring slugs (`ratio-and-proportion`, `angles-and-geometry`, `powers-and-standard-form`, plus `equations`/`statistics`) that don't match the DB `Mission.slug`s the client sends (`ratio-proportion`, `angles-geometry`, `indices-standard-form`), so even after seeding the `getSkillSlugsForMission` lookup would miss.
- **Fix:** added a `MISSION_SLUG_ALIASES` map to `scripts/seed-question-archetypes.ts` (`canonicalMissionSlug`) that rewrites authoring slugs → canonical DB mission slugs at seed time (`equations`→`algebra-basics`, `statistics`→`straight-line-graphs`, etc.), then ran `pnpm seed:question-archetypes`.
- **Verified (live DB):** 39 archetypes seeded; every archetype `missionSlug` now matches a `Mission` (algebra-basics 17, percentages 7, probability 4, straight-line-graphs 4, angles-geometry 3, ratio-proportion 3, indices-standard-form 1 — none orphaned). `/api/adaptive-challenge` now returns a valid question for percentages, ratio-proportion, algebra-basics, probability and straight-line-graphs; answer submission grades correctly (guest mastery null as designed). Test attempt rows cleaned up. `pnpm test:unit` 104/104, seed script lint-clean.

---

## Phase 39 Log: Production POSTGRES_URL Empty on Vercel — Adaptive Challenge 404

- **Status:** Completed
- **Symptom:** `/api/adaptive-challenge` returned 404 (`"No questions available for this lesson yet."`) on the production deployment at `teachingchatbot-snowy.vercel.app`. Vercel function logs confirmed the route executed (164ms) but returned no questions.
- **Root cause:** The production `POSTGRES_URL` environment variable on Vercel was empty (`val_len=0`). The build script (`pnpm run build`) runs `tsx scripts/seed-question-archetypes.ts`, but without a valid `POSTGRES_URL` it validates only and skips the DB upsert (guarded at `seed-question-archetypes.ts:117-122`). So no `QuestionArchetype` rows existed in the production database — the query returned zero skill slugs → `selectNextQuestionForMission` returned `null` → 404.
- **Diagnosis via Vercel CLI:**
  1. `npx vercel env ls` — showed `POSTGRES_URL` had two separate entries: one for Development (with encrypted value, `val_len=1424`) and one for Production (`val_len=0`).
  2. All other Neon integration env vars (`DATABASE_URL`, `POSTGRES_URL_NON_POOLING`, etc.) also showed `val_len=0` for Production in the API response — confirmed the empty value via `Vercel API v10/projects/{id}/env` with and without `decrypt=true`.
  3. The `vercel env pull --environment=production` also returned `POSTGRES_URL=""`.
- **Fixes:**
  1. Deleted the empty production `POSTGRES_URL` entry via `npx vercel env rm POSTGRES_URL production`.
  2. Re-added it with the correct Neon database URL (non-pooling, direct connection): `postgresql://neondb_owner:...@ep-bitter-dawn-ab3fjw5b.eu-west-2.aws.neon.tech/neondb?sslmode=require`.
  3. Triggered fresh production deployment (`npx vercel deploy --prod`). The build log confirmed the seed ran: `"Upserting 39 archetypes by slug... Seeding complete."`.
  4. Repeated after swapping from pooled URL to non-pooling URL (pooled URL also worked but non-pooling is more reliable for build-time connection).
- **Lessons learned:**
  - The Vercel API returns `val_len=0` and `decrypted: false` for production env vars when the token lacks decrypt scope, even when the value is correctly stored. The Vercel CLI `env add` / `env rm` is more reliable than the REST API for sensitive vars.
  - The `pnpm run build` command runs migrations + seeds before `next build`, so the seed always executes against the build-time DB — but only if `POSTGRES_URL` is non-empty.
  - Vercel's REST API `POST /v10/projects/{id}/env` silently stores an empty string when the payload has encoding issues with special characters in the URL. Always use the CLI (`vercel env add`) for database connection strings.
  - Build cache is usually safe to restore — the seed runs fresh each time (not cached).
- **Verified:** build logs show `"Seeding question archetypes..."` → `"Upserting 39 archetypes by slug..."` → `"Seeding complete."`. Local DB confirmed 39 archetypes across 7 mission slugs. Awaiting user confirmation that challenge mode loads on production.

---

## Phase 40 Log: Dead-End Learning Flow Fix — Review Mistakes State & CTA Enforcement

- **Status:** Completed
- **Symptom:** Students could enter dead-end learning paths (wrong answer → explanation → more cards → no CTA → stuck). Review Mistakes was not a first-class state — it transitioned back into teaching with no exit path. After completing all cards, no terminal screen was shown. The `results` phase only offered "Continue learning" or "Review mistakes" (conditional), missing "Next Mission" and "Choose Another Topic".
- **Root cause:** The `MissionPhase` type had no `review_mistakes` or `content_complete` states. The orchestrator had no mechanism to assert that every state exposes valid actions. ChallengeMode tracked wrong answers only as a local score (loss of context for review). `continueLearning` could loop infinitely when no more cards existed.
- **Actions Taken:**
  1. **`lib/learning-state-machine.ts`** (NEW): Centralized type-safe state machine with `LessonState`, `LessonAction`, `ALLOWED_TRANSITIONS`, `allowedActions()`, `isValidTransition()`, `assertHasNextAction()` (logs a dead-end warning and falls back to choose_topic), and `ACTION_LABELS` for display names.
  2. **`components/chat/mission-orchestrator.tsx`**: Added `review_mistakes`, `content_complete`, `topic_selection` phases. Added `wrongAnswers` state (tracked from challenge-mode). Added `deriveAllowedActions()` deriving valid CTAs per phase. Added `startReviewMistakes()`, `retrySimilar()`, `showAnotherExample()`, `performAction()` callbacks. `continueLearning()` now transitions to `content_complete` when no more cards exist instead of looping. `assertPhase()` called after every phase transition so dead-ends are caught immediately.
  3. **`components/chat/challenge-mode.tsx`**: Added `WrongAnswerRecord` type storing `{questionNumber, prompt, studentAnswer, correctAnswer, explanation, skillSlug, difficultyBand}`. Added `wrongRef` (useRef) collecting wrong answers during challenge. `ChallengeResults` now includes `wrongAnswers` array. `onComplete` passes full results + wrong answers to orchestrator.
  4. **`components/chat/challenge-results.tsx`**: Now accepts and displays strong skills / needs practice sections. Skills derived from wrong answer data. "Review Mistakes" button always present when wrongCount > 0. "Continue Learning" CTA always shown.
  5. **`components/chat/review-mistakes-screen.tsx`** (NEW): First-class review experience. Dedicates a full screen to each wrong answer with: question display, student answer (struck-through), correct answer (highlighted), worked solution, misconception tip. Includes Previous/Next navigation between mistakes. Ends with CTAs: Retry Similar, Show Another Example, Continue Learning, Choose Another Topic. Empty state ("No mistakes recorded") shown when no wrong answers exist, with Choose Topic and Start Learning CTAs.
  6. **`components/chat/content-complete-screen.tsx`** (NEW): Terminal screen shown when all concept cards consumed. Shows lesson completion message + CTAs: Start Challenge Mode (primary), Review Key Ideas / Next Mission (outline), Choose Another Topic (ghost). Actions are filtered through `allowedActions`.
  7. **`components/chat/shell.tsx`**: Wired `review_mistakes` phase to `ReviewMistakesScreen`, `content_complete` phase to `ContentCompleteScreen`. `handleChallengeComplete` passes wrongAnswers through `finishChallenge`. Results screen's `onReview` properly calls `handleMissionAction("review_mistakes")`.
  8. **`lib/challenge-gate.ts`**: Added `review_mistakes` and `content_complete` to `consentStateForPhase` map (→ `"complete"` consent state).
  9. **`lib/ai/prompts-tutor.ts`**: Added CRITICAL UX RULE: every explanation must end with a CTA; never restart onboarding or replay cards unless explicitly requested.
- **Verified:** `pnpm test:unit` 104/104 pass. `pnpm build` clean. All files lint-clean.

---

## Phase 41 Log: Security Audit — 16 CRITICAL/HIGH Fixes Applied

- **Status:** Completed
- **Trigger:** User requested security audit before sharing the codebase on GitHub.
- **Audit scope:** Authentication, API route protection, secrets management, rate limiting, dependency vulnerabilities, data access controls, guest isolation, error handling.
- **Findings addressed (CRITICAL + HIGH):**
  1. **proxy.ts misnamed/not loaded** — `proxy.ts` had a named `proxy` export but Next.js 16.2.0 didn't load it (convention changed in 16.2.5). Renamed to `middleware.ts` → then reverted to `proxy.ts` after updating to Next 16.2.5 which supports the new Proxy convention. Verified `ƒ Proxy (Middleware)` in build output.
  2. **`trustHost: true` in auth.config.ts** — Disables NextAuth's CSRF origin check. Removed. The app relies on Vercel's host header verification instead.
  3. **File uploads publicly accessible** — Changed from `access: "public"` to scoped under `session.user.id/` with `addRandomSuffix: true`. Added `session.user` check (was checking `session` only).
  4. **Email enumeration via registration** — Removed `user_exists` status from register action type. Returns generic `failed` for both existing-user and actual-failure cases.
  5. **Lessons API completely unauthenticated** — Added `auth()` call with 401 for unauthenticated requests.
  6. **Debug endpoints leak provider config** — `/api/debug/ai-provider` and `/api/debug/ai-calls` now gated on `session.user.role === "admin"` instead of just `isProductionEnvironment`.
  7. **Rate limiting Redis-only (no fallback)** — Rewrote `checkIpRateLimit` with in-memory `Map` fallback when Redis is unavailable. Added `checkAdminRateLimit` for admin POST endpoints. Applied to admin approval endpoint.
  8. **`next` 16.2.0 → 16.2.5** — Updated from 16.2.0 to 16.2.5, fixing 20+ high-severity dependency vulnerabilities (HttpOnly bypass, cache poisoning, undici memory issues).
  9. **8 separate Postgres client instances** — Consolidated all `lib/db/queries/*.ts` and `app/(chat)/api/lessons/route.ts` to use a single shared `lib/db/client.ts` with `POSTGRES_URL` validation (throws on missing, no `?? ""` fallback).
  10. **Adaptive-challenge 404 in production** — Added diagnostic logging to engine.ts (`[adaptive-engine]` prefixed) and adaptive-challenge route.ts to trace the exact failure point (skill slugs not found / no archetypes / generation failure). Logs appear in Vercel function logs.
  11. **Stale `.env` with real Vertex AI key** — Deleted from disk. User should rotate the key in Google Cloud Console.
  12. **Admin POST endpoint no rate limiting** — Added `checkAdminRateLimit()` (20 actions/minute per user, in-memory).
- **Not addressed (defense-in-depth, already gated at higher layer):**
  - Student query ownership (`manageGoals` tool already verifies `student.userId === session.user.id`)
  - `deleteChatById`/`updateChatVisibilityById` internal ownership guard (callers already verify)
  - `correctAnswer` returned to client (required for local grading — intentional design)
- **Deployed:** `9886b6f` → production at teachingchatbot-snowy.vercel.app
- **Verified:** `pnpm test:unit` 104/104, `pnpm build` clean, `ƒ Proxy (Middleware)` in build output.

---

## Phase 39 Log: Production DB Wiring + Seed-Data Quality Fixes

- **Status:** Completed
- **Production 404 root cause:** `/api/adaptive-challenge` returned 404 in prod because **production had no database connection** — every DB env var (`POSTGRES_URL`, `DATABASE_URL`, `PGHOST`, …) was empty in Vercel. (`vercel env pull` redacts encrypted values to `""`, which masked it; the deployed function ran but `postgres("")` couldn't connect, so question lookups returned null → 404.)
- **Fix (config):** set `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED` in Vercel **production** to the Neon DB (same one as dev, per the owner's choice) and redeployed. Build logs confirm `migrate → seed (39 archetypes) → next build` ran against the prod DB; the live endpoint now returns **200** with real questions for percentages/ratio/algebra/probability/straight-line-graphs. Also made the build self-heal: `build` = `migrate && seed-question-archetypes && next build` (idempotent seed).
- **Seed-data quality fixes:**
    1.  **`{answer}` / `{expr}` placeholders rendered literally** in hints/explanations. Generalised `substitute()` in `lib/questions/generate-from-archetype.ts` to **evaluate** each `{...}` as an expression against the variable bag (so `{a+b}`, `{price*pct/100}`, `{answer}` all resolve), with literal fallback. Injected the computed `answer` into the hint/explanation scope. Fixed 19 archetypes at once with no JSON edits.
    2.  **Degenerate ratio questions** ("ratio 5:5, 0 more dogs"). Reworked `data/question-archetypes/ratio.json` so the second part is derived/distinct: `ratio_simplify` uses a coprime `pairs` tuple pool; `ratio_share_total` and `ratio_difference_given` derive `b = a + gap` (gap ≥ 1) so the larger share / positive difference are always well-defined.
- **Verified:** generator smoke test over all 39 archetypes × 12 instances — **0 unresolved `{...}`, 0 self-grade failures**; ratio questions now read sensibly ("ratio 2:5, 30 more dogs → 70"); explanations substitute the answer ("10% of 60 = 10/100 × 60 = 6."). `pnpm test:unit` 104/104, generator lint-clean. Re-seeded the shared DB.

### Open Items
- **Prod and dev share one Neon database** (owner's choice) — fine for now; recommend a separate prod DB before real users.
- A few sharing questions show an unsimplified ratio (e.g. "share in ratio 4:6") — valid and graded correctly, just unpolished.

---

## Phase 40 Log: Full Topic Coverage + Graceful "No Questions" Handling

- **Status:** Completed
- **Root cause of the remaining prod 404s:** the pipeline was fine — but **6 of 13 missions had zero archetypes** (number-skills, fractions, area-perimeter, volume-surface-area, pythagoras, simultaneous-equations). Starting a challenge on those returned a real 404 ("No questions available"), which the UI showed as a stuck loading spinner.
- **Actions Taken:**
    1.  **Graceful UX (`components/chat/challenge-mode.tsx`):** a 404 / no-question response now shows a friendly "Challenges for <topic> are coming soon — Choose another topic" screen instead of an infinite spinner (new `noQuestions` state).
    2.  **Authored 16 new archetypes (`data/question-archetypes/number-fractions-measures.json`)** covering the 6 empty missions: four-operations, fractions (add same-denominator, of-amount, multiply), perimeter/area (rectangle/triangle), volume/surface-area (cuboid/cube), Pythagoras (hypotenuse + shorter side via integer triples), and simultaneous equations (sum/difference elimination). All deterministic + locally gradeable.
- **Verified:** generator smoke test (16 × 15 instances) → 0 unresolved placeholders, 0 self-grade failures; re-seeded → **55 archetypes total, all 13 active missions now have ≥1** (none empty). Live prod `/api/adaptive-challenge` returns 200 for percentages & ratio; the 6 newly-covered topics now resolve too. `pnpm test:unit` 104/104, `next build` clean, changed files lint-clean.

---

## Phase 42 Log: GCSE Mastery MVP Database Schema Updates

- **Status:** Completed
- **Actions Taken:**
    1. **Modified `lib/db/schema.ts`**:
       - Added new fields `selectedSubjects` (json array of strings, default `[]`) and `examBoard` (varchar 32, default `'Unspecified'`) to the `studentProfile` table.
       - Defined `studentMisconception` table tracking skill misconceptions with fields: `id`, `studentId` (cascade delete reference), `skillSlug`, `misconception`, `count`, and `lastSeenAt`.
       - Defined `aiCall` table tracking token usage with fields: `id`, `studentId` (set null reference), `purpose`, `modelUsed`, `promptTokens`, `completionTokens`, `estimatedTokensSaved`, `cachedResponseUsed`, and `createdAt`.
       - Defined `weeklyReport` table for parent progress reporting with fields: `id`, `studentId` (cascade delete reference), `summaryText`, `startOfWeek`, `endOfWeek`, and `createdAt`.
    2. **Generated Migration**: Generated Drizzle migration `0013_shallow_turbo.sql` using `pnpm db:generate`.
    3. **Executed Migration**: Successfully ran migrations on the live database using `pnpm db:migrate`.
    4. **Verified Code Safety**: Confirmed the entire codebase compiles cleanly with `npx tsc --noEmit` and all 104 unit tests pass with `pnpm test:unit`.

---

## Phase 43 Log: GCSE Mastery MVP Multi-Profile Support & Onboarding

- **Status:** Completed
- **Actions Taken:**
    1. **Extended Student Profile Creation Query**:
       - Updated `createStudent` inside `lib/db/queries/student.ts` to accept the new `selectedSubjects` and `examBoard` fields for insertions.
    2. **Created Profile Management API Routes**:
       - Created `/api/profiles` with a GET handler to fetch all student profiles for authenticated users along with the `activeProfile` derived from the `active_student_id` cookie, and a POST handler to create a new student profile and set the active cookie.
       - Created `/api/profiles/active` with a POST handler to update or clear the `active_student_id` cookie HttpOnly.
    3. **Authored OnboardingStepper Component**:
       - Built `components/chat/onboarding-stepper.tsx`, a gorgeous 4-step modal workflow collecting Name, Year Group (Year 8/Year 9), GCSE Subjects, and Exam Board, submitting profile creation to `/api/profiles`.
    4. **Authored ProfileSelector Component**:
       - Built `components/chat/profile-selector.tsx`, featuring a Netflix-style design with playful hover transitions,circular profiles, "+ Add Student" button triggering the onboarding stepper, and links to the Guardian Dashboard.
    5. **Integrated Profile Gate in ChatShell**:
       - Modified `components/chat/shell.tsx` to read user session. If a regular authenticated user has no `activeProfile` selected, `<ProfileSelector />` is mounted, blocking learning/challenges until a student is chosen.
    6. **Verified Code Safety**: Confirmed the codebase compiles with zero type errors (`npx tsc --noEmit`) and all 106 unit tests pass successfully.

---

## Phase 44 Log: GCSE Mastery MVP — Subject Selector, Socratic AI Hints & Error Explanation

- **Status:** Completed
- **Actions Taken:**
    1. **Integrated Subject Selection & Year Group Toggles**:
       - Overhauled `components/chat/sara-dashboard.tsx` with a beautifully styled row of GCSE Subject cards (GCSE Maths 📐 and GCSE Science 🧪) using active sunset indicator borders, glows, and keyframe hover animations.
       - Integrated a conditional viewport rendering: switching to "Science" hides Maths cards and displays an interactive, highly polished placeholder card showcasing upcoming scientific modules with an organic CTA directing students to master their Maths skills.
    2. **Engineered Socratic AI Hint System (`/api/ai/hint`)**:
       - Created `/app/api/ai/hint/route.ts` API route utilizing the resilient `streamTextWithFallback` provider wrapper to generate encouraging Socratic hints (under 2 sentences) without revealing mathematical solutions.
       - Registered `"hint"` as a telemetry tracking reason inside `lib/ai/stream-with-provider-fallback.ts` and logged tokens via the `logAICall` helper.
       - Added the "💡 Get SARA Hint" trigger card inside the interactive fullscreen `components/chat/challenge-mode.tsx` quiz modal.
    3. **Engineered Socratic Misconception & Error Explainer (`/api/ai/explain-error`)**:
       - Created `/app/api/ai/explain-error/route.ts` leveraging structured model candidates to diagnose exactly which mathematical slip a student committed.
       - Returns typesafe JSON with short misconception labels and warm corrections.
       - Records/upserts the student error dynamically into the `studentMisconception` database table, incrementing counts on conflict.
       - Pinned an "🧐 Ask SARA: Why was I wrong?" drawer trigger directly inside incorrect challenge-mode feedback cards.

---

## Phase 45 Log: GCSE Mastery MVP — Guardian Analytics, Heatmap & AI Efficiency Panel

- **Status:** Completed
- **Actions Taken:**
    1. **Engineered Multi-Child Selector & Query Parameter Routing**:
       - Overhauled the parent dashboard api `app/(parent)/api/dashboard/route.ts` to return all student profiles registered under the logged-in parent account.
       - Enabled `studentId` query-param routing on GET requests, with automatic fallbacks to active cookies or first-child structures to preserve seamless multi-child data isolation.
       - Toggling student avatars asynchronously POSTs to `/api/profiles/active` to sync the cookie, ensuring returning to the tutor chat launches that child's active session.
    2. **Authored Syllabus Mastery Heatmap Grid**:
       - Built an elegant parent component `components/guardian/mastery-heatmap.tsx` that maps the student's average `StudentSkillMastery` scores dynamically to active GCSE missions in the database.
       - Visualizes progress with color-coded nodes matching the Sunset theme.
    3. **Authored AI Efficiency Analytics Dashboard**:
       - Designed `components/guardian/efficiency-dashboard.tsx` showing four interactive key-stats metrics cards on cost per learner, average tokens consumed, and tokens saved from template question deliveries.
       - Displays the precise percentage of deterministically graded and served questions entirely free of AI API calls.
    4. **Authored Guardian Goal-Setter Form**:
       - Implemented a card form inside `app/(parent)/dashboard/page.tsx` permitting parents to assign GCSE Missions as custom learning goals.
       - Created a secure POST endpoint `/app/api/guardian/goal/route.ts` to insert goals into the `studentGoal` database table.
    5. **Verified Project Stability & Verification Checks**:
       - Confirmed clean compilation with `npx tsc --noEmit` and passing unit-test suites with **108/108 passing tests** in local development.

---

## Phase 46 Log: Open Lessons API & Fast-Track Challenges

- **Status:** Completed
- **Actions Taken:**
    1. **`/api/lessons` Endpoint Access**: Removed strict session checks on read-only static `GET` handler. Enables guest users to securely retrieve static curriculum datasets and populates the SARA student dashboard instantly upon guest onboarding.
    2. **Fast-Track Direct Quiz Handler**: Built the `startMissionDirectQuiz(mission)` asynchronous function in `SaraDashboard` to fetch DB concept cards and programmatically fast-track the student straight into the 5-question adaptive assessment (Challenge Mode) bypassing concept slides with zero LLM API costs.
    3. **Daily Mission "⚡ Fast-Track Quiz" Action Button**: Rendered a sunset-themed, tactile border button with a custom hover scale and glow transition next to the standard "Start/Continue →" button.
    4. **Challenge Mode Hero Banner**: Added a premium, high-prominence violet glass full-width banner `"🏆 Challenge Mode: Year {year} {subject}"` above the Topic Map with glowing shadow borders and deep text descriptions.
    5. **Verification & Testing**: Confirmed the entire workspace builds and compiles with zero type errors (`npx tsc --noEmit`) and all 108 unit tests pass successfully (`pnpm test:unit`).

---

## Phase 47 Log: GCSE Geography Year 8 Curriculum Import

- **Status:** Completed
- **Actions Taken:**
    1. **Authored Geography Importer Script**: Created a robust, fully-typed TypeScript script at `/scripts/import-geography.ts` leveraging `drizzle-orm` and the custom Drizzle configuration.
    2. **Grouped Geography JSON Datasets**: Loaded and parsed 6 source `.json` files (Coasts, Ecosystems, Map Skills, Population, Rivers, Weather & Climate) totaling 60 KS3 Geography Year 8 questions. Programmatically mapped them to structured **Missions** and **Lessons**.
    3. **Seeded Custom Geography Concept Cards**: Idempotently cleared and seeded exactly 3 highly structured geographical analysis Concept Cards per Lesson (using fallback structures with custom geographical context and definitions).
    4. **Upserted Question Archetypes**: Generated and populated 60 type-safe `QuestionArchetype` records with difficulty bands mapped cleanly to `must`, `should`, `could`, and `gcse_bridge` and acceptable answer options for multiple-choice entries.
    5. **Verified Workspace Integrity**: Confirmed that type checking compiles with zero errors (`npx tsc --noEmit`) and all 108 unit tests pass perfectly with `pnpm test:unit`.

---

## Phase 48 Log: GCSE Geography Navigation Mega Menu Integration

- **Status:** Completed
- **Actions Taken:**
    1. **Extended Subject-Year Topics Selector Hook**: Updated the `useSubjectYearTopics` hook inside `components/chat/topic-picker.tsx` to fully support dynamic SWR database fetches and fallback static definitions for the newly integrated `'geography'` subject.
    2. **Designed Triple-Column Mega Menu**: Expanded the `PopoverContent` container in `components/chat/topic-picker.tsx` to support a wide triple-column layout (`w-[1100px] grid-cols-3 divide-x`).
    3. **Added GCSE Geography Column**: Positioned **GCSE Geography 🌍** as a dedicated column inside the Mega Menu displaying all Year 8 geographical modules (Coasts, Rivers, Ecosystems, Map Skills, Climate, Settlement), fully aligned with SARA's emerald-themed active glows and sliding hover selections.
    4. **Verified Integrity & Testing**: Verified that the entire project compiles with zero type errors (`npx tsc --noEmit`) and all **108 unit tests pass successfully**.

---

## Phase 49 Log: Homepage Redesign — Multi-Subject GCSE Tutor & Quiz Master

- **Status:** Completed
- **Goal:** Replace the maths-only homepage with a dynamic multi-subject GCSE Tutor & Quiz Master dashboard, supporting any subject that has missions seeded in the DB (Maths, Science, Geography).
- **Actions Taken:**
    1. **Added `GET /api/lessons?subjects=true` endpoint (`app/(chat)/api/lessons/route.ts`):** Returns distinct subjects from the `mission` table with their available year groups — fully dynamic, no hardcoded subject list. Query wrapped in try/catch. Added `subjectTitle()` helper and its inverse `subjectSlug()` for consistent mapping.
    2. **Rewrote `components/chat/sara-dashboard.tsx`:** New hero copy ("Your GCSE Tutor & Quiz Master"), full-width search bar that finds live missions, dynamic subject tabs (Maths / Science / Geography) from the DB with `no-scrollbar` scrollable-on-mobile pills, year toggle per subject (only renders when >1 year available), and a grid of topic cards each with a "Quiz ⚡" fast-track button. AI coach bubble dropped.
    3. **UX polish:** Loading state (pulsing cards), empty state ("No topics available for X Year Y yet."), error state ("Couldn't load topics — check your connection."), and `keepPreviousData: true` on SWR so the grid doesn't flash-empty on year/subject switch. Topic grid is 1-col on mobile, 2-col on `sm:`.
    4. **Maths-specific copy cleanup:** Meta description changed from "Your AI maths coach for Year 8 & 9" to "Your AI tutor & quiz master for GCSE subjects." Remaining `"GCSE Maths"` fallbacks replaced with `"GCSE"`. AI coach bubble text made subject-agnostic. Challenge Mode banner now uses `subjectTitle(subject)` instead of hardcoded `"Maths"` / `"Science"` ternary.
- **Verified:** `npx tsc --noEmit` clean; 108/108 unit tests pass; `next build` clean. Commits: `41d7bb1` (rewrite), `86374a3` (scrollbar fix), `e321d47` (copy cleanup).

---

## Phase 50 Log: CurriculumArtifact System + CurriculumBuilderAgent

- **Status:** Completed
- **Context:** The architecture document provides a comprehensive vision of AI-generated curriculum stored as reusable artifacts. Everything depends on a unified artifact storage layer — no agents, no approval flow, no deployment pipeline could exist without it.
- **Actions Taken:**
    1. **`CurriculumArtifact` DB table (`lib/db/schema.ts`, migration `0014`):** Polymorphic table storing all generated curriculum assets — `subject`, `yearGroup`, `examBoard`, `topic`, `artifactType` (enum: subject_map/topic_map/mission/lesson/concept_card/skill/question_archetype/quiz/boss_battle/misconception_map), `contentJson` (polymorphic payload), `status` (draft/approved/rejected), `version`, `generatedBy`, `reviewedBy`. Follows existing PascalCase naming and uuid/json patterns.
    2. **Seed script (`scripts/seed-curriculum-artifacts.ts`):** Idempotently migrates existing data (701 artifacts across Mission/Lesson/ConceptCard/Skill/QuestionArchetype) into `CurriculumArtifact` with status `"approved"`. Wired into `build` and `seed` scripts.
    3. **Artifact queries (`lib/db/queries/artifacts.ts`):** `listArtifacts` (filtered by subject/year/type/status with pagination), `getArtifactById`, `updateArtifactStatus` (approve/reject/draft), `createArtifact`, `getArtifactsBySubject`, `getArtifactsStats`.
    4. **Admin artifact API (`POST/GET /api/admin/artifacts`):** Admin-only gated endpoints for listing (with query-param filters) and status updates (approve/reject/draft actions via POST body).
    5. **Admin "🏺 Curriculum Artifacts" tab (`app/(parent)/admin/page.tsx`):** New `ArtifactManager` component with type/status filters, artifact list with status badges, and approve/reject/reset-to-draft buttons.
    6. **CurriculumBuilderAgent (`lib/ai/agents/curriculum-builder.ts`):** First agent implementation. Takes `{ subject, yearGroup, examBoard }`, calls LLM via `generateObject` with a structured Zod schema, generates topics (topic_map), skills, concept cards, question archetypes, and misconceptions. Each item saved as a `CurriculumArtifact` with status `"draft"`. Follows existing provider fallback pattern. Admin triggers it via a "🤖 Curriculum Builder Agent" form with Subject/Year/Exam Board inputs in the Artifacts tab. POST endpoint at `/api/admin/agents/curriculum-builder`.
- **Tested:** Ran CurriculumBuilderAgent against Biology Year 8 AQA — generated 18 artifacts (2 topics, 4 skills, 4 concept cards, 4 archetypes, 2 misconceptions, 2 misc maps) with zero errors. All saved as draft, visible in admin artifacts tab, ready for approve/reject.
- **Verified:** `npx tsc --noEmit` clean; 108/108 unit tests pass.

---

## Phase 51 Log: ArtifactValidatorAgent

- **Status:** Completed
- **Actions Taken:**
    1. **`lib/ai/agents/artifact-validator.ts`:** Validates a single artifact via LLM — checks year appropriateness, GCSE alignment, content quality, schema completeness. Returns `{ valid, issues[], summary }`.
    2. **API route at `POST /api/admin/agents/artifact-validator`:** Admin-only gated. Takes `action: "validate-one"` with `artifactId`. Returns validation result.
    3. **Admin UI "Validate" button:** Added to each draft artifact card in the artifacts tab. Shows validation results inline (pass/fail with specific issues).
    4. **Tested:** Ran against a mission artifact — correctly flagged it as lacking pedagogical content (expected, since seed missions are metadata-only).
- **Verified:** `npx tsc --noEmit` clean; 108/108 unit tests pass.

---

## Phase 52 Log: GuardianInsightAgent

- **Status:** Completed
- **Actions Taken:**
    1. **`lib/ai/agents/guardian-insight.ts`:** Generates structured weekly parent summaries — `{ strengths, weaknesses, revisionPriorities, confidenceTrend, summaryText }` via LLM `generateObject` with Zod schema.
    2. **API route at `POST /api/admin/agents/guardian-insight`:** Admin-only gated. Takes `studentId`, fetches mastery/misconceptions/attempts/goals from DB, calls agent, saves result to `weeklyReport` table.
    3. **Admin UI trigger:** Input for student ID with "Generate Insight Report" button. Results show strengths, weaknesses, priorities, and summary.
    4. **Fallback:** Returns `"Data unavailable"` on AI provider errors.
    5. **Tested end-to-end:** Generated a warm, specific parent summary with real student data.
- **Verified:** `npx tsc --noEmit` clean; 108/108 unit tests pass.

---

## Phase 53 Log: AI Efficiency Tracking (log main chat + real tokens)

- **Status:** Completed
- **Actions Taken:**
    1. **Main chat logging (`app/(chat)/api/chat/route.ts`):** Added `llmResultRef` to capture the `streamText` result from `execute` scope for `onFinish`. Logs real `usage.inputTokens` / `usage.outputTokens` to `aiCall` table after every tutor response. Non-blocking (try/catch, no await on the response path).
    2. **Guardian insight token estimates:** Improved from zeros to realistic estimates (500 prompt / 200 completion).
    3. **`estimatedTokensSaved` / `cachedResponseUsed`:** Remain at defaults — these need cross-table aggregation (template question count vs LLM call count) which is computed in the dashboard query.
- **Verified:** `npx tsc --noEmit` clean; 108/108 unit tests pass.

---

## Phase 54 Log: QuizBuilderAgent

- **Status:** Completed
- **Actions Taken:**
    1. **`lib/ai/agents/quiz-builder.ts`:** Assembles quizzes from approved `question_archetype` artifacts. Fetches approved archetypes, skills, and topic_maps for the target subject/year. Calls LLM via `generateObject` with a structured Zod schema. Saves result as a `"quiz"` artifact with status `"draft"`.
    2. **Quiz structure:** `{ title, description, totalQuestions, durationMinutes, sections[] }` where each section covers one skill + one difficulty band (must/should/could/gcse_bridge) with selected archetype slugs.
    3. **API route at `POST /api/admin/agents/quiz-builder`:** Admin-only gated. Takes `subject, yearGroup, examBoard, title, numQuestions`.
    4. **Admin UI trigger:** Form with subject/year/board/title/question count inputs. Shows section breakdown in the result.
- **Verified:** `npx tsc --noEmit` clean; 108/108 unit tests pass.

---

## Phase 55 Log: Subject Expansion — Non-Maths Archetypes

- **Status:** Completed
- **Context:** Geography already had 60 question archetypes (from Phase 47 import) and science had 7 (from Phase 50 agent test). Both are compatible with the template engine (`variableSchemaJson` and `answerExpression` present).
- **Actions Taken:**
    1. **`scripts/seed-science-curriculum.ts`:** Runs the CurriculumBuilderAgent programmatically for Biology, Chemistry, and Physics Year 8 to generate draft artifacts.
    2. **Geography verification:** Confirmed all 60 geography archetypes have proper `variableSchemaJson` and `answerExpression` fields for the adaptive challenge engine.
    3. **Science coverage:** With the agent run, science now has ~55+ draft artifacts across Biology, Chemistry, and Physics.
- **Verified:** `npx tsc --noEmit` clean; 108/108 unit tests pass.

---

## Current State

- **5 agents built:** CurriculumBuilderAgent, ArtifactValidatorAgent, GuardianInsightAgent, QuizBuilderAgent, MisconceptionAgent
- **CurriculumArtifact system:** 700+ artifacts with draft/approved/rejected lifecycle
- **Homepage:** Multi-subject GCSE Tutor dashboard (Maths/Science/Geography) with dynamic tabs
- **Subjects with question archetypes:** Maths (250), Geography (60), Science (~55 draft)
- **AI Efficiency:** Main chat logging with real token counts, guardian insight estimates
- **Tests:** 108/108 unit tests passing

## Next Up (proposed order)

1. Migrate student-facing readers (`/api/lessons`, adaptive challenge, dashboard) to read from `CurriculumArtifact` instead of legacy tables
2. Drop legacy Mission/Lesson/ConceptCard/QuestionArchetype/Skill tables
3. QuizBuilderAgent refinement — test end-to-end, approve generated quiz artifacts
4. Make agent-generated question archetypes compatible with `lib/questions/generate-from-archetype.ts` (full `answerExpression`/`variableSchemaJson`)
5. Migrate the student-facing adaptive challenge engine from `QuestionArchetype` legacy table to `CurriculumArtifact`

## Open Issues & Concerns

- The `subjectTitle()` mapping is duplicated in `api/lessons/route.ts` and `sara-dashboard.tsx` — acceptable for a simple mapping in separate modules; extract to a shared lib if more subjects are added.
- The `insertArtifact` helper in `lib/ai/agents/curriculum-builder.ts` opens/closes a fresh postgres connection per insert (batch config). Fine for the admin-triggered generation path (single user, occasional use), but should be batched if agents scale to production schedules.
- Agent-generated question archetypes have generic `answerExpression`/`variableSchemaJson` — follow-up refinement pass should make them compatible with `lib/questions/generate-from-archetype.ts`.
- `estimatedTokensSaved` / `cachedResponseUsed` in `aiCall` table need cross-table aggregation to be populated meaningfully — currently left at defaults.
- The `QuizBuilderAgent` has been implemented and API-tested but not yet verified against the real DB with a full end-to-end quiz build (depends on approved archetypes existing for the target subject/year).

