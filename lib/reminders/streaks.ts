export type StreakComputationInput = {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  lastPracticedDate: string | null; // YYYY-MM-DD in learner's timezone
  todayDate: string; // YYYY-MM-DD in learner's timezone
};

export type StreakComputationResult = {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  lastPracticedDate: string;
  usedFreeze: boolean;
  earnedBonusFreeze: boolean;
  streakIncremented: boolean;
};

export function formatDateInTimezone(
  date: Date,
  timezone = "Europe/London"
): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value ?? "2026";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function getLocalHourInTimezone(
  date: Date,
  timezone = "Europe/London"
): number {
  try {
    const hourStr = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    }).format(date);
    const parsed = Number.parseInt(hourStr, 10);
    return Number.isFinite(parsed) ? parsed % 24 : date.getUTCHours();
  } catch {
    return date.getUTCHours();
  }
}

function parseUtcDayMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map((s) => Number.parseInt(s, 10));
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

export function daysBetweenDateStrings(earlier: string, later: string): number {
  const diffMs = parseUtcDayMs(later) - parseUtcDayMs(earlier);
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Duolingo-style daily streak state machine:
 * - Practicing multiple times on the same calendar day preserves the streak.
 * - Practicing the next day increments currentStreak (+1 bonus Streak Freeze every 5 days, max 3).
 * - Missing exactly 1 day consumes 1 Streak Freeze automatically if available, saving and extending the streak!
 * - Missing 2+ days (or 1 day with 0 freezes) starts a fresh 1-day streak.
 */
export function computeUpdatedStreak(
  input: StreakComputationInput
): StreakComputationResult {
  if (!input.lastPracticedDate) {
    const currentStreak = 1;
    return {
      currentStreak,
      longestStreak: Math.max(input.longestStreak, currentStreak),
      streakFreezes: input.streakFreezes,
      lastPracticedDate: input.todayDate,
      usedFreeze: false,
      earnedBonusFreeze: false,
      streakIncremented: true,
    };
  }

  const gap = daysBetweenDateStrings(input.lastPracticedDate, input.todayDate);

  if (gap <= 0) {
    return {
      currentStreak: Math.max(1, input.currentStreak),
      longestStreak: Math.max(input.longestStreak, input.currentStreak, 1),
      streakFreezes: input.streakFreezes,
      lastPracticedDate: input.todayDate,
      usedFreeze: false,
      earnedBonusFreeze: false,
      streakIncremented: false,
    };
  }

  if (gap === 1) {
    const nextStreak = input.currentStreak + 1;
    const earnedBonusFreeze = nextStreak % 5 === 0 && input.streakFreezes < 3;
    const nextFreezes = earnedBonusFreeze
      ? Math.min(3, input.streakFreezes + 1)
      : input.streakFreezes;
    return {
      currentStreak: nextStreak,
      longestStreak: Math.max(input.longestStreak, nextStreak),
      streakFreezes: nextFreezes,
      lastPracticedDate: input.todayDate,
      usedFreeze: false,
      earnedBonusFreeze,
      streakIncremented: true,
    };
  }

  if (gap === 2 && input.streakFreezes > 0) {
    const nextStreak = input.currentStreak + 1;
    return {
      currentStreak: nextStreak,
      longestStreak: Math.max(input.longestStreak, nextStreak),
      streakFreezes: input.streakFreezes - 1,
      lastPracticedDate: input.todayDate,
      usedFreeze: true,
      earnedBonusFreeze: false,
      streakIncremented: true,
    };
  }

  return {
    currentStreak: 1,
    longestStreak: Math.max(input.longestStreak, 1),
    streakFreezes: input.streakFreezes,
    lastPracticedDate: input.todayDate,
    usedFreeze: false,
    earnedBonusFreeze: false,
    streakIncremented: true,
  };
}

export function shouldSendDailyReminderNow(input: {
  reminderEnabled: boolean;
  reminderHour: number;
  timezone: string;
  lastPracticedDate: string | null;
  now?: Date;
  ignoreHourMatch?: boolean;
}): { shouldSend: boolean; todayDate: string } {
  const now = input.now ?? new Date();
  const todayDate = formatDateInTimezone(now, input.timezone);

  if (!input.reminderEnabled) {
    return { shouldSend: false, todayDate };
  }

  if (input.lastPracticedDate === todayDate) {
    return { shouldSend: false, todayDate };
  }

  if (!input.ignoreHourMatch) {
    const currentLocalHour = getLocalHourInTimezone(now, input.timezone);
    if (currentLocalHour !== input.reminderHour) {
      return { shouldSend: false, todayDate };
    }
  }

  return { shouldSend: true, todayDate };
}
