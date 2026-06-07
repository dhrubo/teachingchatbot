# Product Documentation

The Maths Learning Assistant helps students (Year 8 / Year 9, building towards AQA GCSE) learn maths through guided chat, with topic tracking, progress and goals.

See the [status legend](README.md#-status-legend) for what ✅ / 📝 / 🚧 mean.

## User modes

### Guest (not signed in) — conversational onboarding
- 📝 **Start learning immediately.** The tutor does *not* ask for a full profile upfront and does *not* open with limits or a feature tour — it answers the maths question first.
- 📝 **Gradual, benefit-framed data collection:** level (Year 8/9) is asked only after some engagement (to pitch difficulty); name is asked only when introducing progress-tracking benefits.
- 🚧 **Guest question limit: 5 free questions, counted silently.** The tutor introduces the *soft value* of an account around question 4 and politely stops at question 5, leading with benefits (save progress, track %, continue topics, set goals).
  - ✅ *Enforced today instead:* a rate limit of **10 user messages per hour** per user (guests included). The silent 5-question count and hard stop are NOT yet implemented in code — currently the Q4/Q5 behaviour is tutor-prompted only.
- 📝 **Session continuity:** registering or logging in mid-conversation preserves the current chat and resumes topic/progress without a reset.
- ✅ Registered and guest conversations are both persisted as chats; logging in restores prior conversation state.

### Registered / logged-in
- ✅ Previous conversation history is restored on login.
- 📝 The tutor resumes the last active topic unless the student switches.

## Topics
- 📝 Conversations are organised by maths topic (e.g. Fractions, Decimals, Algebra), under the subject "Maths".
- 🚧 **Maximum 5 active topics.** When exceeded, the student is prompted to archive or complete an existing topic. There is currently no `archived`/`active` topic state in the data model, so this limit is communicated by the tutor but not enforced.

## Progress tracking
- ✅ Per-topic mastery is stored on a **0–5 scale** (`TopicProgress.score`) with a status (`not_started` → `mastered`), confidence, and attempt counts. See [developer.md](developer.md).
- 🚧 **0–100% completion per topic**, derived from questions answered / concepts covered / demonstrated understanding, shown as e.g. "Decimals – 45% complete". This percentage view is 📝 tutor-presented only; it is not yet a stored field.

## Goals & exam prep
- ✅ Short-term goals are stored (`StudentGoal`): topic, description, target date, status, confidence, notes.
- ✅ Long-term GCSE readiness: each topic rolls up to one of the six AQA GCSE Maths domains (`TopicProgress.gcseDomain`).
- 📝 Exam-prep goals are framed as "Exam Prep: [Topic]" under "Maths → Exam Prep", focusing on practice questions, common exam patterns and weak areas, with pacing based on time to the target date.

## Tone
Friendly, encouraging, clear, motivational but not patronising. British English. See the system prompt in [`lib/ai/prompts-tutor.ts`](../lib/ai/prompts-tutor.ts).

## Example tutor responses
- Guest limit reached → "You've reached your 5 free questions. Create an account to keep going and track your progress."
- Topic limit reached → "You already have 5 active topics. Want to finish or archive one before starting a new one?"
- Goal created → "Nice — let's get you ready for your 17 June exam. We'll create an 'Exam Prep: Decimals' focus and work on the key question types."
