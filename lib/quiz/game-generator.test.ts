import { describe, expect, it } from "vitest";
import { EDEXCEL_TOPICS } from "@/lib/curriculum/edexcel-1ma1";
import { checkMathAnswer } from "@/lib/math/check-answer";
import { generateTopicGameRounds, toPublicGameRound } from "./game-generator";

describe("generateTopicGameRounds & toPublicGameRound", () => {
  it("builds a 5-round progressive working & boss quest for all 14 Edexcel topics", () => {
    for (const topic of EDEXCEL_TOPICS) {
      for (const tier of ["foundation", "higher"] as const) {
        const rounds = generateTopicGameRounds(topic.slug, tier);
        expect(rounds).toHaveLength(5);

        expect(rounds.map((r) => r.roundType)).toEqual([
          "step_choice",
          "missing_working",
          "fluency_solve",
          "exam_solve",
          "boss_solve",
        ]);

        // Round 1 (step_choice) and Round 2 (missing_working) must include canonicalAnswer in choices
        const [r1, r2, r3, r4, r5] = rounds;
        expect(r1?.choices).toBeDefined();
        expect(r1?.choices).toContain(r1?.canonicalAnswer);

        expect(r2?.choices).toBeDefined();
        expect(r2?.choices).toContain(r2?.canonicalAnswer);
        expect(r2?.workingLines?.length).toBeGreaterThan(0);

        // Rounds 3, 4, and 5 must self-grade cleanly via checkMathAnswer
        for (const solveRound of [r3, r4, r5]) {
          expect(solveRound).toBeDefined();
          if (solveRound) {
            const check = checkMathAnswer({
              learnerInput: solveRound.canonicalAnswer,
              canonicalAnswer: solveRound.canonicalAnswer,
            });
            expect(check.isCorrect).toBe(true);
          }
        }
      }
    }
  });

  it("strips canonicalAnswer, workedSolution, and hintSpoken from public client payloads", () => {
    const rounds = generateTopicGameRounds("compound-interest", "foundation");
    for (const round of rounds) {
      const pub = toPublicGameRound(round);
      expect("canonicalAnswer" in pub).toBe(false);
      expect("workedSolution" in pub).toBe(false);
      expect("hintSpoken" in pub).toBe(false);
      expect(pub.promptText.length).toBeGreaterThan(5);
    }
  });
});
