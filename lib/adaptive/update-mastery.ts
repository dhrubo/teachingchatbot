export type DifficultyBand = "must" | "should" | "could" | "gcse_bridge";

export const BANDS: DifficultyBand[] = [
  "must",
  "should",
  "could",
  "gcse_bridge",
];

export type MasteryState = {
  masteryScore: number;
  currentBand: DifficultyBand;
  attempts: number;
  correct: number;
  recentCorrectStreak: number;
  recentWrongStreak: number;
};

const bandWeights: Record<DifficultyBand, number> = {
  must: 1,
  should: 2,
  could: 3,
  gcse_bridge: 4,
};

export function bandFromScore(score: number): DifficultyBand {
  if (score >= 75) {
    return "gcse_bridge";
  }
  if (score >= 50) {
    return "could";
  }
  if (score >= 25) {
    return "should";
  }
  return "must";
}

export function moveBand(
  band: DifficultyBand,
  direction: 1 | -1
): DifficultyBand {
  const next = Math.max(
    0,
    Math.min(BANDS.length - 1, BANDS.indexOf(band) + direction)
  );
  return BANDS[next];
}

export const emptyMastery = (): MasteryState => ({
  masteryScore: 0,
  currentBand: "must",
  attempts: 0,
  correct: 0,
  recentCorrectStreak: 0,
  recentWrongStreak: 0,
});

/**
 * Apply a single answer result to a mastery state.
 *
 * Rules:
 *  - 2 correct in a row can move up one band.
 *  - 2 wrong in a row can move down one band.
 *  - Band never jumps more than one step at a time (never must -> gcse_bridge).
 */
export function updateMastery(
  state: MasteryState,
  result: { isCorrect: boolean; difficultyBand: DifficultyBand }
): MasteryState {
  const weight = bandWeights[result.difficultyBand];
  const delta = result.isCorrect ? 4 * weight : -3 * weight;
  const masteryScore = Math.max(0, Math.min(100, state.masteryScore + delta));

  const recentCorrectStreak = result.isCorrect
    ? state.recentCorrectStreak + 1
    : 0;
  const recentWrongStreak = result.isCorrect ? 0 : state.recentWrongStreak + 1;

  // Base band from score, then nudge by streak — but only one step from the
  // *previous* band so we never skip a band.
  let currentBand = bandFromScore(masteryScore);
  if (recentCorrectStreak >= 2) {
    currentBand = moveBand(state.currentBand, 1);
  } else if (recentWrongStreak >= 2) {
    currentBand = moveBand(state.currentBand, -1);
  } else {
    // Clamp score-derived band so it stays adjacent to the previous band.
    const prevIdx = BANDS.indexOf(state.currentBand);
    const newIdx = BANDS.indexOf(currentBand);
    if (Math.abs(newIdx - prevIdx) > 1) {
      currentBand = moveBand(state.currentBand, newIdx > prevIdx ? 1 : -1);
    }
  }

  return {
    masteryScore,
    currentBand,
    attempts: state.attempts + 1,
    correct: state.correct + (result.isCorrect ? 1 : 0),
    recentCorrectStreak,
    recentWrongStreak,
  };
}
