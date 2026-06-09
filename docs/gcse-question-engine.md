# GCSE-Style Adaptive Question Engine

This engine replaces fixed question banks with reusable **question archetypes**.
Normal lessons, concept cards, challenge questions, grading and scoring require
**0 LLM calls**.

## Runtime flow

1. Load the student's skill mastery (`StudentSkillMastery`).
2. Select the weakest skill for the lesson/mission and a difficulty band.
3. Pick an active archetype for that skill + band.
4. Generate variables deterministically and render the question.
5. Grade locally (`lib/questions/grade-answer.ts`).
6. Update mastery (`lib/adaptive/update-mastery.ts`).
7. Choose the next band: up after 2 correct, down/reteach after 2 wrong.

## Key modules

- `lib/db/schema.ts` — `QuestionArchetype`, `GeneratedQuestion`,
  `StudentSkillMastery`, `QuestionAttempt`.
- `lib/questions/generate-from-archetype.ts` — turns an archetype + variable
  schema into a concrete question. `answerExpression` is a JS expression
  (often a template literal like `` `${a+b}x` ``) evaluated against the
  resolved variables, using only whitelisted helpers in
  `lib/questions/answer-helpers.ts`.
- `lib/questions/grade-answer.ts` — numeric/tolerance, fraction, ratio and
  algebra-normalised grading.
- `lib/adaptive/select-next-question.ts` — band selection (70% current / 20%
  repair / 10% stretch, streak overrides), weakest-skill and archetype picking.
- `lib/adaptive/update-mastery.ts` — mastery score + band transitions.
- `lib/adaptive/detect-misconception.ts` — best-effort misconception tagging.
- `lib/adaptive/engine.ts` — DB-backed orchestrator (`selectNextQuestionFor*`,
  `recordAnswer`).

## The challenge consent gate

`lib/challenge-gate.ts` is the **single source of truth**: no challenge question
is ever fetched or rendered unless `canShowChallengeQuestion(state)` is true
(state === `"active"`), which only happens after the student explicitly clicks
**Start Challenge Mode**. At least `MIN_CONCEPT_CARDS_BEFORE_CHALLENGE` (3)
concept cards must be seen before the CTA is offered.

## Difficulty bands

- `must`: basic fluency (Year 8 confidence building).
- `should`: secure Year 8.
- `could`: Year 9 stretch.
- `gcse_bridge`: GCSE-style reasoning.

## Storage & seeding

- Edit archetypes in `data/question-archetypes/*.json`.
- Seed with `pnpm seed:question-archetypes` (validates required fields, upserts
  by slug, prints counts by topic and difficulty band).
- Migration: `lib/db/migrations/0008_question_archetype_engine.sql`.
