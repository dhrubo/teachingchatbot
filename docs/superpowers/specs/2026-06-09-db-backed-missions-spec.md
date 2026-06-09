# DB-Backed Missions, Lessons, Concept Cards, and Question Bank

**Date:** 2026-06-09  
**Status:** Approved  
**Goal:** Move Year 8 maths teaching content out of the LLM and into the database.

## Architecture

```
SaraDashboard → GET /api/lessons?year=8 → mission list
  → Click mission → GET /api/lessons?mission=X → lessons
    → Click lesson → GET /api/lessons?lesson=Y → cards + randomized questions
      → Concept card slides → Challenge Mode → Results
```

The LLM is called only for:
- "Explain differently" reteach
- Visual explanations after repeated confusion
- Generating backup questions when the DB bank is exhausted
- Open-ended help / parent reports

## Database Tables

### Mission
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | auto |
| slug | text UNIQUE | e.g. "percentages" |
| title | text | "Percentages" |
| description | text | |
| yearGroup | int | 8 or 9 |
| subject | text | default "maths" |
| gcseDomain | text | number, algebra, ratio, geometry, probability, statistics |
| order | int | display order |
| estimatedMinutes | int | |
| isActive | boolean | default true |

### Lesson
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| missionId | int FK→Mission | |
| slug | text UNIQUE | e.g. "percentages-lesson-1" |
| title | text | |
| summary | text | |
| order | int | display order within mission |
| difficultyBand | text | foundation, core, stretch, gcse_bridge |
| estimatedMinutes | int | |

### ConceptCard
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| lessonId | int FK→Lesson | |
| order | int | display order |
| title | text | |
| body | text | main explanation |
| visual | text | text-based diagram |
| example | text | worked example |
| misconception | text | common mistake to avoid |

### Question
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| lessonId | int FK→Lesson | |
| order | int | |
| difficulty | text | easy, medium, hard, boss |
| questionType | text | multiple_choice, short_text |
| prompt | text | |
| optionsJson | json | array of option strings |
| correctAnswer | text | |
| acceptableAnswersJson | json | array of acceptable variants |
| hint | text | |
| explanation | text | |
| gcseStyle | boolean | GCSE-style question |
| calculatorAllowed | boolean | |

## API: `/api/lessons`

Three query modes:

- `GET /api/lessons?year=8` — returns `{ missions: Mission[] }`
- `GET /api/lessons?mission=percentages` — returns `{ mission, lessons: Lesson[] }`
- `GET /api/lessons?lesson=percentages-lesson-1` — returns `{ lesson, conceptCards: ConceptCard[], questions: Question[] }` (questions randomized, returned in a random subset of 10)

## Client Flow

1. **SaraDashboard** calls `GET /api/lessons?year=8` → renders mission list
2. User clicks a mission → navigates to lesson picker (or starts first incomplete lesson)
3. Lesson loads → **3+ concept cards** shown as slides overlay
4. Student clicks "Ready for Challenge" → **Challenge CTA** (Start / Keep Learning / Explain Differently)
5. "Start Challenge Mode" → **full-screen ChallengeMode** with 10 questions (randomized, locally graded)
6. Results screen shows: star rating, score, correct/wrong/accuracy
7. Buttons: "Review mistakes", "Next lesson", "Move to next mission"

## Seed Data

`scripts/seed-missions.ts` — idempotent upsert of all 18 Year 8 missions:

1. Number Skills
2. Fractions
3. Decimals
4. Percentages
5. Ratio and Proportion
6. Algebra Basics
7. Equations
8. Coordinates
9. Straight-Line Graphs
10. Angles and Geometry
11. Area and Perimeter
12. Probability
13. Statistics
14. Transformations
15. Sequences
16. Standard Form and Powers
17. Units, Speed and Measures
18. Pythagoras Preparation

Each mission: 4–6 lessons. Each lesson: 3 concept cards + 20 questions.
Difficulty per lesson: 8 easy, 6 medium, 4 hard, 2 boss.

Total: ~90 lessons, ~270 concept cards, ~1,800 questions.

## LLM-Free Operations

The following must not call the LLM:
- mission selection
- lesson loading
- concept card display
- question serving
- local grading
- progress bar updates
- score calculation
- badges / streaks
- challenge results

## Guest vs Logged-In

Guest users: random missions, no XP/streaks/badges saved, 5 questions/day, 24h retention.
Logged-in users: resume missions, track progress, save challenge results, XP/streaks/badges.

## Migration Plan

1. Add new tables to `lib/db/schema.ts`
2. Create `scripts/seed-missions.ts` with Year 8 content
3. Create `app/(chat)/api/lessons/route.ts`
4. Update `SaraDashboard` to fetch from `/api/lessons`
5. Wire lesson flow: concept cards → challenge mode → results
6. Remove dependency on `TopicContent` table and `getPreAuthoredContent` tool
7. Build + test

## Acceptance Criteria

- [ ] Missions stored in DB
- [ ] Lessons stored in DB
- [ ] Concept cards stored in DB
- [ ] Questions stored in DB
- [ ] Seed script idempotent
- [ ] Guest users see random missions
- [ ] Logged-in users resume learned missions
- [ ] Guests do not store XP/streak/badges
- [ ] Logged-in users store progress
- [ ] Lessons show 3+ cards before challenge
- [ ] Challenge mode is full-screen, 10 questions
- [ ] Challenge mode asks multiple questions
- [ ] Objective grading uses zero LLM calls
- [ ] Lesson start uses zero LLM calls
- [ ] `pnpm test:unit` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
