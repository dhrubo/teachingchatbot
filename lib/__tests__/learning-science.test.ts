import { describe, expect, it } from "vitest";
import {
  averageConfidence,
  computeTrend,
  confidenceChange,
  compareConfidenceVsMastery,
  computeConfidenceAnalytics,
} from "../learning-science/confidence-analytics";
import {
  computeNextReview,
  getDueItems,
  sortDueByPriority,
  selectRetrievalPracticeItems,
} from "../learning-science/revision-scheduler";
import {
  shouldReduceLoad,
  buildLoadPlan,
} from "../learning-science/cognitive-load";

// =====================================================================
// Confidence Analytics
// =====================================================================

describe("confidence analytics", () => {
  const makeRecord = (
    confidence: number,
    offsetDays: number = 0
  ) => ({
    confidence: confidence as 1 | 2 | 3 | 4 | 5,
    updatedAt: new Date(Date.now() + offsetDays * 86400000),
  });

  describe("averageConfidence", () => {
    it("returns 0 for empty list", () => {
      expect(averageConfidence([])).toBe(0);
    });

    it("computes average correctly", () => {
      expect(
        averageConfidence([
          { confidence: 5 },
          { confidence: 3 },
          { confidence: 4 },
        ])
      ).toBe(4);
    });
  });

  describe("computeTrend", () => {
    it("returns stable with fewer than 4 records", () => {
      expect(computeTrend([makeRecord(3), makeRecord(3)])).toBe("stable");
    });

    it("detects rising trend", () => {
      const records = [
        makeRecord(2, -10),
        makeRecord(2, -7),
        makeRecord(4, -3),
        makeRecord(5, 0),
      ];
      expect(computeTrend(records)).toBe("rising");
    });

    it("detects falling trend", () => {
      const records = [
        makeRecord(5, -10),
        makeRecord(4, -7),
        makeRecord(3, -3),
        makeRecord(2, 0),
      ];
      expect(computeTrend(records)).toBe("falling");
    });

    it("returns stable for small fluctuations", () => {
      const records = [
        makeRecord(3, -10),
        makeRecord(4, -7),
        makeRecord(3, -3),
        makeRecord(4, 0),
      ];
      expect(computeTrend(records)).toBe("stable");
    });
  });

  describe("confidenceChange", () => {
    it("returns 0 with fewer than 2 records", () => {
      expect(confidenceChange([makeRecord(3)])).toBe(0);
    });

    it("returns difference between latest two records", () => {
      const records = [
        makeRecord(2, -5),
        makeRecord(5, 0),
      ];
      expect(confidenceChange(records)).toBe(3);
    });
  });

  describe("compareConfidenceVsMastery", () => {
    it("returns aligned when both are null", () => {
      expect(compareConfidenceVsMastery(null, null)).toBe("aligned");
    });

    it("detects high confidence, low mastery", () => {
      expect(compareConfidenceVsMastery(5, 30)).toBe(
        "high_confidence_low_mastery"
      );
    });

    it("detects low confidence, high mastery", () => {
      expect(compareConfidenceVsMastery(1, 85)).toBe(
        "low_confidence_high_mastery"
      );
    });

    it("returns aligned when both match", () => {
      expect(compareConfidenceVsMastery(5, 80)).toBe("aligned");
      expect(compareConfidenceVsMastery(2, 30)).toBe("aligned");
    });
  });

  describe("computeConfidenceAnalytics", () => {
    it("returns full analytics from records", () => {
      const result = computeConfidenceAnalytics({
        confidenceRecords: [
          { skillSlug: "algebra", confidence: 5, updatedAt: new Date() },
          { skillSlug: "fractions", confidence: 2, updatedAt: new Date() },
        ],
        masteries: new Map([
          ["algebra", { masteryScore: 30 }],
          ["fractions", { masteryScore: 80 }],
        ]),
      });
      expect(result.averageConfidence).toBe(3.5);
      expect(result.lowConfidenceSkills).toContain("fractions");
      expect(result.highConfidenceSkills).toContain("algebra");
    });
  });
});

// =====================================================================
// Revision Scheduler
// =====================================================================

describe("revision scheduler", () => {
  describe("computeNextReview", () => {
    it("resets to day 1 on incorrect answer", () => {
      const result = computeNextReview({
        isCorrect: false,
        confidence: 3,
        currentIntervalDays: 7,
        reviewCount: 3,
      });
      expect(result.nextIntervalDays).toBe(1);
      expect(result.newReviewCount).toBe(0);
    });

    it("advances interval on correct answer", () => {
      const result = computeNextReview({
        isCorrect: true,
        confidence: 3,
        currentIntervalDays: 1,
        reviewCount: 0,
      });
      expect(result.nextIntervalDays).toBeGreaterThanOrEqual(1);
      expect(result.nextIntervalDays).toBeLessThanOrEqual(2);
      expect(result.newReviewCount).toBe(1);
    });

    it("increases interval for high confidence", () => {
      const normal = computeNextReview({
        isCorrect: true,
        confidence: 3,
        currentIntervalDays: 1,
        reviewCount: 0,
      });
      const highConf = computeNextReview({
        isCorrect: true,
        confidence: 5,
        currentIntervalDays: 1,
        reviewCount: 0,
      });
      expect(highConf.nextIntervalDays).toBeGreaterThanOrEqual(
        normal.nextIntervalDays
      );
    });

    it("reduces interval for low confidence", () => {
      const normal = computeNextReview({
        isCorrect: true,
        confidence: 3,
        currentIntervalDays: 1,
        reviewCount: 3,
      });
      const lowConf = computeNextReview({
        isCorrect: true,
        confidence: 1,
        currentIntervalDays: 1,
        reviewCount: 3,
      });
      expect(lowConf.nextIntervalDays).toBeLessThanOrEqual(
        normal.nextIntervalDays
      );
    });
  });

  describe("getDueItems", () => {
    it("returns only items with past or current review date", () => {
      const items = [
        { nextReviewDate: new Date(Date.now() - 86400000) }, // yesterday
        { nextReviewDate: new Date(Date.now() + 86400000) }, // tomorrow
      ];
      const due = getDueItems(items);
      expect(due).toHaveLength(1);
    });
  });

  describe("sortDueByPriority", () => {
    it("sorts by mastery ascending", () => {
      const items = [
        { masteryScore: 80, reviewCount: 5 },
        { masteryScore: 20, reviewCount: 1 },
      ];
      const sorted = sortDueByPriority(items);
      expect(sorted[0].masteryScore).toBe(20);
      expect(sorted[1].masteryScore).toBe(80);
    });
  });

  describe("selectRetrievalPracticeItems", () => {
    it("returns due items first, up to limit", () => {
      const items = [
        { nextReviewDate: new Date(Date.now() - 86400000), masteryScore: 80 },
        { nextReviewDate: new Date(Date.now() + 86400000), masteryScore: 20 },
        { nextReviewDate: new Date(Date.now() - 86400000), masteryScore: 30 },
      ];
      const selected = selectRetrievalPracticeItems(items, 2);
      expect(selected).toHaveLength(2);
      // Both should be due items (yesterday)
      expect(selected.every((s) => s.nextReviewDate <= new Date())).toBe(true);
    });

    it("fills remaining slots with weakest non-due items", () => {
      const items = [
        { nextReviewDate: new Date(Date.now() - 86400000), masteryScore: 80 }, // due
        { nextReviewDate: new Date(Date.now() + 86400000), masteryScore: 20 }, // not due, weak
        { nextReviewDate: new Date(Date.now() + 86400000), masteryScore: 50 }, // not due
      ];
      const selected = selectRetrievalPracticeItems(items, 3);
      expect(selected).toHaveLength(3);
    });
  });
});

// =====================================================================
// Cognitive Load
// =====================================================================

describe("cognitive load", () => {
  describe("shouldReduceLoad", () => {
    it("returns true with 3+ recent failures", () => {
      expect(
        shouldReduceLoad({
          recentFailures: 3,
          abandonedChallenges: 0,
          lowConfidenceSkills: [],
        })
      ).toBe(true);
    });

    it("returns true with 2+ abandoned challenges", () => {
      expect(
        shouldReduceLoad({
          recentFailures: 0,
          abandonedChallenges: 2,
          lowConfidenceSkills: [],
        })
      ).toBe(true);
    });

    it("returns true with 3+ low confidence skills", () => {
      expect(
        shouldReduceLoad({
          recentFailures: 0,
          abandonedChallenges: 0,
          lowConfidenceSkills: ["a", "b", "c"],
        })
      ).toBe(true);
    });

    it("returns false when no triggers", () => {
      expect(
        shouldReduceLoad({
          recentFailures: 0,
          abandonedChallenges: 0,
          lowConfidenceSkills: [],
        })
      ).toBe(false);
    });
  });

  describe("buildLoadPlan", () => {
    it("returns empty plan when load reduction not needed", () => {
      const plan = buildLoadPlan({
        currentSkill: "algebra",
        allSkills: [],
        recentFailures: 0,
        abandonedChallenges: 0,
      });
      expect(plan).toHaveLength(0);
    });

    it("builds NOW/NEXT/LATER plan with 3+ failures", () => {
      const plan = buildLoadPlan({
        currentSkill: "algebra",
        allSkills: [
          { skillSlug: "algebra", masteryScore: 20, confidence: 2 },
          { skillSlug: "fractions", masteryScore: 50, confidence: 3 },
          { skillSlug: "ratio", masteryScore: 70, confidence: 4 },
        ],
        recentFailures: 3,
        abandonedChallenges: 0,
      });
      expect(plan.length).toBeGreaterThanOrEqual(1);
      expect(plan[0].slot).toBe("now");
      expect(plan[0].skillSlug).toBe("algebra");
    });
  });
});

// =====================================================================
// Retrieval Practice — no AI calls
// =====================================================================

describe("retrieval practice", () => {
  it("prioritises weakest due topics", () => {
    const items = [
      { nextReviewDate: new Date(Date.now() - 86400000), masteryScore: 80, reviewCount: 5 },
      { nextReviewDate: new Date(Date.now() - 86400000), masteryScore: 20, reviewCount: 1 },
      { nextReviewDate: new Date(Date.now() - 86400000), masteryScore: 50, reviewCount: 3 },
    ];
    const selected = selectRetrievalPracticeItems(items, 3);
    // Weakest (mastery 20) should be first
    expect(selected[0].masteryScore).toBe(20);
    expect(selected[1].masteryScore).toBe(50);
    expect(selected[2].masteryScore).toBe(80);
  });
});
