# Mission-Based Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the chat-centric TeachingChatbot into a mission-based learning adventure with concept cards, full-screen challenge mode, and a redesigned homepage.

**Architecture:** Keep the existing `useChat`/`streamText` infrastructure as the base layer. Add a `MissionOrchestrator` component that wraps the chat in a mission state machine (HOME → LESSON → CARDS → GATE → CHALLENGE → RESULTS → COMPLETE). The chat engine runs underneath but is hidden during cards/challenge phases. Concept cards are pre-authored static data. Challenge mode is a full-screen overlay. Scoring and grading are client-side.

**Tech Stack:** Next.js, React, Tailwind CSS (dark theme), Drizzle ORM (Postgres/Neon), AI SDK (streamText/useChat), framer-motion

---

## File Structure

### New Files
- `lib/ai/missions.ts` — Mission definitions + concept card data (static)
- `lib/ai/guest-mission.ts` — Random guest mission picker
- `lib/db/queries/mission.ts` — MissionProgress CRUD queries
- `lib/db/migrations/0004_add_mission_progress.sql` — New table migration
- `components/chat/mission-map.tsx` — Visual mission journey component
- `components/chat/concept-card-slides.tsx` — Concept card slide deck
- `components/chat/challenge-mode.tsx` — Full-screen challenge overlay
- `components/chat/challenge-results.tsx` — Results screen
- `components/chat/mission-orchestrator.tsx` — Mission state machine
- `components/chat/mission-header.tsx` — Mission progress header
- `app/(parent)/dashboard/page.tsx` — Parent dashboard route

### Modified Files
- `lib/db/schema.ts` — Add `MissionProgress` table definition
- `lib/db/queries/index.ts` — Export new mission queries
- `lib/ai/prompts-tutor.ts` — Simplify to ~200 lines
- `components/chat/sara-dashboard.tsx` — Rewrite as landing page with hero + mission map + how it works
- `components/chat/shell.tsx` — Add `MissionOrchestrator`, hide chat input during challenge mode
- `components/chat/answer-panel.tsx` — Simplify (used only for non-challenge questions)
- `hooks/use-active-chat.tsx` — Add mission state (missionId, missionPhase, missionProgress)
- `app/(chat)/api/chat/route.ts` — No major changes (prompt string change only)
- `lib/ai/curriculum.ts` — May need mission-to-topic mapping helpers

### Deleted Files
- `components/chat/topic-entry-overlay.tsx` — Replaced by mission INTRO screen

---

### Task 1: Mission Data Definitions

**Files:**
- Create: `lib/ai/missions.ts`

- [ ] **Create `lib/ai/missions.ts` with mission definitions for Year 8 topics**

Define the `ConceptCard` and `MissionDefinition` types and export a `MISSIONS` array and a `getMission(id)` lookup.

```typescript
// lib/ai/missions.ts
export interface ConceptCard {
  id: string;
  title: string;
  visual: string;
  example: string;
  explanation: string; // max 50 words
}

export interface MissionDefinition {
  id: string;
  title: string;
  yearGroup: "8" | "9";
  emoji: string;
  description: string;
  estimatedMinutes: number;
  topics: string[];
  prerequisiteMissionIds: string[];
  gcseDomain: string;
  conceptCards: ConceptCard[];
}

export const MISSIONS: MissionDefinition[] = [
  {
    id: "missions/percentages",
    title: "Percentages",
    yearGroup: "8",
    emoji: "💯",
    description: "Master percentages — from basics to real-world problems.",
    estimatedMinutes: 15,
    topics: ["Percentages"],
    prerequisiteMissionIds: ["missions/number-skills", "missions/fractions"],
    gcseDomain: "number",
    conceptCards: [
      {
        id: "pc-percentages-1",
        title: "Percent means out of 100",
        visual: "25% = 25/100 = 0.25",
        example: "75% = 75 out of every 100",
        explanation: "Percent is a way of showing a part of a whole, split into 100 equal pieces.",
      },
      {
        id: "pc-percentages-2",
        title: "Useful benchmark percentages",
        visual: "50% = ½   25% = ¼   10% = ⅒  1% = 1/100",
        example: "75% = ¾ = three quarters",
        explanation: "Knowing these makes mental maths much faster.",
      },
      {
        id: "pc-percentages-3",
        title: "Finding 50% of a number",
        visual: "50% of 80 → 80 × ½ = 40",
        example: "50% of 200 = 100",
        explanation: "50% is just half. Halving is the fastest percentage calculation.",
      },
      {
        id: "pc-percentages-4",
        title: "Finding 10% of a number",
        visual: "10% of 80 → 80 ÷ 10 = 8",
        example: "10% of 150 = 15",
        explanation: "10% is one tenth. Just divide by 10.",
      },
    ],
  },
  {
    id: "missions/ratio",
    title: "Ratio and Proportion",
    yearGroup: "8",
    emoji: "⚖️",
    description: "Simplify ratios, share in a given ratio, and solve proportion problems.",
    estimatedMinutes: 15,
    topics: ["Ratio"],
    prerequisiteMissionIds: ["missions/number-skills", "missions/fractions"],
    gcseDomain: "ratio_proportion_rates",
    conceptCards: [
      {
        id: "pc-ratio-1",
        title: "What is a ratio?",
        visual: "3:2 means 3 parts to 2 parts",
        example: "Apples:oranges = 3:2 in a fruit bowl",
        explanation: "A ratio compares two quantities. The order matters — 3:2 is different from 2:3.",
      },
      {
        id: "pc-ratio-2",
        title: "Simplifying ratios",
        visual: "6:4 = 3:2 (divide both by 2)",
        example: "12:8 = 3:2",
        explanation: "Like fractions, ratios can be simplified by dividing both parts by the same number.",
      },
      {
        id: "pc-ratio-3",
        title: "Sharing in a ratio",
        visual: "Share £20 in ratio 3:2 → 3+2=5 parts",
        example: "£20 ÷ 5 = £4 per part → 3×£4=£12, 2×£4=£8",
        explanation: "Add the parts to find the total number of shares. Divide the amount by total shares, then multiply each part.",
      },
    ],
  },
  {
    id: "missions/algebra-basics",
    title: "Algebra Basics",
    yearGroup: "8",
    emoji: "🔤",
    description: "Expand brackets, factorise, solve equations and inequalities.",
    estimatedMinutes: 20,
    topics: ["Basic algebra"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "algebra",
    conceptCards: [
      {
        id: "pc-algebra-1",
        title: "What is a variable?",
        visual: "x + 5 = 12 → x = 7",
        example: "3y = 15 → y = 5",
        explanation: "A letter represents an unknown number. Your job is to find what it stands for.",
      },
      {
        id: "pc-algebra-2",
        title: "Solving equations — balance",
        visual: "x + 7 = 15 → x = 15 - 7 → x = 8",
        example: "2x + 3 = 11 → 2x = 8 → x = 4",
        explanation: "Whatever you do to one side, do to the other. Aim to get the variable alone.",
      },
      {
        id: "pc-algebra-3",
        title: "Expanding brackets",
        visual: "3(x + 2) = 3x + 6",
        example: "2(4x - 1) = 8x - 2",
        explanation: "Multiply everything inside the bracket by the number outside.",
      },
    ],
  },
  {
    id: "missions/graphs",
    title: "Straight-Line Graphs",
    yearGroup: "8",
    emoji: "📈",
    description: "Plot coordinates, draw linear graphs, complete tables of values.",
    estimatedMinutes: 15,
    topics: ["Graphs and coordinates"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "algebra",
    conceptCards: [
      {
        id: "pc-graphs-1",
        title: "Coordinates",
        visual: "(3, 2) means 3 across, 2 up",
        example: "(0, 0) is the origin — where the axes meet",
        explanation: "The first number is horizontal (x-axis), the second is vertical (y-axis).",
      },
      {
        id: "pc-graphs-2",
        title: "Tables of values",
        visual: "y = 2x + 1 → x=0→y=1, x=1→y=3, x=2→y=5",
        example: "For y = x + 3: (0,3), (1,4), (2,5)",
        explanation: "Pick x values, plug them into the equation to find matching y values.",
      },
      {
        id: "pc-graphs-3",
        title: "Plotting points",
        visual: "Plot (0,1), (1,3), (2,5) — they make a straight line",
        example: "y = 2x + 1 gives a straight line through those points",
        explanation: "When all your points line up, the relationship is linear.",
      },
    ],
  },
  {
    id: "missions/angles",
    title: "Angles and Geometry",
    yearGroup: "8",
    emoji: "📐",
    description: "Angles in polygons, parallel lines, and area of circles.",
    estimatedMinutes: 15,
    topics: ["Geometry"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "geometry_measures",
    conceptCards: [
      {
        id: "pc-angles-1",
        title: "Angles on a straight line",
        visual: "30° + 150° = 180°",
        example: "Angles on a straight line always add up to 180°",
        explanation: "If you know one angle, subtract from 180 to find the other.",
      },
      {
        id: "pc-angles-2",
        title: "Angles in a triangle",
        visual: "60° + 70° + 50° = 180°",
        example: "If two angles are 50° and 60°, the third is 70°",
        explanation: "All three angles in any triangle add up to 180°.",
      },
      {
        id: "pc-angles-3",
        title: "Angles in parallel lines",
        visual: "Corresponding angles are equal (F-shape)",
        example: "Alternate angles are equal (Z-shape)",
        explanation: "When a line crosses parallel lines, some angles match. Look for F and Z patterns.",
      },
    ],
  },
  {
    id: "missions/probability",
    title: "Probability",
    yearGroup: "8",
    emoji: "🎲",
    description: "Frequency trees, probability scales, two-way tables.",
    estimatedMinutes: 15,
    topics: ["Statistics and probability foundations"],
    prerequisiteMissionIds: ["missions/number-skills", "missions/fractions"],
    gcseDomain: "probability",
    conceptCards: [
      {
        id: "pc-prob-1",
        title: "Probability scale",
        visual: "0 (impossible) ←———→ 1 (certain)",
        example: "Flipping heads on a coin = 0.5",
        explanation: "Probability is always between 0 and 1. 0 = impossible, 1 = certain.",
      },
      {
        id: "pc-prob-2",
        title: "Calculating probability",
        visual: "P(event) = favourable outcomes ÷ total outcomes",
        example: "Rolling a 4 on a die: 1 ÷ 6 = 1/6",
        explanation: "Count how many ways the event can happen, divide by all possible outcomes.",
      },
      {
        id: "pc-prob-3",
        title: "Frequency trees",
        visual: "Start → splits into branches → each branch has a probability",
        example: "60 students: ⅔ walk, ⅓ bus. Of walkers, ¼ are late.",
        explanation: "Trees show all possible paths. Multiply along branches to find combined probabilities.",
      },
    ],
  },
  {
    id: "missions/number-skills",
    title: "Number Skills",
    yearGroup: "8",
    emoji: "🔢",
    description: "Rounding, standard form, fractions, and money calculations.",
    estimatedMinutes: 15,
    topics: ["Number and calculations"],
    prerequisiteMissionIds: [],
    gcseDomain: "number",
    conceptCards: [
      {
        id: "pc-number-1",
        title: "Rounding to decimal places",
        visual: "3.14159 → 3.14 (2 d.p.)",
        example: "7.286 → 7.29 (2 d.p., the 6 rounds up)",
        explanation: "Count the decimal places you need. Look at the next digit — 5 or more rounds up.",
      },
      {
        id: "pc-number-2",
        title: "Fractions — adding",
        visual: "½ + ⅓ = 3/6 + 2/6 = 5/6",
        example: "¼ + ⅜ = 2/8 + 3/8 = 5/8",
        explanation: "Get a common denominator first, then add the numerators.",
      },
      {
        id: "pc-number-3",
        title: "Money calculations",
        visual: "£3.50 × 4 = £14.00",
        example: "8 apples at 45p each = £3.60",
        explanation: "Convert pence to pounds by dividing by 100. Keep track of decimal places.",
      },
    ],
  },
  {
    id: "missions/fractions",
    title: "Fractions",
    yearGroup: "8",
    emoji: "🧮",
    description: "Mixed fractions, operations, and fraction of amounts.",
    estimatedMinutes: 15,
    topics: ["Number and calculations", "Fractions"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "number",
    conceptCards: [
      {
        id: "pc-frac-1",
        title: "Mixed numbers to improper",
        visual: "2⅓ = (2×3+1)/3 = 7/3",
        example: "3¼ = 13/4",
        explanation: "Multiply the whole number by the denominator, add the numerator.",
      },
      {
        id: "pc-frac-2",
        title: "Multiplying fractions",
        visual: "½ × ¾ = 3/8",
        example: "⅔ × ⅘ = 8/15",
        explanation: "Multiply the numerators together, multiply the denominators together. Then simplify.",
      },
      {
        id: "pc-frac-3",
        title: "Fraction of an amount",
        visual: "⅗ of 20 = (20 ÷ 5) × 3 = 4 × 3 = 12",
        example: "¾ of 40 = 30",
        explanation: "Divide by the denominator, then multiply by the numerator.",
      },
    ],
  },
  {
    id: "missions/simultaneous-equations",
    title: "Simultaneous Equations",
    yearGroup: "9",
    emoji: "➗",
    description: "Solve two equations at once using elimination and substitution.",
    estimatedMinutes: 20,
    topics: ["Algebra and algebraic problem solving"],
    prerequisiteMissionIds: ["missions/algebra-basics"],
    gcseDomain: "algebra",
    conceptCards: [
      {
        id: "pc-sim-1",
        title: "What are simultaneous equations?",
        visual: "x + y = 10 and 2x - y = 5",
        example: "Two equations, two unknowns — find the pair that fits both",
        explanation: "You need as many equations as you have unknowns. The solution works for both equations.",
      },
      {
        id: "pc-sim-2",
        title: "Elimination method",
        visual: "x + y = 10 and 2x - y = 5 → add them: 3x = 15 → x = 5",
        example: "x + y = 10 → 5 + y = 10 → y = 5",
        explanation: "Add or subtract the equations to cancel one variable. Then solve for the other.",
      },
      {
        id: "pc-sim-3",
        title: "Checking your answer",
        visual: "Check: x=5, y=5 → 2(5)-5=5 ✓",
        example: "Plug both values back into the original equations",
        explanation: "Always check! Both equations must be true with your solution.",
      },
    ],
  },
  {
    id: "missions/pythagoras",
    title: "Pythagoras' Theorem",
    yearGroup: "9",
    emoji: "📏",
    description: "Find missing sides in right-angled triangles.",
    estimatedMinutes: 15,
    topics: ["Measurement and geometry"],
    prerequisiteMissionIds: ["missions/number-skills", "missions/angles"],
    gcseDomain: "geometry_measures",
    conceptCards: [
      {
        id: "pc-pythag-1",
        title: "The theorem",
        visual: "a² + b² = c²",
        example: "For sides 3 and 4: 3²+4²=9+16=25, so c=5",
        explanation: "In a right-angled triangle, the square of the longest side equals the sum of the squares of the other two.",
      },
      {
        id: "pc-pythag-2",
        title: "Finding the hypotenuse",
        visual: "a=6, b=8 → c²=36+64=100 → c=10",
        example: "a=5, b=12 → c²=25+144=169 → c=13",
        explanation: "The hypotenuse is always opposite the right angle. Square both sides, add, then square root.",
      },
      {
        id: "pc-pythag-3",
        title: "Finding a shorter side",
        visual: "c=13, a=5 → b²=169-25=144 → b=12",
        example: "c=10, b=6 → a²=100-36=64 → a=8",
        explanation: "Subtract the square of the known side from the square of the hypotenuse.",
      },
    ],
  },
  {
    id: "missions/indices",
    title: "Indices and Standard Form",
    yearGroup: "9",
    emoji: "🔢",
    description: "Laws of indices and working with standard form.",
    estimatedMinutes: 15,
    topics: ["Sequences and indices"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "number",
    conceptCards: [
      {
        id: "pc-indices-1",
        title: "What are indices?",
        visual: "2³ = 2 × 2 × 2 = 8",
        example: "5² = 25, 3⁴ = 81",
        explanation: "The index (power) tells you how many times to multiply the base by itself.",
      },
      {
        id: "pc-indices-2",
        title: "Multiplying powers",
        visual: "a³ × a² = a⁵ (add the powers)",
        example: "2⁴ × 2³ = 2⁷ = 128",
        explanation: "When multiplying with the same base, add the powers. aᵐ × aⁿ = aᵐ⁺ⁿ",
      },
      {
        id: "pc-indices-3",
        title: "Standard form",
        visual: "3,000 = 3 × 10³",
        example: "0.005 = 5 × 10⁻³",
        explanation: "Standard form is a × 10ⁿ where 1 ≤ a < 10. Big numbers = positive n, small numbers = negative n.",
      },
    ],
  },
  {
    id: "missions/probability-trees",
    title: "Probability Tree Diagrams",
    yearGroup: "9",
    emoji: "🌳",
    description: "Combined events using tree diagrams.",
    estimatedMinutes: 15,
    topics: ["Probability"],
    prerequisiteMissionIds: ["missions/probability"],
    gcseDomain: "probability",
    conceptCards: [
      {
        id: "pc-probtree-1",
        title: "Tree diagram structure",
        visual: "First event → branches → second event → branches",
        example: "Tossing a coin twice: H→(H,T), T→(H,T)",
        explanation: "Each branch shows a possible outcome. Multiply along branches for combined probability.",
      },
      {
        id: "pc-probtree-2",
        title: "Independent events",
        visual: "P(H and H) = ½ × ½ = ¼",
        example: "Rolling a die and flipping a coin",
        explanation: "The first outcome doesn't affect the second. Multiply the probabilities.",
      },
      {
        id: "pc-probtree-3",
        title: "Adding up to 1",
        visual: "All end results add to 1: ¼+¼+¼+¼=1",
        example: "Check your tree by adding all final probabilities",
        explanation: "The sum of all possible outcomes (all branches at the end) must equal 1.",
      },
    ],
  },
  {
    id: "missions/quadratic-graphs",
    title: "Quadratic Graphs",
    yearGroup: "9",
    emoji: "📊",
    description: "Tables of values and drawing quadratic graphs.",
    estimatedMinutes: 15,
    topics: ["Graphs and functions"],
    prerequisiteMissionIds: ["missions/graphs"],
    gcseDomain: "algebra",
    conceptCards: [
      {
        id: "pc-quad-1",
        title: "What makes a quadratic?",
        visual: "y = x² curves, not straight",
        example: "y = x² + 2x + 1",
        explanation: "Quadratics have an x² term. Their graphs are U-shaped curves, not straight lines.",
      },
      {
        id: "pc-quad-2",
        title: "Table of values for quadratics",
        visual: "y = x²: (-2,4), (-1,1), (0,0), (1,1), (2,4)",
        example: "Include negative x values — the curve is symmetrical",
        explanation: "Use at least 5 x values including negatives. The y values will show symmetry.",
      },
      {
        id: "pc-quad-3",
        title: "Shape of the curve",
        visual: "y = x² makes a U shape",
        example: "Negative x² makes an inverted U (∩ shape)",
        explanation: "If x² is positive, the curve smiles. If it's negative, the curve frowns.",
      },
    ],
  },
  {
    id: "missions/inverse-proportion",
    title: "Direct and Inverse Proportion",
    yearGroup: "9",
    emoji: "🔁",
    description: "Direct proportion graphs and inverse proportion problems.",
    estimatedMinutes: 15,
    topics: ["Ratio, proportion, and scale"],
    prerequisiteMissionIds: ["missions/ratio"],
    gcseDomain: "ratio_proportion_rates",
    conceptCards: [
      {
        id: "pc-prop-1",
        title: "Direct proportion",
        visual: "y = kx — as x doubles, y doubles",
        example: "5 apples cost £2 → 10 apples cost £4",
        explanation: "Two quantities increase together at the same rate. The graph is a straight line through (0,0).",
      },
      {
        id: "pc-prop-2",
        title: "Inverse proportion",
        visual: "y = k/x — as x doubles, y halves",
        example: "2 painters take 6 hours → 4 painters take 3 hours",
        explanation: "One quantity goes up as the other goes down. The graph curves towards the axes.",
      },
      {
        id: "pc-prop-3",
        title: "Finding the constant k",
        visual: "y = kx → k = y/x (direct). y = k/x → k = xy (inverse)",
        example: "If y=12 when x=3 in direct proportion: k = 12/3 = 4",
        explanation: "Find k using one known pair. Then use k to find any unknown value.",
      },
    ],
  },
];

export function getMission(id: string): MissionDefinition | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function getMissionsByYear(year: "8" | "9"): MissionDefinition[] {
  return MISSIONS.filter((m) => m.yearGroup === year);
}
```

- [ ] **Commit**

```bash
git add lib/ai/missions.ts
git commit -m "feat: add mission definitions with concept cards"
```

---

### Task 2: Guest Mission Picker

**Files:**
- Create: `lib/ai/guest-mission.ts`

- [ ] **Create `lib/ai/guest-mission.ts`**

Deterministic per-date picker from a curated subset of missions for guests to keep things fresh.

```typescript
// lib/ai/guest-mission.ts
import { type MissionDefinition, getMission, MISSIONS } from "./missions";

const GUEST_MISSION_IDS = [
  "missions/percentages",
  "missions/ratio",
  "missions/algebra-basics",
  "missions/graphs",
  "missions/angles",
  "missions/simultaneous-equations",
  "missions/pythagoras",
  "missions/indices",
  "missions/probability",
  "missions/fractions",
];

function dateSeed(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function hash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickGuestMission(date: Date = new Date()): MissionDefinition | undefined {
  const seed = dateSeed(date);
  const idx = hash(seed) % GUEST_MISSION_IDS.length;
  return getMission(GUEST_MISSION_IDS[idx]);
}

export function isGuestEmail(email: string): boolean {
  return /^guest-\d+$/.test(email);
}
```

- [ ] **Commit**

```bash
git add lib/ai/guest-mission.ts
git commit -m "feat: add deterministic guest mission picker"
```

---

### Task 3: DB Migration for MissionProgress

**Files:**
- Create: `lib/db/migrations/0004_add_mission_progress.sql`
- Modify: `lib/db/schema.ts`
- Create: `lib/db/queries/mission.ts`
- Modify: `lib/db/queries/index.ts`

- [ ] **Add `missionProgress` table to `lib/db/schema.ts`**

```typescript
// Add after the studentGoal table definition (line ~237)

export const missionProgress = pgTable(
  "MissionProgress",
  {
    studentId: uuid("studentId")
      .notNull()
      .references(() => studentProfile.id, { onDelete: "cascade" }),
    missionId: text("missionId").notNull(),
    status: varchar("status", {
      enum: ["not_started", "in_progress", "completed", "mastered"],
    })
      .notNull()
      .default("not_started"),
    phase: varchar("phase", {
      enum: ["intro", "lesson", "cards", "challenge", "results"],
    })
      .notNull()
      .default("intro"),
    score: integer("score").notNull().default(0),
    challengesDone: integer("challengesDone").notNull().default(0),
    challengesTotal: integer("challengesTotal").notNull().default(0),
    conceptCardsViewed: integer("conceptCardsViewed").notNull().default(0),
    lastLessonAt: timestamp("lastLessonAt"),
    completedAt: timestamp("completedAt"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studentId, table.missionId] }),
  })
);

export type MissionProgress = InferSelectModel<typeof missionProgress>;
```

- [ ] **Create `lib/db/migrations/0004_add_mission_progress.sql`**

```sql
CREATE TABLE IF NOT EXISTS "MissionProgress" (
  "studentId" uuid NOT NULL REFERENCES "StudentProfile"("id") ON DELETE CASCADE,
  "missionId" text NOT NULL,
  "status" varchar NOT NULL DEFAULT 'not_started',
  "phase" varchar NOT NULL DEFAULT 'intro',
  "score" integer NOT NULL DEFAULT 0,
  "challengesDone" integer NOT NULL DEFAULT 0,
  "challengesTotal" integer NOT NULL DEFAULT 0,
  "conceptCardsViewed" integer NOT NULL DEFAULT 0,
  "lastLessonAt" timestamp,
  "completedAt" timestamp,
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("studentId", "missionId")
);
```

- [ ] **Create `lib/db/queries/mission.ts`**

```typescript
// lib/db/queries/mission.ts
import { eq, and, sql } from "drizzle-orm";
import { db } from "../utils";
import { missionProgress, type MissionProgress } from "../schema";

export async function getMissionProgress(
  studentId: string,
  missionId: string
): Promise<MissionProgress | null> {
  const rows = await db
    .select()
    .from(missionProgress)
    .where(
      and(eq(missionProgress.studentId, studentId), eq(missionProgress.missionId, missionId))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getStudentMissionProgress(
  studentId: string
): Promise<MissionProgress[]> {
  return db
    .select()
    .from(missionProgress)
    .where(eq(missionProgress.studentId, studentId));
}

export async function upsertMissionProgress(
  studentId: string,
  missionId: string,
  data: Partial<
    Pick<MissionProgress, "status" | "phase" | "score" | "challengesDone" | "challengesTotal" | "conceptCardsViewed" | "lastLessonAt" | "completedAt">
  >
) {
  await db
    .insert(missionProgress)
    .values({ studentId, missionId, ...data })
    .onConflictDoUpdate({
      target: [missionProgress.studentId, missionProgress.missionId],
      set: data,
    });
}
```

- [ ] **Add export to `lib/db/queries/index.ts`**

```typescript
export * from "./mission";
```

- [ ] **Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/0004_add_mission_progress.sql lib/db/queries/mission.ts lib/db/queries/index.ts
git commit -m "feat: add MissionProgress table and queries"
```

---

### Task 4: Simplify Tutor Prompt

**Files:**
- Modify: `lib/ai/prompts-tutor.ts`

- [ ] **Replace the existing ~282-line prompt with the simplified ~200-line version**

Remove sections on: topic thread management, UI narration rules, readiness gates, in-line curriculum dump. Keep: ROLE, lesson format, brevity rules, challenge bundle instructions, reteaching, tone, tool descriptions.

The prompt should focus on teaching the concept and calling emitChallengeBundle. All flow management (cards, challenge mode, progress, gates) is handled by the UI.

See `docs/superpowers/specs/2026-06-09-mission-based-learning-design.md` → "Prompt Changes" section for the full simplified content. The curriculum reference at the bottom is removed (tool-retrievable via getCurriculumTopics). The TOOLS section keeps all 8 tool descriptions but drops the inline curriculum.

- [ ] **Commit**

```bash
git add lib/ai/prompts-tutor.ts
git commit -m "feat: simplify tutor prompt for mission-based flow"
```

---

### Task 5: MissionMap Component

**Files:**
- Create: `components/chat/mission-map.tsx`

- [ ] **Create `MissionMap` component**

Takes a `year: "8" | "9"` prop and renders the visual mission journey. Shows completed (ticked), current (glowing/sunset), locked (dimmed) mission nodes connected by a path line. Each node shows the mission emoji and name.

```tsx
// components/chat/mission-map.tsx
"use client";

import { motion } from "framer-motion";
import { getMissionsByYear, type MissionDefinition } from "@/lib/ai/missions";
import { cn } from "@/lib/utils";

type MissionMapProps = {
  year: "8" | "9";
  completedMissions?: string[]; // mission IDs
  currentMissionId?: string;
  onSelect?: (mission: MissionDefinition) => void;
};

export function MissionMap({ year, completedMissions = [], currentMissionId, onSelect }: MissionMapProps) {
  const missions = getMissionsByYear(year);

  return (
    <div className="relative py-4">
      {/* Path line connecting nodes */}
      <div className="absolute left-[17px] right-[17px] top-8 h-[3px] rounded-full bg-border/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"
          style={{
            width: `${(missions.findIndex((m) => m.id === currentMissionId) + 1) / missions.length * 100}%`,
          }}
        />
      </div>
      {/* Mission nodes */}
      <div className="flex justify-between">
        {missions.map((mission, index) => {
          const isCompleted = completedMissions.includes(mission.id);
          const isCurrent = mission.id === currentMissionId;
          const isLocked = !isCompleted && !isCurrent && !completedMissions.includes(missions[index - 1]?.id ?? "");

          return (
            <motion.button
              key={mission.id}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all",
                isLocked && "opacity-40 cursor-not-allowed",
                !isLocked && "cursor-pointer hover:scale-105"
              )}
              disabled={isLocked}
              onClick={() => onSelect?.(mission)}
              whileHover={!isLocked ? { y: -2 } : undefined}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-base",
                  isCompleted && "border-green-500 bg-green-500/20 text-green-400",
                  isCurrent && "border-primary bg-primary/20 text-primary shadow-[0_0_16px] shadow-primary/40",
                  !isCompleted && !isCurrent && "border-border/30 bg-muted/10 text-muted-foreground/40"
                )}
              >
                {isCompleted ? "✓" : mission.emoji ?? index + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight text-center max-w-[60px]",
                  isCompleted && "text-green-400",
                  isCurrent && "text-primary font-semibold",
                  !isCompleted && !isCurrent && "text-muted-foreground/40"
                )}
              >
                {mission.title}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add components/chat/mission-map.tsx
git commit -m "feat: add MissionMap component"
```

---

### Task 6: Homepage Redesign

**Files:**
- Modify: `components/chat/sara-dashboard.tsx` — Rewrite as landing page

- [ ] **Rewrite `sara-dashboard.tsx` as the landing page**

Replace the current full-screen overlay dashboard with a scrollable landing page containing:
1. Hero section (mascot + "Learn Maths Without Feeling Stuck" + subheading)
2. "What is this?" explanation section
3. Year toggle (Year 8 / Year 9)
4. "Today's Mission" card (random for guest, continue for logged-in)
5. Mission Map (MissionMap component)
6. "How It Works" 4-step grid
7. "What You'll Learn" topic list with descriptions

Key behaviors:
- Guest users see "Today's Mission" (random from `pickGuestMission()`), no XP display, "Sign in / Sign up" buttons
- Logged-in users see "Continue Mission" (from `missionProgress`), XP/streak/badges shown (via `PlayerStats`)
- Uses Tailwind dark theme classes throughout (`bg-background`, `text-foreground`, `border-border`, `bg-card`, etc.)
- Full dark gradient background using existing theme tokens
- Uses `useSession()` to detect guest vs logged-in

- [ ] **Commit**

```bash
git add components/chat/sara-dashboard.tsx
git commit -m "feat: redesign homepage as landing page with mission map"
```

---

### Task 7: ConceptCardSlides Component

**Files:**
- Create: `components/chat/concept-card-slides.tsx`

- [ ] **Create `ConceptCardSlides` component**

Renders a slide deck of concept cards. Shows one card at a time with progress dots. "← Back" / "Next →" navigation. After last card, emits `onComplete` callback. No LLM calls.

```tsx
// components/chat/concept-card-slides.tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ConceptCard } from "@/lib/ai/missions";
import { cn } from "@/lib/utils";

type ConceptCardSlidesProps = {
  cards: ConceptCard[];
  onComplete: () => void;
  onBack?: () => void;
  onHelp?: () => void;
};

export function ConceptCardSlides({ cards, onComplete, onBack, onHelp }: ConceptCardSlidesProps) {
  const [index, setIndex] = useState(0);
  const card = cards[index];
  const isLast = index >= cards.length - 1;

  if (!card) return null;

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        {cards.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === index
                ? "w-6 bg-gradient-to-r from-primary to-primary/60"
                : i < index
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-muted-foreground/20"
            )}
          />
        ))}
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
          exit={{ opacity: 0, x: -20 }}
          initial={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.25 }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {card.title}
          </p>
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center font-mono text-lg font-semibold text-primary">
            {card.visual}
          </div>
          {card.example && (
            <div className="mb-3 rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm text-foreground/80">
              <span className="font-medium text-muted-foreground">Example: </span>
              {card.example}
            </div>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {card.explanation}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          className="rounded-full text-sm text-muted-foreground"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          size="sm"
          variant="ghost"
        >
          ← Back
        </Button>

        <Button
          className="rounded-full text-sm text-muted-foreground"
          onClick={onHelp}
          size="sm"
          variant="ghost"
        >
          Ask Tutor 💬
        </Button>

        {isLast ? (
          <Button
            className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white shadow-lg"
            onClick={onComplete}
            size="sm"
          >
            Ready for Challenge →
          </Button>
        ) : (
          <Button
            className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white shadow-lg"
            onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}
            size="sm"
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add components/chat/concept-card-slides.tsx
git commit -m "feat: add ConceptCardSlides slide deck component"
```

---

### Task 8: ChallengeMode Component

**Files:**
- Create: `components/chat/challenge-mode.tsx`
- Create: `components/chat/challenge-results.tsx`

- [ ] **Create `ChallengeMode` full-screen overlay**

Full-viewport overlay that shows one question at a time. Top bar: "Question N of M" / score / exit. Progress bar. Question card. Answer options (radio style for MC, text input for short_answer). "Ask Tutor" button. Emits `onComplete(results)` when all questions done.

```tsx
// components/chat/challenge-mode.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAnswerCorrect, isGraded } from "@/lib/active-question";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import type { ActiveQuestion } from "@/lib/active-question";

export type ChallengeResults = {
  total: number;
  correct: number;
  wrong: number;
  answers: { questionId: string; correct: boolean; chosen: string }[];
};

type ChallengeModeProps = {
  questions: ActiveQuestion[];
  missionTitle: string;
  onComplete: (results: ChallengeResults) => void;
  onExit: () => void;
  onHelp: () => void;
};

export function ChallengeMode({ questions, missionTitle, onComplete, onExit, onHelp }: ChallengeModeProps) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<ChallengeResults["answers"]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [textInput, setTextInput] = useState("");

  const question = questions[index];
  const isLast = index >= questions.length - 1;
  const isBusy = false; // no streaming here — grading is local

  const handleAnswer = (answer: string) => {
    if (feedback || !question) return;
    const correct = isAnswerCorrect(question, answer);
    if (correct) playSound("success");
    else playSound("wrong");
    setFeedback(correct ? "correct" : "wrong");
    setSelected(answer);
  };

  const handleNext = () => {
    const correct = feedback === "correct";
    const newAnswers = [...answers, { questionId: question.id, correct, chosen: selected }];
    const newScore = score + (correct ? 1 : 0);

    if (isLast) {
      onComplete({
        total: questions.length,
        correct: newScore,
        wrong: questions.length - newScore,
        answers: newAnswers,
      });
    } else {
      setIndex((i) => i + 1);
      setScore(newScore);
      setAnswers(newAnswers);
      setFeedback(null);
      setSelected("");
      setTextInput("");
    }
  };

  if (!question) return null;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          Question {index + 1} of {questions.length}
        </span>
        <span className="text-xs text-muted-foreground">
          Score: {score}/{index + (feedback ? 1 : 0)} ✅
        </span>
        <Button
          className="rounded-full text-muted-foreground hover:text-foreground"
          onClick={onExit}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-border/30">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
          style={{ width: `${((index) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6 rounded-2xl border border-border/60 bg-card p-5 text-center">
                <p className="text-lg font-semibold text-foreground">
                  {question.prompt}
                </p>
              </div>

              {/* Multiple choice */}
              {question.type === "multiple_choice" && (
                <div className="grid grid-cols-2 gap-3">
                  {(question.options ?? []).map((opt) => (
                    <button
                      key={opt}
                      className={cn(
                        "rounded-xl border px-4 py-4 text-center text-sm font-medium transition-all",
                        feedback === "correct" && opt === question.correctAnswer
                          ? "border-green-500 bg-green-500/15 text-foreground"
                          : feedback === "wrong" && opt === selected
                            ? "border-destructive bg-destructive/15 text-foreground"
                            : selected === opt
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border/60 text-foreground hover:border-primary/50 hover:bg-accent/50",
                        feedback && "pointer-events-none"
                      )}
                      disabled={!!feedback}
                      onClick={() => handleAnswer(opt)}
                      type="button"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Short text */}
              {question.type === "text" && (
                <div className="flex flex-col gap-3">
                  <input
                    className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                    disabled={!!feedback}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && textInput.trim()) handleAnswer(textInput.trim());
                    }}
                    placeholder="Type your answer..."
                    value={textInput}
                  />
                  {!feedback && (
                    <Button
                      className="self-center rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
                      disabled={!textInput.trim()}
                      onClick={() => handleAnswer(textInput.trim())}
                      size="sm"
                    >
                      Check answer
                    </Button>
                  )}
                </div>
              )}

              {/* Feedback display */}
              {feedback && (
                <div
                  className={cn(
                    "mt-4 rounded-xl border p-4 text-center",
                    feedback === "correct"
                      ? "border-green-500/60 bg-green-500/10"
                      : "border-destructive/60 bg-destructive/10"
                  )}
                >
                  {feedback === "correct" ? (
                    <p className="font-semibold text-green-400">🎉 Correct!</p>
                  ) : (
                    <div>
                      <p className="font-semibold text-destructive mb-1">❌ Not quite</p>
                      <p className="text-sm text-muted-foreground">
                        Correct answer: <span className="font-medium text-green-400">{question.correctAnswer}</span>
                      </p>
                      {question.explanation && (
                        <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
                      )}
                    </div>
                  )}
                  <Button
                    className="mt-3 rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
                    onClick={handleNext}
                    size="sm"
                  >
                    {isLast ? "See results →" : "Next →"}
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Help button */}
      <div className="border-t border-border/50 px-4 py-2 text-center">
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={onHelp}
          type="button"
        >
          Ask Tutor 💬
        </button>
      </div>
    </motion.div>
  );
}
```

- [ ] **Create `ChallengeResults` component**

```tsx
// components/chat/challenge-results.tsx
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ChallengeResults } from "./challenge-mode";

type ChallengeResultsScreenProps = {
  results: ChallengeResults;
  missionTitle: string;
  onContinue: () => void;
  onReview?: () => void;
};

function starRating(score: number, total: number): string {
  const filled = Math.round((score / total) * 5);
  return "⭐".repeat(filled) + "☆".repeat(5 - filled);
}

export function ChallengeResultsScreen({ results, missionTitle, onContinue, onReview }: ChallengeResultsScreenProps) {
  const pct = Math.round((results.correct / results.total) * 100);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
    >
      <div className="mb-4 text-5xl">🏆</div>
      <h2 className="mb-1 text-2xl font-bold text-foreground">Mission Complete!</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {missionTitle} • Challenge Mode
      </p>
      <div className="mb-4 text-3xl tracking-widest">
        {starRating(results.correct, results.total)}
      </div>
      <p className="mb-1 text-lg text-foreground">
        Score: <strong>{results.correct} / {results.total}</strong>
      </p>
      <p className="mb-6 text-xs text-muted-foreground">
        Correct: {results.correct} • Wrong: {results.wrong} • Accuracy: {pct}%
      </p>
      <div className="flex gap-3">
        {onReview && results.wrong > 0 && (
          <Button
            className="rounded-full border border-border/60 bg-card px-5 text-sm text-foreground shadow-sm"
            onClick={onReview}
            variant="outline"
          >
            Review mistakes
          </Button>
        )}
        <Button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
          onClick={onContinue}
        >
          Continue learning →
        </Button>
      </div>
    </motion.div>
  );
}
```

- [ ] **Commit**

```bash
git add components/chat/challenge-mode.tsx components/chat/challenge-results.tsx
git commit -m "feat: add ChallengeMode full-screen overlay and results screen"
```

---

### Task 9: MissionOrchestrator Component

**Files:**
- Create: `components/chat/mission-orchestrator.tsx`

- [ ] **Create `MissionOrchestrator` component**

State machine that controls the mission flow. Wraps the chat and manages transitions between phases. Provides context values for the current mission/phase.

```tsx
// components/chat/mission-orchestrator.tsx
"use client";

import { createContext, useContext, type ReactNode, useState, useCallback, useMemo } from "react";
import type { MissionDefinition, ConceptCard } from "@/lib/ai/missions";
import type { ActiveQuestion } from "@/lib/active-question";
import type { ChallengeResults } from "./challenge-mode";

export type MissionPhase = "intro" | "lesson" | "cards" | "gate" | "challenge" | "results" | "complete";

type MissionContextValue = {
  mission: MissionDefinition | null;
  phase: MissionPhase;
  startMission: (mission: MissionDefinition) => void;
  advancePhase: (to: MissionPhase) => void;
  completeCards: () => void;
  startChallenge: (questions: ActiveQuestion[]) => void;
  finishChallenge: (results: ChallengeResults) => void;
  exitMission: () => void;
  isInMission: boolean;
  challengeQuestions: ActiveQuestion[];
  challengeResults: ChallengeResults | null;
};

const MissionContext = createContext<MissionContextValue | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [mission, setMission] = useState<MissionDefinition | null>(null);
  const [phase, setPhase] = useState<MissionPhase>("intro");
  const [challengeQuestions, setChallengeQuestions] = useState<ActiveQuestion[]>([]);
  const [challengeResults, setChallengeResults] = useState<ChallengeResults | null>(null);

  const startMission = useCallback((m: MissionDefinition) => {
    setMission(m);
    setPhase("lesson");
    setChallengeQuestions([]);
    setChallengeResults(null);
  }, []);

  const advancePhase = useCallback((to: MissionPhase) => {
    setPhase(to);
  }, []);

  const completeCards = useCallback(() => {
    setPhase("gate");
  }, []);

  const startChallenge = useCallback((questions: ActiveQuestion[]) => {
    setChallengeQuestions(questions);
    setChallengeResults(null);
    setPhase("challenge");
  }, []);

  const finishChallenge = useCallback((results: ChallengeResults) => {
    setChallengeResults(results);
    setPhase("results");
  }, []);

  const exitMission = useCallback(() => {
    setMission(null);
    setPhase("intro");
    setChallengeQuestions([]);
    setChallengeResults(null);
  }, []);

  const value = useMemo(
    () => ({
      mission,
      phase,
      startMission,
      advancePhase,
      completeCards,
      startChallenge,
      finishChallenge,
      exitMission,
      isInMission: mission !== null,
      challengeQuestions,
      challengeResults,
    }),
    [mission, phase, challengeQuestions, challengeResults, startMission, advancePhase, completeCards, startChallenge, finishChallenge, exitMission]
  );

  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>;
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMission must be used within MissionProvider");
  return ctx;
}
```

- [ ] **Commit**

```bash
git add components/chat/mission-orchestrator.tsx
git commit -m "feat: add MissionOrchestrator state machine and context"
```

---

### Task 10: Wire Into Shell + ActiveChat

**Files:**
- Modify: `components/chat/shell.tsx` — Add MissionProvider, MissionHeader, ConceptCardSlides, ChallengeMode
- Modify: `hooks/use-active-chat.tsx` — Add mission context values
- Modify: `components/chat/answer-panel.tsx` — Simplify (only non-challenge use)

- [ ] **Wrap shell with MissionProvider, conditionally render mission phases**

In `shell.tsx`:
- Import `MissionProvider`, `useMission`, `ConceptCardSlides`, `ChallengeMode`, `ChallengeResultsScreen`
- Import `getMission()` from missions.ts (for concept card lookup)
- Wrap content in `<MissionProvider>` 
- When `isInMission` is true:
  - `phase === "cards"` → show `ConceptCardSlides` instead of Messages
  - `phase === "gate"` → show readiness gate UI
  - `phase === "challenge"` → show `ChallengeMode` overlay (hide chat input)
  - `phase === "results"` → show `ChallengeResultsScreen`
  - `phase === "lesson"` → show normal chat (hide nothing — LLM teaches via stream)
- Show `MissionHeader` during mission phases
- Show `Messages` normally when not in mission
- Hide `MultimodalInput` during challenge phase

- [ ] **Simplify `answer-panel.tsx` to only handle non-challenge questions**

The answer panel is still used for "Ask Tutor" help responses within a mission, and for standalone non-challenge questions. Remove the bundle/phase logic that's now handled by `ChallengeMode`. Keep the basic question-answering UI (radio/select/text + grading).

- [ ] **Commit**

```bash
git add components/chat/shell.tsx components/chat/answer-panel.tsx
git commit -m "feat: wire mission orchestrator into shell"
```

---

### Task 11: Remove TopicEntryOverlay

**Files:**
- Delete: `components/chat/topic-entry-overlay.tsx`
- Modify: `components/chat/shell.tsx` — Remove references

- [ ] **Delete the topic-entry-overlay and remove imports in shell.tsx**

The mission INTRO screen replaces this. The start gate functionality is now handled by `MissionOrchestrator`'s intro phase.

- [ ] **Commit**

```bash
git rm components/chat/topic-entry-overlay.tsx
git add components/chat/shell.tsx
git commit -m "refactor: remove TopicEntryOverlay — replaced by mission intro phase"
```

---

### Task 12: Parent Dashboard

**Files:**
- Create: `app/(parent)/dashboard/page.tsx`

- [ ] **Create parent dashboard route**

Shows mission progress for the parent's children. Displays:
- Student selector (if multiple children)
- Current mission card with progress
- Stats grid: completed / in-progress / struggling / mastered counts
- All missions list with status badges and progress bars
- Recommended next mission

- [ ] **Commit**

```bash
git add app/(parent)/dashboard/page.tsx
git commit -m "feat: add parent dashboard route with mission progress view"
```

---

### Task 13: Guest Mode UI Changes

**Files:**
- Modify: `components/chat/sara-dashboard.tsx` — Guest sees random mission, no XP
- Modify: `components/chat/shell.tsx` — Hide XP/streak for guests
- Modify: `app/(chat)/api/chat/route.ts` — Implement 5-Q-per-day limit for guests

- [ ] **Guest mode: hide gamification, show random mission**

In `sara-dashboard.tsx`:
- Use `isGuestEmail()` to detect guest
- For guests: call `pickGuestMission()` for "Today's Mission"
- Hide `PlayerStats` component for guests
- Show "Sign in / Sign up" buttons

- [ ] **Guest mode: 5 answered questions per day limit**

In `app/(chat)/api/chat/route.ts`:
- Add guest-specific count: track answered questions (not all messages) per session
- Use existing `getMessageCountByUserId` but with a different counter for guest answers
- After 5 answers, return the guest limit wall response (no LLM call)

- [ ] **Commit**

```bash
git add components/chat/sara-dashboard.tsx components/chat/shell.tsx app/(chat)/api/chat/route.ts
git commit -m "feat: implement guest mode UI — random missions, no XP, 5-Q limit"
```

---

## Verification

After all tasks are implemented:

1. Run `pnpm build` (or `npm run build`) — verify no compilation errors
2. Run `pnpm test:unit` — verify 63+ tests pass
3. Manual flow check:
   - Opens to redesigned homepage (hero + mission map)
   - Guest sees "Today's Mission" (random)
   - Tap a mission → enters lesson phase (chat visible, LLM teaches)
   - After lesson → concept card slides appear (3+ cards)
   - After cards → "Ready for Challenge Mode?" gate
   - Accept → full-screen challenge overlay
   - Answer questions → results screen
   - Complete → back to mission map with progress
   - "Ask Tutor" button opens chat overlay during any phase
