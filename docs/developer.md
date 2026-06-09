# Developer Documentation

Technical reference: data model, state, business rules, and where the logic lives. See the [status legend](README.md#-status-legend).

## Stack
- Next.js 16 (App Router, Turbopack) · React · Vercel AI SDK (`ai@6`) via the Vercel AI Gateway.
- Postgres (Neon) via Drizzle ORM. Auth via NextAuth (guest + credentials). Optional Redis for IP rate limiting and resumable streams.

## Data model

Tutor-specific tables (see [`lib/db/schema.ts`](../lib/db/schema.ts)):

### `StudentProfile`
One row per child; a user account (`userId`) may own several.
`id, userId, name, schoolYear ("8"|"9"), examDate, xp, streak, badges (json string[]), confidenceNotes, parentReportNotes, lastSessionAt, createdAt, updatedAt`.

### `TopicProgress` (PK `studentId + topic`)
`studentId, topic, gcseDomain (number|algebra|ratio_proportion_rates|geometry_measures|probability|statistics), status (not_started|introduced|practising|secure|mastered), confidence (low|medium|high), score (0–5), successfulAttempts, supportNeededAttempts, lastPractisedAt, updatedAt`.

### `StudentGoal`
`id, studentId, topic, description, status (not_started|in_progress|achieved|needs_more_work), confidence, targetDate, notes, startedAt, updatedAt`.

### Adaptive question engine (Phase 33, migration `0008`)
See [`docs/gcse-question-engine.md`](gcse-question-engine.md) for the full design.

- **`QuestionArchetype`** — a reusable GCSE-style template. `slug` (unique), `subject, yearGroup, missionSlug, lessonSlug, skillSlug, gcseDomain, difficultyBand (must|should|could|gcse_bridge), questionType (short_text|multiple_choice|numeric|algebraic), template`, `variableSchemaJson` (value pools / derived expressions), `answerExpression` (a JS expression — often a template literal like `` `${a+b}x` `` — evaluated generically to compute the answer, **no per-slug code**), `acceptableAnswerRulesJson`, `hint/explanationTemplate`, `misconceptionTagsJson`, `calculatorAllowed`, `isActive`.
- **`GeneratedQuestion`** — optional cache of rendered questions (`promptHash` unique).
- **`StudentSkillMastery`** (PK `studentId + skillSlug`) — `masteryScore (0–100)`, `currentBand`, `attempts`, `correct`, `recentCorrect/WrongStreak`, `lastAttemptAt`. Persisted for logged-in students only.
- **`QuestionAttempt`** — one row per answered question; `studentId` (logged-in) or `guestSessionId` (guest, drives the 5/day limit), `archetypeId`, `skillSlug`, `difficultyBand`, `prompt`, `studentAnswer`, `correctAnswer`, `isCorrect`, `misconceptionTag`, `timeTakenMs`.

Engine code: generation in [`lib/questions/`](../lib/questions/), adaptive logic in [`lib/adaptive/`](../lib/adaptive/), DB reads/writes in [`lib/db/queries/questions.ts`](../lib/db/queries/questions.ts). Seed with `pnpm seed:question-archetypes` (JSON in [`data/question-archetypes/`](../data/question-archetypes/)).

> 🚧 **Not yet modelled:** a "topic/chat" entity with an `active`/`archived` status (needed for the 5-active-topic rule), and a stored `0–100% completion` field (the percentage is currently tutor-presented only; mastery is the stored 0–5 `score`). Chats (`Chat`/`Message_v2`) exist but are not categorised as named maths "topics".

## State management: session vs logged-in
- ✅ Auth is via NextAuth. Guests get a real anonymous `User` row (`isAnonymous = true`), so guest activity is attributable to a user id.
- ✅ Conversation state = chats + messages in Postgres, restored on login by the existing chat history UI.
- 📝 "Resume last active topic" is tutor behaviour driven by the student profile / mission progress, not a stored "active topic" pointer.

## Business rules & enforcement

| Rule | Spec | Status | Where |
|---|---|---|---|
| No challenge/question before explicit consent | yes | ✅ enforced (code) | [`lib/challenge-gate.ts`](../lib/challenge-gate.ts) — `canShowChallengeQuestion` (only `state === "active"`); consumed by `mission-orchestrator`, `shell`, `challenge-mode`, `message.tsx`, `/api/adaptive-challenge` |
| ≥3 concept cards before challenge CTA | yes | ✅ enforced | `MIN_CONCEPT_CARDS_BEFORE_CHALLENGE` in `challenge-gate.ts`; `missions.ts` pads to 3 |
| Guest challenge questions = 5 / day (hard block) | yes | ✅ enforced | [`route.ts`](<../app/(chat)/api/adaptive-challenge/route.ts>) via `countGuestAttemptsSince` + `guestDailyQuestionLimit` |
| Guest free chat questions = 5 (hard block) | yes | 🚧 not implemented (chat path) | — |
| Messages per hour = 10 (guest & regular) | — | ✅ enforced | [`route.ts`](<../app/(chat)/api/chat/route.ts>) via `getMessageCountByUserId` + `entitlementsByUserType` |
| IP rate limit (Redis) | — | ✅ enforced (prod, when Redis set) | [`lib/ratelimit.ts`](../lib/ratelimit.ts) |
| Max 5 active topics | yes | 🚧 not implemented (no topic state) | — |
| Topic progress 0–100% | yes | 🚧 stored as 0–5 topic mastery + 0–100 per-skill mastery | `TopicProgress.score` / `StudentSkillMastery` |
| Goals + target date + exam prep | yes | ✅ stored; "Exam Prep:" naming is 📝 | `manageGoals` tool, `StudentGoal` |
| Goal plan steps + progress % | yes | ✅ stored | `StudentGoal.planSteps` / `progressPercent` |
| GCSE domain rollup | — | ✅ stored | `TopicProgress.gcseDomain` |
| Large-input chunking pre-processor | yes | ✅ enforced (server, conservative) | [`lib/ai/detect-large-input.ts`](../lib/ai/detect-large-input.ts) + `route.ts` |

### Large-input pre-processor (✅)
Before calling the LLM, on the **first message of a new chat only**, `route.ts` runs `detectLargeInput(userText)`. If it detects a pasted list / syllabus / 5+ topics, it short-circuits: saves the user message, streams back a fixed short chunking menu (`CHUNKING_MESSAGE`), logs `{ mode: "chunking", reason, topicsCount, inputLength, chatId }`, and returns **without** invoking the model.

The detector is intentionally conservative (structure-based: bulleted/numbered/short newline lines, syllabus markers, or short comma lists) rather than the naive "split on `[,\n]` > 5 OR length > 500" — that naive rule would block normal long word problems and comma-rich questions. Mid-conversation lists are handled by the prompt-level CHUNKING MODE instead. Tune thresholds in `detect-large-input.ts`.

### Guest 5-question limit
- ✅ **Challenge Mode** enforces it: `/api/adaptive-challenge` counts the guest's `QuestionAttempt` rows in the trailing 24h (`countGuestAttemptsSince`) against `getAppConfig().guestDailyQuestionLimit` (default 5, env `GUEST_DAILY_QUESTION_LIMIT`). On the limit it returns `{ limitReached, message }` — no further question is fetched and **no LLM is called** — and `ChallengeMode` shows the "come back tomorrow / create an account" screen.
- 🚧 The **free-chat** path still doesn't hard-block guest questions. To add it, reuse the pattern in `app/(chat)/api/chat/route.ts`: count a guest's total `user`-role messages (like `getMessageCountByUserId` but without the `differenceInHours` window), block with a dedicated error, and surface a register CTA.

### To implement the 5-active-topic limit (🚧)
Introduce a topic entity (or add `subject`, `status: active|archived|completed`, `progressPercent` to a topic table keyed by student), enforce a `count(active) < 5` check at creation, and add archive/complete actions + UI.

## AI tools (logic for topic/progress/goal handling)
Defined in [`lib/ai/tools/`](../lib/ai/tools/), registered in `route.ts`, each verifies ownership via `getStudentsByUserId`:
- `getCurriculumTopics` — returns the in-scope Year 8/9 curriculum.
- `updateStudentProfile` — create/update a student; set school year, exam date, XP, streak, badges, notes.
- `manageGoals` — create/update short-term goals (incl. exam-prep target dates).
- `startNewTopicSession` — begin an in-chat topic thread (+ persisted marker).
- `askQuestion` — **non-graded prompts only** (name, year, topic choice, continue-or-switch). Maths/quiz/challenge questions are handled by the app's Challenge Mode, never by this tool; any `correctAnswer` is treated as a premature challenge and suppressed client-side.

> Removed in Phases 32–33: `emitChallengeBundle`, `getStudentProgress`, `updateTopicProgress`, `getPreAuthoredContent`. Challenge questions now come from the DB archetype engine (`/api/adaptive-challenge`), not the LLM. Progress/mastery is written by the engine and `updateStudentProfile`.

System prompt (all product behaviour + tone): [`lib/ai/prompts-tutor.ts`](../lib/ai/prompts-tutor.ts). It also carries the TOP-PRIORITY "no questions before Challenge Mode" rule (defence-in-depth; the code gate is authoritative).

## Keeping docs honest
When you implement a 🚧 rule, update its row above **and** the matching entries in [product.md](product.md) / [help.md](help.md) so behaviour and documentation never drift.
