import type {
  EdexcelTier,
  ExplanationLens,
  TopicProgressRecord,
} from "@/lib/db/schema";
import { ALGEBRA_TOPICS } from "./topics-algebra";
import { GEOMETRY_PROB_STATS_TOPICS } from "./topics-geometry-prob-stats";
import { NUMBER_AND_RATIO_TOPICS } from "./topics-number-ratio";
import {
  ALL_LENSES,
  type EdexcelStrandId,
  type EdexcelStrandMeta,
  type EdexcelTopic,
} from "./types";

export const EDEXCEL_STRANDS: readonly EdexcelStrandMeta[] = [
  {
    id: "number",
    title: "1. Number",
    edexcelRef: "Edexcel 1MA1 · N1–N16",
    summary: "Fractions, indices, standard form, surds & exact arithmetic.",
    accentColor: "#F97316",
  },
  {
    id: "algebra",
    title: "2. Algebra",
    edexcelRef: "Edexcel 1MA1 · A1–A25",
    summary:
      "Linear equations, quadratics, simultaneous equations & sequences.",
    accentColor: "#8B5CF6",
  },
  {
    id: "ratio",
    title: "3. Ratio, Proportion & Rates",
    edexcelRef: "Edexcel 1MA1 · R1–R16",
    summary: "Compound interest, reverse percentages, ratio sharing & growth.",
    accentColor: "#10B981",
  },
  {
    id: "geometry",
    title: "4. Geometry & Measures",
    edexcelRef: "Edexcel 1MA1 · G1–G25",
    summary: "Pythagoras, SOHCAHTOA trigonometry, circles & sectors.",
    accentColor: "#F59E0B",
  },
  {
    id: "probability",
    title: "5. Probability",
    edexcelRef: "Edexcel 1MA1 · P1–P9",
    summary:
      "Tree diagrams, independent events & without-replacement problems.",
    accentColor: "#EC4899",
  },
  {
    id: "statistics",
    title: "6. Statistics",
    edexcelRef: "Edexcel 1MA1 · S1–S6",
    summary: "Grouped estimated mean, box-plot IQR & Higher histograms.",
    accentColor: "#06B6D4",
  },
] as const;

export const EDEXCEL_TOPICS: readonly EdexcelTopic[] = [
  ...NUMBER_AND_RATIO_TOPICS,
  ...ALGEBRA_TOPICS,
  ...GEOMETRY_PROB_STATS_TOPICS,
];

export function getTopicBySlug(slug: string): EdexcelTopic | undefined {
  return EDEXCEL_TOPICS.find((t) => t.slug === slug);
}

export function getTopicsForTier(tier: EdexcelTier): EdexcelTopic[] {
  if (tier === "foundation") {
    // Foundation covers foundation + crossover (Grades 1–5); Higher-only topics remain visible if searched, but filtered here
    return EDEXCEL_TOPICS.filter((t) => t.tier !== "higher");
  }
  // Higher students study Grades 4–9 (crossover + higher, plus foundational fluency)
  return [...EDEXCEL_TOPICS];
}

export function getTopicsByStrand(
  strand: EdexcelStrandId,
  tier?: EdexcelTier
): EdexcelTopic[] {
  const pool = tier ? getTopicsForTier(tier) : EDEXCEL_TOPICS;
  return pool.filter((t) => t.strand === strand);
}

/**
 * Mr. Ranedeer "Explain it another way" lens rotator:
 * Always picks a representation lens the learner hasn't heard yet for this topic,
 * cycling cleanly once all 5 lenses have been explored.
 */
export function pickNextExplanationLens(
  currentLens: ExplanationLens,
  triedLenses: readonly ExplanationLens[] = []
): ExplanationLens {
  const triedSet = new Set<ExplanationLens>([...triedLenses, currentLens]);
  for (const candidate of ALL_LENSES) {
    if (!triedSet.has(candidate)) {
      return candidate;
    }
  }

  const currentIdx = ALL_LENSES.indexOf(currentLens);
  const nextIdx = (currentIdx + 1) % ALL_LENSES.length;
  return ALL_LENSES[nextIdx] ?? "visual";
}

export function getDueWarmupTopics(
  progressRows: readonly TopicProgressRecord[],
  tier: EdexcelTier,
  now = new Date()
): EdexcelTopic[] {
  const dueSlugs = progressRows
    .filter(
      (row) => !row.nextReviewAt || row.nextReviewAt.getTime() <= now.getTime()
    )
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .map((row) => row.topicSlug);

  const resolved: EdexcelTopic[] = [];
  for (const slug of dueSlugs) {
    const topic = getTopicBySlug(slug);
    if (topic) {
      resolved.push(topic);
    }
  }

  if (resolved.length >= 3) {
    return resolved.slice(0, 3);
  }

  const fallbackPool = getTopicsForTier(tier).filter(
    (t) => !resolved.some((r) => r.slug === t.slug)
  );
  return [...resolved, ...fallbackPool].slice(0, 3);
}
