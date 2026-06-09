import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { QuestionArchetype } from "@/lib/db/schema";
import { generateFromArchetype } from "../questions/generate-from-archetype";
import { gradeAnswer } from "../questions/grade-answer";

const DATA_DIR = path.join(process.cwd(), "data/question-archetypes");

function loadAll(): QuestionArchetype[] {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const all: QuestionArchetype[] = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8"));
    all.push(...parsed);
  }
  return all;
}

describe("generateFromArchetype (seeded data)", () => {
  const archetypes = loadAll();

  it("loads the full GCSE archetype bank", () => {
    expect(archetypes.length).toBeGreaterThanOrEqual(30);
  });

  it("generates a valid, self-consistent question for every archetype", () => {
    for (const archetype of archetypes) {
      for (let i = 0; i < 8; i++) {
        const q = generateFromArchetype(archetype);
        expect(q, `generation failed for ${archetype.slug}`).not.toBeNull();
        if (!q) {
          continue;
        }
        // No unresolved {placeholders} should remain in the prompt.
        expect(q.prompt, `unresolved var in ${archetype.slug}`).not.toMatch(
          /\{[a-zA-Z]+\}/
        );
        // The computed correct answer must itself grade as correct.
        const graded = gradeAnswer({
          studentAnswer: q.correctAnswer,
          correctAnswer: q.correctAnswer,
          rules: q.rules,
        });
        expect(graded, `self-grade failed for ${archetype.slug}`).toBe(true);
      }
    }
  });

  it("supplies options for multiple_choice archetypes", () => {
    const mc = archetypes.filter((a) => a.questionType === "multiple_choice");
    for (const archetype of mc) {
      const q = generateFromArchetype(archetype);
      expect(q?.options, `no options for ${archetype.slug}`).toBeTruthy();
      expect((q?.options ?? []).length).toBeGreaterThan(1);
    }
  });
});

describe("generateFromArchetype (algebra example)", () => {
  it("solves a simplify-like-terms archetype deterministically", () => {
    const archetype = {
      slug: "test_simplify",
      skillSlug: "algebra_simplify_like_terms",
      difficultyBand: "must",
      questionType: "algebraic",
      template: "Simplify: {a}x + {b}x",
      variableSchemaJson: { a: [3], b: [4] },
      // A template-literal answer expression: `${a+b}x` — built here without an
      // inline template literal to keep the linter happy.
      answerExpression: ["`", "$", "{a+b}x`"].join(""),
      acceptableAnswerRulesJson: { normaliseAlgebra: true },
    } as unknown as QuestionArchetype;
    const q = generateFromArchetype(archetype);
    expect(q?.prompt).toBe("Simplify: 3x + 4x");
    expect(q?.correctAnswer).toBe("7x");
  });
});
