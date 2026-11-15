import { describe, expect, it } from "vitest";
import {
  type RanedeerLearnerProfile,
  runRanedeerTurn,
} from "./ranedeer-engine";

const SAMPLE_PROFILE: RanedeerLearnerProfile = {
  nickname: "Amina",
  tier: "foundation",
  targetGrade: 5,
  preferredLens: "visual",
  toneStyle: "encouraging",
};

describe("Mr. Ranedeer Pedagogical Engine (Edexcel 1MA1)", () => {
  it("starts Compound Interest in the student's preferred lens with a visual timeline", async () => {
    const turn = await runRanedeerTurn({
      profile: SAMPLE_PROFILE,
      request: {
        topicSlug: "compound-interest",
        action: "start_topic",
      },
    });
    expect(turn.activeLens).toBe("visual");
    expect(turn.board.visual?.kind).toBe("multiplier-timeline");
    expect(turn.stage).toBe("1.1");
  });

  it("rotates to an untried lens when 'explain_differently' or spoken 'explain it another way' is triggered", async () => {
    const turn = await runRanedeerTurn({
      profile: SAMPLE_PROFILE,
      request: {
        topicSlug: "fractions-operations",
        action: "ask",
        targetLens: "visual",
        lensesAlreadyTried: ["visual"],
        learnerMessage: "Can you explain it another way?",
      },
    });
    expect(turn.activeLens).not.toBe("visual");
    expect(turn.providerUsed).toContain("Rotator");
  });

  it("walks the 0.1 -> 0.2 Prerequisite Ladder on Compound Interest", async () => {
    const step0 = await runRanedeerTurn({
      profile: SAMPLE_PROFILE,
      request: {
        topicSlug: "compound-interest",
        action: "step_back_prerequisite",
      },
    });
    expect(step0.stage).toBe("prereq:0");

    // Prereq 0.1: "Write 4% as a decimal." -> 0.04
    const step1 = await runRanedeerTurn({
      profile: SAMPLE_PROFILE,
      request: {
        topicSlug: "compound-interest",
        action: "submit_answer",
        stage: "prereq:0",
        learnerMessage: "0.04",
      },
    });
    expect(step1.answerFeedback?.isCorrect).toBe(true);
    expect(step1.stage).toBe("prereq:1");
  });

  it("progresses through the 3/10 -> 6/10 -> 9/10 Mr. Ranedeer /test ramp deterministically", async () => {
    const startTest = await runRanedeerTurn({
      profile: SAMPLE_PROFILE,
      request: {
        topicSlug: "fractions-operations",
        action: "start_test",
      },
    });
    expect(startTest.stage).toBe("test:0");

    // Level 3/10 on fractions-operations: canonical answer is 19/20
    const afterQ0 = await runRanedeerTurn({
      profile: SAMPLE_PROFILE,
      request: {
        topicSlug: "fractions-operations",
        action: "ask",
        stage: "test:0",
        learnerMessage: "nineteen over twenty",
      },
    });
    expect(afterQ0.answerFeedback?.isCorrect).toBe(true);
    expect(afterQ0.stage).toBe("test:1");
  });
});
