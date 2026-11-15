import { describe, expect, it } from "vitest";
import {
  EDEXCEL_STRANDS,
  EDEXCEL_TOPICS,
  getDueWarmupTopics,
  getTopicBySlug,
  getTopicsByStrand,
  getTopicsForTier,
  pickNextExplanationLens,
} from "./edexcel-1ma1";
import { ALL_LENSES, whiteboardStateSchema } from "./types";

describe("Pearson Edexcel GCSE (1MA1) Curriculum & Multi-Lens Pack", () => {
  it("populates all 6 Pearson Edexcel 1MA1 strands", () => {
    expect(EDEXCEL_STRANDS).toHaveLength(6);
    for (const strand of EDEXCEL_STRANDS) {
      expect(getTopicsByStrand(strand.id).length).toBeGreaterThan(0);
    }
  });

  it("includes Compound Interest (R16) and Fractions (N2) with all 5 lenses and valid whiteboard schemas", () => {
    const compound = getTopicBySlug("compound-interest");
    const fractions = getTopicBySlug("fractions-operations");
    expect(compound?.edexcelCode).toBe("R16");
    expect(fractions?.edexcelCode).toBe("N2");
    expect(compound?.prerequisites.length).toBeGreaterThanOrEqual(3);
    expect(fractions?.prerequisites.length).toBeGreaterThanOrEqual(3);

    for (const topic of EDEXCEL_TOPICS) {
      expect(topic.prerequisites.length).toBeGreaterThanOrEqual(1);
      expect(topic.testQuestions).toHaveLength(3);

      for (const lens of ALL_LENSES) {
        const pack = topic.lenses[lens];
        expect(pack.spokenText.length).toBeGreaterThan(15);
        const parsedBoard = whiteboardStateSchema.safeParse(pack.board);
        expect(parsedBoard.success).toBe(true);
      }
    }
  });

  it("filters Higher-only topics out of Foundation tier while preserving crossover topics", () => {
    const foundationTopics = getTopicsForTier("foundation");
    const higherTopics = getTopicsForTier("higher");

    expect(foundationTopics.some((t) => t.tier === "higher")).toBe(false);
    expect(foundationTopics.some((t) => t.slug === "compound-interest")).toBe(
      true
    );
    expect(higherTopics.some((t) => t.slug === "surds")).toBe(true);
  });

  it("rotates across all 5 explanation lenses before repeating any lens", () => {
    const seen: (typeof ALL_LENSES)[number][] = ["visual"];
    for (let i = 0; i < 4; i++) {
      const current = seen.at(-1) ?? "visual";
      const next = pickNextExplanationLens(current, seen);
      expect(seen.includes(next)).toBe(false);
      seen.push(next);
    }
    expect(new Set(seen).size).toBe(5);
  });

  it("selects 3 due warmup topics prioritising overdue lowest-mastery items", () => {
    const past = new Date("2026-05-01T10:00:00Z");
    const now = new Date("2026-05-10T10:00:00Z");
    const warmup = getDueWarmupTopics(
      [
        {
          learnerId: "l1",
          topicSlug: "fractions-operations",
          masteryScore: 25,
          currentStage: "1.1",
          lensesTried: ["visual"],
          questionsAnswered: 2,
          questionsCorrect: 1,
          intervalDays: 1,
          nextReviewAt: past,
          lastStudiedAt: past,
        },
      ],
      "foundation",
      now
    );
    expect(warmup).toHaveLength(3);
    expect(warmup[0]?.slug).toBe("fractions-operations");
  });
});
