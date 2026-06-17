/**
 * Deterministic spaced-repetition scheduler — zero AI calls.
 *
 * Default intervals:
 *   Day 1 → Day 2 → Day 4 → Day 7 → Day 14 → Day 30 → Day 60
 *
 * Adjustments:
 *   - Correct answer → next interval
 *   - Incorrect answer → reset to Day 1
 *   - Low confidence (1-2) → half the interval
 *   - High confidence (4-5) → 1.5× the interval
 */

export const DEFAULT_INTERVALS = [1, 2, 4, 7, 14, 30, 60];

export type ReviewOutcome = {
  isCorrect: boolean;
  confidence: number; // 1-5
  currentIntervalDays: number;
  reviewCount: number;
};

export type ReviewSchedule = {
  nextIntervalDays: number;
  nextReviewDate: Date;
  newReviewCount: number;
};

/**
 * Compute the next review interval based on correctness, confidence, and history.
 */
export function computeNextReview(outcome: ReviewOutcome): ReviewSchedule {
  const { isCorrect, confidence, reviewCount } = outcome;

  // Wrong answer → always reset to Day 1
  if (!isCorrect) {
    const nextDate = new Date(Date.now() + 86400000);
    return { nextIntervalDays: 1, nextReviewDate: nextDate, newReviewCount: 0 };
  }

  // Correct answer → advance through intervals with confidence modifier
  const newReviewCount = reviewCount + 1;
  const baseIndex = Math.min(newReviewCount - 1, DEFAULT_INTERVALS.length - 1);
  let base = DEFAULT_INTERVALS[baseIndex];

  // Confidence modifier
  if (confidence >= 4) base = Math.round(base * 1.5);
  else if (confidence <= 2) base = Math.max(1, Math.round(base * 0.5));

  const nextDate = new Date(Date.now() + base * 86400000);
  return { nextIntervalDays: base, nextReviewDate: nextDate, newReviewCount };
}

/**
 * Get items that are due for review (nextReviewDate <= now).
 */
export function getDueItems<T extends { nextReviewDate: Date }>(
  items: T[]
): T[] {
  const now = new Date();
  return items.filter((item) => item.nextReviewDate <= now);
}

/**
 * Sort due items by priority: weakest (lowest mastery) first.
 */
export function sortDueByPriority<T extends { masteryScore?: number; reviewCount?: number }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    // Lower mastery first
    const mA = a.masteryScore ?? 0;
    const mB = b.masteryScore ?? 0;
    if (mA !== mB) return mA - mB;
    // Fewer reviews first
    return (a.reviewCount ?? 0) - (b.reviewCount ?? 0);
  });
}

/**
 * Select up to `limit` items for today's retrieval practice.
 * Prioritises due items, then weakest non-due items.
 */
export function selectRetrievalPracticeItems<T extends {
  nextReviewDate: Date;
  masteryScore?: number;
  reviewCount?: number;
}>(
  items: T[],
  limit: number
): T[] {
  const due = getDueItems(items);
  const dueSorted = sortDueByPriority(due);

  if (dueSorted.length >= limit) return dueSorted.slice(0, limit);

  // Fill remaining slots with weakest non-due items
  const dueIds = new Set(dueSorted.map((_, i) => i));
  const nonDue = items
    .filter((_, i) => !dueIds.has(i))
    .sort((a, b) => (a.masteryScore ?? 0) - (b.masteryScore ?? 0));

  return [...dueSorted, ...nonDue].slice(0, limit);
}
