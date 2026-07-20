# Privacy and Minor Safety

This app is used by Year 8/9 learners (typically 12-14 years old). This
document describes what data protections exist today, what's a deliberate
boundary (not just an accident of the schema), and what's an explicit
follow-up rather than something silently missing.

## Identity model: pseudonymous by default

A student's real name lives in exactly one place —
`StudentProfile.name` (`lib/db/schema.ts`). Every other table (mastery,
attempts, misconceptions, confidence, AI call logs) keys on `studentId`, a
random UUID, never the name. This means:

- Server logs, AI call logs (`lib/ai/ai-call-log.ts`), and the
  `AiCall`/`QuestionAttempt`/`StudentSkillMastery` tables are already
  pseudonymous by construction — a raw dump of any of those tables does not
  by itself reveal who a student is.
- `lib/privacy/redact.ts` adds a second layer for the one case where a
  student's own *message text* might contain identifying information they
  typed themselves (a name, address, school, phone number) — see below.

## What gets logged, and what doesn't

New logging added alongside the server-authoritative grading and tutor
validator work (`lib/ai/ai-call-log.ts`, the `submit-answer` route, the chat
route's observability logging) records only: provider id, model name, call
reason, `promptVersion`, latency, repair status, and violation **codes**
(e.g. `"answer_leak"`) — never raw student input or raw model output. Treat
this as an invariant for any future logging added to this codebase: log
enums/ids/counts, not transcripts.

## `lib/privacy/redact.ts`

`redactForAnalytics(text)` strips emails, UK phone numbers, UK postcodes,
and self-disclosed names/schools/addresses from any text before it leaves
the private system (an analytics export, a shareable eval fixture, a
support ticket). It is **best-effort, not a certified PII scrubber** — the
honest scope is: catches the common, regex-detectable cases; does not catch
every way a student might type identifying information. Don't rely on it as
the only safeguard for genuinely sensitive exports — keep the export
audience small regardless.

`pseudonymousId(id)` HMACs an id with a server-only `ANALYTICS_HASH_SECRET`
(required — it throws rather than silently falling back to something
guessable). Use it whenever a *stable, correlatable but non-reversible*
identifier is needed outside the private system (e.g. a shareable dashboard
that still needs to group events by learner without exposing the DB id).

## Private live data vs. shareable eval data — a hard boundary

- **Live learner traffic** (real chats, real answers, real mastery) stays in
  the app's own Postgres database, accessed only by server-side code in this
  repo. It is never used as input to `evals/tutor` — every fixture in
  `evals/tutor/fixtures/` is synthetic, hand-written for this project, not
  sampled from real student sessions.
- **The offline eval gym** (`evals/tutor/`) is the one place designed to be
  shareable (e.g. attached to a PR, or run in CI without touching
  production data). Its fixtures must stay synthetic — do not "seed" it from
  real transcripts without running them through `redactForAnalytics` first,
  and ideally not at all; synthetic-only is simpler to reason about and is
  the current, enforced state.
- If a future need arises for a genuinely shareable analytics export of real
  usage patterns (e.g. aggregate mastery trends for research), it must go
  through `pseudonymousId` + `redactForAnalytics` and should live in a
  **separate, explicitly-provisioned project/database**, not ad hoc queries
  against the live DB. That separate project does not exist yet — this is a
  documented follow-up, not a built feature.

## Retention and deletion

- **Automated retention**: the existing `/api/cron/cleanup-guests` job
  (Vercel cron, daily — see `vercel.json`) already purged expired guest chat
  data via `deleteExpiredGuestChats`. It now ALSO purges guest-only
  `QuestionAttempt`/`QuestionInstance` rows older than the same
  `FREE_CHAT_RETENTION_HOURS` window, via
  `deleteExpiredGuestQuestionData` (`lib/db/queries/questions.ts`) — added
  alongside the server-authoritative `QuestionInstance` table so that data
  doesn't silently persist forever while guest chats already expire.
  Logged-in students' data is never touched by this job.
- **Deletion**: every learner-scoped table references `studentProfile.id`
  with `onDelete: "cascade"` (`lib/db/schema.ts`) — deleting a
  `StudentProfile` row cascades to mastery, attempts, misconceptions,
  confidence, goals, mission progress, and question instances issued to that
  student. Deleting a `User` row does the same up one level (cascades to
  their `StudentProfile` rows, chats, and messages).
  `deleteStudentAccount({ studentId, ownerUserId })`
  (`lib/db/queries/student.ts`) is the real primitive behind "delete my
  child's account" — it performs exactly that cascade delete and refuses to
  delete a student belonging to a different parent account. No parent-facing
  UI calls it yet; that UI (a confirmation flow in
  `app/(parent)/dashboard`) is a real, scoped follow-up, not a redesign.

## Parental controls

Not implemented yet. The schema already supports the right shape for it
(`User` → many `StudentProfile` rows, i.e. one parent account can own
several children — see `app/(parent)/dashboard`), but there is no
parent-facing consent flow, no per-child visibility toggle, and no
notification mechanism. Track this as a follow-up before broader rollout to
users where COPPA/UK-GDPR-for-children obligations apply more strictly.

## Moderation and escalation for high-risk messages

`lib/ai/tutor-validator.ts`'s `unsafe_content` violation code detects a
small, denylisted set of self-harm/violence/drugs/bullying phrases in a
*tutor* response and triggers the deterministic repair-then-fallback
sequence (`runTutorTurn` for hint/explain-error;
`createTutorValidationTransform` for the main chat route — see
`lib/ai/tutor-response-transform.ts`).

`lib/privacy/escalation.ts`'s `notifyHighRiskMessage` gives that a real,
scoped notification path: when `unsafe_content` survives BOTH the draft and
the one repair attempt (i.e. the response resolved to
`repairStatus: "fallback"` with `unsafe_content` still present), it posts
one webhook notification — reusing the exact same
Slack/Discord/Zapier-compatible incoming-webhook mechanism already trusted
for topic-request alerts (`lib/db/queries/topic-requests.ts`) — to
`GUARDIAN_ESCALATION_WEBHOOK_URL`, carrying only a pseudonymous learner
reference (`pseudonymousId`), the mode, and violation codes. No raw
message text is ever included. No-ops entirely if the env var is unset.

Stated honestly, two things this deliberately does NOT do, so they aren't
mistaken for more than they are:

1. It does not screen the **student's** incoming message for a disclosure of
   real self-harm risk — it only screens what the model is about to say
   back, and only escalates when that screening result is unusually
   persistent (survived a repair attempt too).
2. It is one webhook POST to whichever channel the webhook URL points at —
   there is no on-call rotation, acknowledgement tracking, or guaranteed
   human response time behind it. Whoever configures
   `GUARDIAN_ESCALATION_WEBHOOK_URL` is responsible for making sure a real
   person is actually watching that channel.

A distinct, well-tested student-message risk classifier (catching a
disclosure in what the *student* wrote, not just the tutor's reply) remains
a real, unbuilt follow-up.

## Voice: audio handling and retention

Voice is opt-in (`VOICE_ENABLED=1`) and tap-to-speak only — there is no
always-on microphone.

- **No raw audio is ever persisted.** `app/api/voice/transcribe/route.ts`
  reads the uploaded audio into memory, sends it to the configured
  speech-to-text provider (Groq Whisper — see `lib/ai/stt-providers.ts`),
  and discards the buffer once transcription returns. No audio file, blob,
  or byte array is written to the database, disk, or object storage at any
  point. `lib/db/schema.ts`'s `VoiceSession`/`QuestionAttempt` rows store
  only session metadata and a transcription **confidence score** — never
  the transcript audio itself, and (per `docs/privacy.md`'s existing
  logging invariant) `AiCall` logging for the STT provider follows the same
  "enums/ids/counts, not content" rule as the text-tutor logging above.
- **No voiceprint or speaker identification.** The STT call is a stateless,
  single-utterance transcription request — nothing in this codebase builds,
  stores, or compares a voice embedding/voiceprint, and no code attempts to
  identify *which* speaker produced an utterance beyond the already-scoped
  `VoiceSession` ownership check (which learner/guest the session belongs
  to, not who is speaking).
- **Transcript text** (as opposed to audio) is short-lived by design: it's
  used to resolve a voice command or a spoken-maths candidate answer for the
  current turn, and the raw transcript is not written to a persistent table
  — only the derived, already-graded `QuestionAttempt` row (with its
  `inputMode`/`transcriptionConfidence`/`learnerConfirmedTranscript`
  columns) and the existing chat message history (same as a typed answer)
  persist.
- **Provider data flow**: uploaded audio leaves this server only once, over
  HTTPS, to Groq's transcription API (`lib/ai/stt-providers.ts`), using a
  server-only `GROQ_API_KEY` — the browser never receives or sends provider
  credentials. Text-to-speech for the MVP is browser-native
  (`speechSynthesis`), so no learner audio or tutor text is sent to a
  third-party TTS provider at all.
- **Microphone state** is always visible to the student in the voice UI
  (idle/listening/processing/etc. — see `components/voice/*`), with an
  immediate mute/stop control, matching the "microphone state always
  visible, immediate mute" requirement for products used by minors.
