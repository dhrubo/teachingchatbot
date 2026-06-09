// lib/ai/missions.ts
export interface ConceptCard {
  id: string;
  title: string;
  visual: string;
  example: string;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  conceptCards: ConceptCard[];
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
  lessons: Lesson[];
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
    prerequisiteMissionIds: [],
    gcseDomain: "number",
    lessons: [
      {
        id: "percentages-1",
        title: "Introduction to Percentages",
        conceptCards: [
          {
            id: "pc-percentages-1",
            title: "Percent means out of 100",
            visual: "25% = 25/100 = 0.25",
            example: "75% = 75 out of every 100",
            explanation:
              "Percent is a way of showing a part of a whole, split into 100 equal pieces.",
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
            explanation:
              "50% is just half. Halving is the fastest percentage calculation.",
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
    ],
  },
  {
    id: "missions/ratio",
    title: "Ratio and Proportion",
    yearGroup: "8",
    emoji: "⚖️",
    description:
      "Simplify ratios, share in a given ratio, and solve proportion problems.",
    estimatedMinutes: 15,
    topics: ["Ratio"],
    prerequisiteMissionIds: [],
    gcseDomain: "ratio_proportion_rates",
    lessons: [
      {
        id: "ratio-1",
        title: "Understanding Ratios",
        conceptCards: [
          {
            id: "pc-ratio-1",
            title: "What is a ratio?",
            visual: "3:2 means 3 parts to 2 parts",
            example: "Apples:oranges = 3:2 in a fruit bowl",
            explanation:
              "A ratio compares two quantities. The order matters — 3:2 is different from 2:3.",
          },
          {
            id: "pc-ratio-2",
            title: "Simplifying ratios",
            visual: "6:4 = 3:2 (divide both by 2)",
            example: "12:8 = 3:2",
            explanation:
              "Like fractions, ratios can be simplified by dividing both parts by the same number.",
          },
          {
            id: "pc-ratio-3",
            title: "Sharing in a ratio",
            visual: "Share £20 in ratio 3:2 → 3+2=5 parts",
            example: "£20 ÷ 5 = £4 per part → 3×£4=£12, 2×£4=£8",
            explanation:
              "Add the parts to find the total number of shares. Divide the amount by total shares, then multiply each part.",
          },
        ],
      },
    ],
  },
];

// Runtime validation — catches orphaned prerequisite IDs early.
const allMissionIds = new Set(MISSIONS.map((m) => m.id));
for (const m of MISSIONS) {
  for (const p of m.prerequisiteMissionIds) {
    if (!allMissionIds.has(p)) {
      console.warn(`Mission "${m.id}" references unknown prerequisite "${p}"`);
    }
  }
}

// Deterministic fallback so EVERY lesson can show at least 3 concept cards
// before Challenge Mode is offered, even if no authored cards exist.
export function fallbackConceptCards(topic: string): ConceptCard[] {
  return [
    {
      id: `fallback-${topic}-1`,
      title: `What is ${topic}?`,
      visual: topic,
      example: `We'll build up ${topic} step by step.`,
      explanation: `Let's start with the core idea behind ${topic}, one piece at a time.`,
    },
    {
      id: `fallback-${topic}-2`,
      title: "The key method",
      visual: "step 1 → step 2 → answer",
      example: "Follow the steps in order.",
      explanation:
        "Most questions on this topic follow the same few steps. Learn the steps and you can handle the variations.",
    },
    {
      id: `fallback-${topic}-3`,
      title: "A worked example",
      visual: "see it done once",
      example: "Watch the method applied to a simple case first.",
      explanation:
        "Seeing one example worked through makes the steps concrete before you try them yourself.",
    },
  ];
}

// Cards for a lesson, guaranteeing at least 3 (pads with fallbacks if needed).
export function conceptCardsForLesson(
  mission: MissionDefinition,
  lessonId: string
): ConceptCard[] {
  const authored =
    mission.lessons.find((l) => l.id === lessonId)?.conceptCards ?? [];
  if (authored.length >= 3) {
    return authored;
  }
  const fallback = fallbackConceptCards(mission.title);
  return [...authored, ...fallback].slice(0, Math.max(3, authored.length));
}

export function getMission(id: string): MissionDefinition | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function getMissionsByYear(year: "8" | "9"): MissionDefinition[] {
  return MISSIONS.filter((m) => m.yearGroup === year);
}
