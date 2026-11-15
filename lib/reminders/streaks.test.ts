import { describe, expect, it } from "vitest";
import {
  computeUpdatedStreak,
  daysBetweenDateStrings,
  shouldSendDailyReminderNow,
} from "./streaks";

describe("Duolingo Daily Streak & Streak Freeze State Machine", () => {
  it("starts a 1-day streak on first practice", () => {
    const res = computeUpdatedStreak({
      currentStreak: 0,
      longestStreak: 0,
      streakFreezes: 1,
      lastPracticedDate: null,
      todayDate: "2026-11-10",
    });
    expect(res.currentStreak).toBe(1);
    expect(res.longestStreak).toBe(1);
    expect(res.streakIncremented).toBe(true);
    expect(res.usedFreeze).toBe(false);
  });

  it("is idempotent when practicing multiple times on the same day", () => {
    const res = computeUpdatedStreak({
      currentStreak: 4,
      longestStreak: 6,
      streakFreezes: 1,
      lastPracticedDate: "2026-11-10",
      todayDate: "2026-11-10",
    });
    expect(res.currentStreak).toBe(4);
    expect(res.streakIncremented).toBe(false);
  });

  it("increments streak on consecutive days and awards a bonus Streak Freeze every 5 days", () => {
    const res = computeUpdatedStreak({
      currentStreak: 4,
      longestStreak: 4,
      streakFreezes: 1,
      lastPracticedDate: "2026-11-10",
      todayDate: "2026-11-11",
    });
    expect(res.currentStreak).toBe(5);
    expect(res.longestStreak).toBe(5);
    expect(res.earnedBonusFreeze).toBe(true);
    expect(res.streakFreezes).toBe(2);
  });

  it("automatically consumes 1 Streak Freeze to save a streak when exactly 1 day was missed", () => {
    expect(daysBetweenDateStrings("2026-11-10", "2026-11-12")).toBe(2);
    const res = computeUpdatedStreak({
      currentStreak: 7,
      longestStreak: 7,
      streakFreezes: 1,
      lastPracticedDate: "2026-11-10",
      todayDate: "2026-11-12",
    });
    expect(res.currentStreak).toBe(8);
    expect(res.usedFreeze).toBe(true);
    expect(res.streakFreezes).toBe(0);
  });

  it("resets currentStreak to 1 (preserving longestStreak) when 2+ days are missed", () => {
    const res = computeUpdatedStreak({
      currentStreak: 9,
      longestStreak: 9,
      streakFreezes: 2,
      lastPracticedDate: "2026-11-10",
      todayDate: "2026-11-14",
    });
    expect(res.currentStreak).toBe(1);
    expect(res.longestStreak).toBe(9);
    expect(res.usedFreeze).toBe(false);
  });

  it("evaluates shouldSendDailyReminderNow accurately by timezone and practice state", () => {
    const fivePmLondonUtc = new Date("2026-11-15T17:15:00Z"); // GMT in November -> 17:15 London

    expect(
      shouldSendDailyReminderNow({
        reminderEnabled: true,
        reminderHour: 17,
        timezone: "Europe/London",
        lastPracticedDate: "2026-11-14",
        now: fivePmLondonUtc,
      }).shouldSend
    ).toBe(true);

    // Already practiced today -> do not nag!
    expect(
      shouldSendDailyReminderNow({
        reminderEnabled: true,
        reminderHour: 17,
        timezone: "Europe/London",
        lastPracticedDate: "2026-11-15",
        now: fivePmLondonUtc,
      }).shouldSend
    ).toBe(false);
  });
});
