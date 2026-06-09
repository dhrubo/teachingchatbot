import { describe, expect, it } from "vitest";
import {
  pickArchetypeSlug,
  type RecentAttempt,
  type SkillMastery,
  selectNextBand,
  selectWeakestSkill,
} from "../adaptive/select-next-question";

describe("selectNextBand", () => {
  it("starts new (no-mastery) skills at must", () => {
    expect(selectNextBand({})).toBe("must");
  });

  it("moves down after 2 wrong", () => {
    const mastery: SkillMastery = {
      skillSlug: "s",
      masteryScore: 60,
      currentBand: "could",
      recentWrongStreak: 2,
      recentCorrectStreak: 0,
    };
    expect(selectNextBand({ mastery })).toBe("should");
  });

  it("moves up after 2 correct", () => {
    const mastery: SkillMastery = {
      skillSlug: "s",
      masteryScore: 40,
      currentBand: "should",
      recentWrongStreak: 0,
      recentCorrectStreak: 2,
    };
    expect(selectNextBand({ mastery })).toBe("could");
  });

  it("uses 70/20/10 distribution when no streak forces a move", () => {
    const mastery: SkillMastery = {
      skillSlug: "s",
      masteryScore: 40,
      currentBand: "should",
      recentWrongStreak: 0,
      recentCorrectStreak: 0,
    };
    expect(selectNextBand({ mastery, rng: () => 0.1 })).toBe("should"); // current
    expect(selectNextBand({ mastery, rng: () => 0.8 })).toBe("must"); // repair
    expect(selectNextBand({ mastery, rng: () => 0.95 })).toBe("could"); // stretch
  });
});

describe("selectWeakestSkill", () => {
  it("treats skills with no mastery as weakest", () => {
    const mastery = new Map<string, SkillMastery>([
      [
        "known",
        {
          skillSlug: "known",
          masteryScore: 50,
          currentBand: "could",
          recentWrongStreak: 0,
          recentCorrectStreak: 0,
        },
      ],
    ]);
    expect(selectWeakestSkill(["known", "new"], mastery)).toBe("new");
  });

  it("returns null when there are no skills", () => {
    expect(selectWeakestSkill([], new Map())).toBeNull();
  });
});

describe("pickArchetypeSlug", () => {
  const recent: RecentAttempt[] = [
    {
      archetypeSlug: "a",
      skillSlug: "s",
      isCorrect: true,
      difficultyBand: "must",
    },
    {
      archetypeSlug: "b",
      skillSlug: "s",
      isCorrect: true,
      difficultyBand: "must",
    },
  ];

  it("avoids recently-used archetypes when alternatives exist", () => {
    const chosen = pickArchetypeSlug(["a", "b", "c"], recent, () => 0);
    expect(chosen).toBe("c");
  });

  it("falls back to any candidate when all are recent", () => {
    const chosen = pickArchetypeSlug(["a", "b"], recent, () => 0);
    expect(["a", "b"]).toContain(chosen);
  });

  it("returns null for no candidates", () => {
    expect(pickArchetypeSlug([], recent)).toBeNull();
  });
});
