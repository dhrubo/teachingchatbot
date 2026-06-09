import { type DifficultyBand, moveBand } from "./update-mastery";

export type SkillMastery = {
  skillSlug: string;
  masteryScore: number;
  currentBand: DifficultyBand;
  recentWrongStreak: number;
  recentCorrectStreak: number;
};

export type RecentAttempt = {
  archetypeSlug: string;
  skillSlug: string;
  isCorrect: boolean;
  difficultyBand: DifficultyBand;
};

/**
 * Pick the difficulty band for the next question.
 *
 * Distribution (when not forced by streaks):
 *  - 70% current band
 *  - 20% repair (one band down)
 *  - 10% stretch (one band up)
 *
 * Streaks override: 2 wrong -> down, 2 correct -> up. Never jumps more than one
 * band, and a new (no-mastery) skill always starts at "must".
 */
export function selectNextBand(params: {
  mastery?: SkillMastery;
  rng?: () => number;
}): DifficultyBand {
  const { mastery } = params;
  const rng = params.rng ?? Math.random;
  if (!mastery) {
    return "must";
  }

  if (mastery.recentWrongStreak >= 2) {
    return moveBand(mastery.currentBand, -1);
  }
  if (mastery.recentCorrectStreak >= 2) {
    return moveBand(mastery.currentBand, 1);
  }

  const roll = rng();
  if (roll < 0.7) {
    return mastery.currentBand;
  }
  if (roll < 0.9) {
    return moveBand(mastery.currentBand, -1);
  }
  return moveBand(mastery.currentBand, 1);
}

/** Whether the student should be re-taught rather than pushed forward. */
export function shouldReteach(params: {
  mastery?: SkillMastery;
  recentAttempts: RecentAttempt[];
}): boolean {
  if (params.mastery && params.mastery.recentWrongStreak >= 2) {
    return true;
  }
  const lastTwo = params.recentAttempts.slice(0, 2);
  return (
    lastTwo.length === 2 &&
    lastTwo.every((a) => !a.isCorrect) &&
    lastTwo[0].skillSlug === lastTwo[1].skillSlug
  );
}

/**
 * Pick the weakest skill (lowest mastery) from the lesson's skills. Skills with
 * no mastery record are treated as the weakest (score 0) so new skills get
 * attention first.
 */
export function selectWeakestSkill(
  lessonSkillSlugs: string[],
  masteryBySkill: Map<string, SkillMastery>
): string | null {
  if (lessonSkillSlugs.length === 0) {
    return null;
  }
  let weakest = lessonSkillSlugs[0];
  let weakestScore = masteryBySkill.get(weakest)?.masteryScore ?? 0;
  for (const slug of lessonSkillSlugs) {
    const score = masteryBySkill.get(slug)?.masteryScore ?? 0;
    if (score < weakestScore) {
      weakest = slug;
      weakestScore = score;
    }
  }
  return weakest;
}

/**
 * From candidate archetypes for the chosen skill+band, pick one that wasn't used
 * in the recent attempts (avoid immediate repeats). Falls back to any candidate
 * if all were recently used.
 */
export function pickArchetypeSlug(
  candidateSlugs: string[],
  recentAttempts: RecentAttempt[],
  rng: () => number = Math.random,
  avoidWindow = 3
): string | null {
  if (candidateSlugs.length === 0) {
    return null;
  }
  const recentSlugs = new Set(
    recentAttempts.slice(0, avoidWindow).map((a) => a.archetypeSlug)
  );
  const fresh = candidateSlugs.filter((s) => !recentSlugs.has(s));
  const pool = fresh.length > 0 ? fresh : candidateSlugs;
  return pool[Math.floor(rng() * pool.length)];
}
