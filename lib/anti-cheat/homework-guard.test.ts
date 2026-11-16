import { describe, expect, it } from "vitest";
import { runRanedeerTurn } from "@/lib/ai/ranedeer-engine";
import { detectAnswerSeeking } from "./homework-guard";

describe("Anti-Cheat Socratic Homework Guard", () => {
  it("blocks direct answer demands and solve-for-me requests", () => {
    expect(
      detectAnswerSeeking("Just give me the answer please", "Compound Interest")
        .blocked
    ).toBe(true);
    expect(
      detectAnswerSeeking(
        "What is the final answer to £1200 at 4% for 3 years?",
        "Compound Interest"
      ).blocked
    ).toBe(true);
    expect(
      detectAnswerSeeking("Solve 4x - 7 = 21 for me", "Linear Equations")
        .blocked
    ).toBe(true);
    expect(
      detectAnswerSeeking("Can you do my maths homework?", "Fractions").blocked
    ).toBe(true);
  });

  it("blocks pasted multi-question homework worksheets", () => {
    const pastedSheet = [
      "1) Work out 2/3 + 1/5",
      "2) Work out 3/4 - 2/7",
      "3) Simplify 12/18",
      "4) Convert 7/4 to a mixed number",
    ].join("\n");

    const res = detectAnswerSeeking(pastedSheet, "Fractions");
    expect(res.blocked).toBe(true);
    expect(res.reason).toBe("multi_question_worksheet");
  });

  it("allows genuine conceptual questions and student maths answers", () => {
    expect(
      detectAnswerSeeking("Why did we multiply by 1.05 instead of 0.05?")
        .blocked
    ).toBe(false);
    expect(
      detectAnswerSeeking("How do you find a common denominator?").blocked
    ).toBe(false);
    expect(detectAnswerSeeking("19/20").blocked).toBe(false);
    expect(detectAnswerSeeking("x = 6").blocked).toBe(false);
  });

  it("intercepts answer-seeking inside runRanedeerTurn without calling any external LLM", async () => {
    const response = await runRanedeerTurn({
      profile: {
        nickname: "Maya",
        tier: "foundation",
        targetGrade: 5,
        preferredLens: "visual",
        toneStyle: "encouraging",
      },
      request: {
        topicSlug: "compound-interest",
        action: "ask",
        learnerMessage: "No steps, just give me the answer!",
      },
    });

    expect(response.providerUsed).toBe("Anti-Cheat Homework Guard");
    expect(response.activeLens).toBe("socratic");
    expect(response.spokenText.toLowerCase()).toContain("first step");
  });
});
