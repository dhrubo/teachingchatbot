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
