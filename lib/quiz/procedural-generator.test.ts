import { describe, expect, it } from "vitest";
import { EDEXCEL_TOPICS } from "@/lib/curriculum/edexcel-1ma1";
import { checkMathAnswer } from "@/lib/math/check-answer";
import {
  generateProceduralQuiz,
  toPublicQuizQuestion,
} from "./procedural-generator";

describe("Procedural Server-Only No-Cheat Quiz Generator", () => {
  it("generates 5 valid self-consistent questions for all 14 Edexcel 1MA1 topics", () => {
    expect(EDEXCEL_TOPICS.length).toBeGreaterThanOrEqual(14);

    for (const topic of EDEXCEL_TOPICS) {
      const questions = generateProceduralQuiz(topic.slug, "higher");
      expect(questions).toHaveLength(5);

      questions.forEach((q, idx) => {
        expect(q.index).toBe(idx);
        expect(q.promptText.length).toBeGreaterThan(10);
        expect(q.spokenPrompt.length).toBeGreaterThan(10);
        expect(q.workedSolution.length).toBeGreaterThan(4);

        // Verify the generator's canonicalAnswer passes our deterministic GCSE grader
        const check = checkMathAnswer({
          learnerInput: q.canonicalAnswer,
          canonicalAnswer: q.canonicalAnswer,
          acceptedVariants: q.acceptedVariants,
        });
        expect(check.isCorrect).toBe(true);
      });
    }
  });

  it("strips canonicalAnswer, workedSolution, and hintSpoken from public browser payloads", () => {
    const [first] = generateProceduralQuiz("compound-interest", "foundation");
    expect(first).toBeDefined();
    if (!first) {
      return;
    }

    const pub = toPublicQuizQuestion(first);
    expect(pub.promptText).toBe(first.promptText);
    expect("canonicalAnswer" in pub).toBe(false);
    expect("workedSolution" in pub).toBe(false);
    expect("hintSpoken" in pub).toBe(false);
    expect("acceptedVariants" in pub).toBe(false);
  });

  it("randomizes numbers across consecutive attempts so answers cannot be memorized", () => {
    const seenPrompts = new Set<string>();
    for (let run = 0; run < 8; run += 1) {
      const quiz = generateProceduralQuiz("compound-interest", "foundation");
      seenPrompts.add(quiz.map((q) => q.promptText).join("||"));
    }
    expect(seenPrompts.size).toBeGreaterThan(1);
  });
});
