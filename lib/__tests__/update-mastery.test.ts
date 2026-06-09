import { describe, expect, it } from "vitest";
import {
  bandFromScore,
  emptyMastery,
  type MasteryState,
  moveBand,
  updateMastery,
} from "../adaptive/update-mastery";

describe("bandFromScore", () => {
  it("maps score ranges to bands", () => {
    expect(bandFromScore(0)).toBe("must");
    expect(bandFromScore(24)).toBe("must");
    expect(bandFromScore(25)).toBe("should");
    expect(bandFromScore(50)).toBe("could");
    expect(bandFromScore(75)).toBe("gcse_bridge");
    expect(bandFromScore(100)).toBe("gcse_bridge");
  });
});

describe("moveBand", () => {
  it("never moves past the ends and never skips", () => {
    expect(moveBand("must", -1)).toBe("must");
    expect(moveBand("must", 1)).toBe("should");
    expect(moveBand("gcse_bridge", 1)).toBe("gcse_bridge");
  });
});

describe("updateMastery", () => {
  it("moves up after 2 correct in a row", () => {
    let m = emptyMastery();
    m = updateMastery(m, { isCorrect: true, difficultyBand: "must" });
    expect(m.currentBand).toBe("must");
    m = updateMastery(m, { isCorrect: true, difficultyBand: "must" });
    expect(m.recentCorrectStreak).toBe(2);
    expect(m.currentBand).toBe("should");
  });

  it("moves down after 2 wrong in a row", () => {
    let m: MasteryState = {
      ...emptyMastery(),
      masteryScore: 60,
      currentBand: "could",
    };
    m = updateMastery(m, { isCorrect: false, difficultyBand: "could" });
    const bandAfterOne = m.currentBand;
    expect(bandAfterOne).toBe("could");
    m = updateMastery(m, { isCorrect: false, difficultyBand: "could" });
    expect(m.recentWrongStreak).toBe(2);
    expect(m.currentBand).toBe("should");
  });

  it("never jumps from must directly to gcse_bridge", () => {
    let m = emptyMastery();
    // Hammer correct answers; band should step up one at a time.
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      m = updateMastery(m, {
        isCorrect: true,
        difficultyBand: m.currentBand,
      });
      seen.add(m.currentBand);
    }
    // Must have passed through should and could before reaching gcse_bridge.
    expect(seen.has("should")).toBe(true);
    expect(seen.has("could")).toBe(true);
  });

  it("resets the opposite streak on each answer", () => {
    let m = emptyMastery();
    m = updateMastery(m, { isCorrect: true, difficultyBand: "must" });
    expect(m.recentWrongStreak).toBe(0);
    m = updateMastery(m, { isCorrect: false, difficultyBand: "must" });
    expect(m.recentCorrectStreak).toBe(0);
    expect(m.recentWrongStreak).toBe(1);
  });
});
