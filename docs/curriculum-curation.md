# GCSE Mastery Curriculum Curation & Expansion Guide

This guide describes how to expand the **GCSE Mastery** database-backed curriculum, add new GCSE subjects (like Science), define new lessons and concept cards, and write dynamic, locally graded **Question Archetypes** that generate thousands of unique practice questions with zero LLM API costs.

---

## 🗺️ 1. Curriculum Database Hierarchy

The curriculum is represented as a strictly typed relational structure in Postgres:

```
Subject (e.g. maths, science)
  └── Mission (Topic - e.g. "percentages", "cell-biology")
        └── Lesson (Subtopic - e.g. "intro-to-percentages", "osmosis")
              ├── Concept Cards (3+ visual flashcards explaining ideas)
              └── Skills & Question Archetypes (Dynamic question templates)
```

---

## 🚀 2. Step 1: Adding a New Subject or Topic (Mission)

Missions are stored in the `Mission` table. To add a new topic, write an insert query or add it to a seeding script (e.g. `scripts/seed-science-curriculum.ts`):

### Mission Properties:
* `slug`: A unique URL-friendly string (e.g., `cell-biology`).
* `title`: Display name (e.g., `GCSE Biology: Cell Biology`).
* `description`: Sub-headline describing what is covered.
* `yearGroup`: `8` or `9`.
* `subject`: `'maths'` or `'science'`.
* `gcseDomain`: One of the six GCSE domains: `number`, `algebra`, `ratio_proportion_rates`, `geometry_measures`, `probability`, `statistics`, `biology`, `chemistry`, `physics`.
* `order`: Integer representing display sorting order in the vertical Topic Map.
* `estimatedMinutes`: Average study time.

```typescript
// Seeding code example:
await db.insert(mission).values({
  slug: "infection-response",
  title: "GCSE Biology: Infection & Response",
  description: "Learn how the human immune system, vaccines, and antibiotics fight pathogens.",
  yearGroup: 9,
  subject: "science",
  gcseDomain: "biology",
  order: 4,
  estimatedMinutes: 20
});
```

---

## 📖 3. Step 2: Adding Subtopics (Lessons) & Concept Cards

Each mission contains discrete, teachable chunks called **Lessons**. Each lesson holds **Concept Cards** (visual review cards shown to the student as slides before starting the practice quiz).

### A. Lesson Properties:
* `missionId`: Foreign key linking to the parent `Mission.id`.
* `slug`: Unique string (e.g., `immune-system-basics`).
* `title`: Name (e.g., `The Human Immune System`).
* `summary`: Brief explanation of lesson goals.
* `order`: Sorting order inside the parent mission.
* `difficultyBand`: `'foundation'`, `'core'`, `'stretch'`, or `'gcse_bridge'`.

### B. Concept Card Properties:
* `lessonId`: Foreign key linking to the parent `Lesson.id`.
* `order`: Slide order index (starting from 1).
* `title`: Slide headline.
* `body`: Core conceptual explanation.
* `visual`: Text-based diagram or ASCII model representing the concept (shown inside a terminal codeblock).
* `example`: Worked-out mathematical or scientific example.
* `misconception`: Common error/misconception to avoid.

```typescript
// Seeding a Lesson and cards:
const [newLesson] = await db.insert(lesson).values({
  missionId: parentMissionId,
  slug: "immune-system-basics",
  title: "The Human Immune System",
  summary: "Master white blood cell mechanisms: phagocytosis and antibody production.",
  order: 1,
  estimatedMinutes: 10
}).returning();

await db.insert(conceptCard).values([
  {
    lessonId: newLesson.id,
    order: 1,
    title: "Phagocytosis Explained",
    body: "Phagocytes are white blood cells that engulf and digest pathogens directly.",
    visual: "White Blood Cell ──> [ Engulfs Pathogen ] ──> Destroys Pathogen 💀",
    example: "This non-specific response acts as a primary cellular defense line.",
    misconception: "Phagocytosis is not 'antibody production' — it is direct ingestion."
  }
]);
```

---

## 🎨 4. Step 3: Expanding the Question Bank (Question Archetypes)

The adaptive question engine does not use static banks or live AI generations. Instead, it generates questions from **Question Archetypes** defined inside JSON files under `data/question-archetypes/*.json` (e.g. `percentages.json`, `algebra.json`).

### A. JSON Archetype Anatomy
Here is a complete, annotated Physics question template:

```json
{
  "slug": "physics_energy_ke_standard",
  "subject": "science",
  "yearGroup": 9,
  "missionSlug": "physics-energy",
  "lessonSlug": "kinetic-energy-calculations",
  "skillSlug": "physics_energy_ke_math",
  "gcseDomain": "physics",
  "difficultyBand": "should",
  "questionType": "numeric",
  "template": "Calculate the kinetic energy of an object with a mass of {m} kg moving at a velocity of {v} m/s. (Round to 1 decimal place)",
  "variableSchemaJson": {
    "m": [4, 8, 10, 16],
    "v": [3, 5, 6, 10]
  },
  "answerExpression": "0.5 * m * (v * v)",
  "acceptableAnswerRulesJson": {
    "numeric": true,
    "tolerance": 0.1
  },
  "hintTemplate": "Squaring the velocity ({v}²) gives {v*v}. Then multiply by 0.5 and the mass ({m}). Formula: Ek = ½ * m * v².",
  "explanationTemplate": "Ek = 0.5 * {m} * {v}² = 0.5 * {m} * {v*v} = {answer} J."
}
```

### B. Defining Variable Schemas
The `variableSchemaJson` provides value pools that the generator resolves deterministically at runtime.
* **Scalar arrays:** Lists of numbers or strings: `"m": [4, 8, 10]`
* **Co-prime/derived variables:** You can evaluate mathematical combinations directly within templates using `{a+b}`, `{m*v}`, or `{v*v}`.

### C. Whitelisted Algebraic & Numeric Helpers
For complex expressions, the generator parses the `answerExpression` through our sandboxed mathematical evaluator. The following helpers are fully whitelisted under `lib/questions/answer-helpers.ts` and can be used in your formulas:
* `round2(x)` — Rounds to 2 decimal places.
* `simplifyFraction(num, den)` — Simplifies a fraction and returns string `num/den` (e.g., `3/4`).
* `simplifyRatio(a, b)` — Simplifies a 2-part ratio and returns string `a:b` (e.g., `2:5`).
* `gcd(a, b)` — Greatest common divisor.
* `lcm(a, b)` — Least common multiple.

*Example Ratio formula:* `"answerExpression": "simplifyRatio(a, b)"`

### D. Answer Matching Rules (`acceptableAnswerRulesJson`)
Configures how the student's typed input is graded local-side:
* **Numeric tolerance:** `"numeric": true, "tolerance": 0.1` (permits small float deviations).
* **Algebra normalisation:** `"normaliseAlgebra": true` (grades `3x + 2` and `2 + 3x` identically).
* **Case insensitivity:** `"caseInsensitive": true` (grades `AQA` and `aqa` identically).

---

## ⚡ 5. Step 4: Loading & Seeding New Content

### A. Run Database Seeding
After modifying any `data/question-archetypes/*.json` files or writing custom seeding scripts, run the seed commands to validate and import your changes:

```bash
# Validate and upsert question templates into Postgres
pnpm seed:question-archetypes
```

If any required field is missing or an expression syntax is broken, the seeder automatically raises a helpful validation error on build *before* uploading to your production database, safeguarding your app from runtime crashes.

---

## 🛠️ 6. Best Practices for High-Quality Curriculum Expansion

1. **At Least 1 Archetype per Difficulty Band:** To prevent the student's adaptive challenge from getting stuck, ensure every lesson has at least one archetype for each band: `must` (basics), `should` (core), `could` (stretch), and `gcse_bridge` (exam reasoning).
2. **Support multiple formats:** If a question has options, specify `optionsJson` in your archetype. The UI will automatically render it as multiple-choice instead of text input!
3. **Use `{answer}` replacement:** Always include variable placeholders (e.g., `{v}`, `{m}`) and `{answer}` inside your `hintTemplate` and `explanationTemplate`. The engine evaluates and injects the actual computed numbers, giving the student a tailored step-by-step worked solution!
