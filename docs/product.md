# Product Documentation

The Maths Learning Assistant helps students (Year 8 / Year 9, building towards AQA GCSE) learn maths through guided chat, with topic tracking, progress and goals.

See the [status legend](README.md#-status-legend) for what ✅ / 📝 / 🚧 mean.

## User modes

### Guest (not signed in)
- 📝 On first visit, the tutor introduces the app: guided maths chat, topics can be created and tracked, progress and goals are saved after registration.
- 🚧 **Guest question limit: 5 free questions.** After 5, further questions should be blocked with a prompt to register, preserving session state where possible.
  - ✅ *Enforced today instead:* a rate limit of **10 user messages per hour** per user (guests included). This is NOT the same as the 5-lifetime-question rule — that rule is not yet implemented.
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
