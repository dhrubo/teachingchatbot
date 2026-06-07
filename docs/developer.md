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

> 🚧 **Not yet modelled:** a "topic/chat" entity with an `active`/`archived` status (needed for the 5-active-topic rule), and a stored `0–100% completion` field (the percentage is currently tutor-presented only; mastery is the stored 0–5 `score`). Chats (`Chat`/`Message_v2`) exist but are not categorised as named maths "topics".

## State management: session vs logged-in
- ✅ Auth is via NextAuth. Guests get a real anonymous `User` row (`isAnonymous = true`), so guest activity is attributable to a user id.
- ✅ Conversation state = chats + messages in Postgres, restored on login by the existing chat history UI.
- 📝 "Resume last active topic" is tutor behaviour driven by reading `getStudentProgress`, not a stored "active topic" pointer.

## Business rules & enforcement

| Rule | Spec | Status | Where |
|---|---|---|---|
| Guest free questions = 5 (hard block) | yes | 🚧 not implemented | — |
| Messages per hour = 10 (guest & regular) | — | ✅ enforced | [`route.ts`](<../app/(chat)/api/chat/route.ts>) via `getMessageCountByUserId` + `entitlementsByUserType` |
| IP rate limit (Redis) | — | ✅ enforced (prod, when Redis set) | [`lib/ratelimit.ts`](../lib/ratelimit.ts) |
| Max 5 active topics | yes | 🚧 not implemented (no topic state) | — |
| Topic progress 0–100% | yes | 🚧 stored as 0–5 mastery instead | `updateTopicProgress` tool |
| Goals + target date + exam prep | yes | ✅ stored; "Exam Prep:" naming is 📝 | `manageGoals` tool, `StudentGoal` |
| GCSE domain rollup | — | ✅ stored | `TopicProgress.gcseDomain` |

### To implement the guest 5-question block (🚧)
Reuse the existing pattern in `route.ts`: add a `maxLifetimeQuestions` (or similar) to `entitlementsByUserType.guest` in [`lib/ai/entitlements.ts`](../lib/ai/entitlements.ts), and add a query that counts a guest user's total `user`-role messages (like `getMessageCountByUserId` but without the `differenceInHours` window). Block with `ChatbotError("rate_limit:chat")` or a dedicated error type, and surface a register CTA in the UI.

### To implement the 5-active-topic limit (🚧)
Introduce a topic entity (or add `subject`, `status: active|archived|completed`, `progressPercent` to a topic table keyed by student), enforce a `count(active) < 5` check at creation, and add archive/complete actions + UI.

## AI tools (logic for topic/progress/goal handling)
Defined in [`lib/ai/tools/`](../lib/ai/tools/), registered in `route.ts`, each takes `{ session }` and verifies ownership via `getStudentsByUserId`:
- `getCurriculumTopics` — returns the in-scope Year 8/9 curriculum.
- `getStudentProgress` — profile + topic progress + goals for the account's student(s).
- `updateStudentProfile` — create/update a student; set school year, exam date, XP, streak, badges, notes.
- `updateTopicProgress` — upsert per-topic score/status/confidence/attempts + `gcseDomain`.
- `manageGoals` — create/update short-term goals (incl. exam-prep target dates).

System prompt (all product behaviour + tone): [`lib/ai/prompts-tutor.ts`](../lib/ai/prompts-tutor.ts).

## Keeping docs honest
When you implement a 🚧 rule, update its row above **and** the matching entries in [product.md](product.md) / [help.md](help.md) so behaviour and documentation never drift.
