import { describe, expect, it, vi } from "vitest";
import {
  buildRepairPrompt,
  runTutorTurn,
  validateTutorResponse,
} from "./tutor-validator";

describe("validateTutorResponse", () => {
  it("passes a clean teach reply", () => {
    const result = validateTutorResponse(
      "Percentages are just fractions out of 100. For example, 50% is the same as 50/100, or a half.",
      { mode: "teach" }
    );
    expect(result.valid).toBe(true);
  });

  it("flags answer_leak when the final answer appears in a teach/hint reply", () => {
    const result = validateTutorResponse(
      "The answer is 42, nice work figuring that out!",
      { mode: "hint", finalAnswer: "42" }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("answer_leak");
    }
  });

  it("does NOT flag answer_leak in mistake_explanation/worked_solution modes", () => {
    const result = validateTutorResponse(
      "You wrote -3, but the correct answer is 3 — you dropped the sign when moving the term over.",
      { mode: "mistake_explanation", finalAnswer: "3" }
    );
    expect(result.valid).toBe(true);
  });

  it("does NOT flag answer_leak when the answer's digits merely appear inside an unrelated number", () => {
    const result = validateTutorResponse(
      "Great question — step 15 of the method is to simplify first.",
      { mode: "teach", finalAnswer: "5" }
    );
    expect(result.valid).toBe(true);
  });

  it("still flags answer_leak when the answer appears as its own standalone token", () => {
    const result = validateTutorResponse("So the answer is 5.", {
      mode: "teach",
      finalAnswer: "5",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("answer_leak");
    }
  });

  it("flags answer_leak for non-numeric answers containing punctuation, like a fraction", () => {
    const result = validateTutorResponse("The answer is 1/2, nicely done.", {
      mode: "teach",
      finalAnswer: "1/2",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("answer_leak");
    }
  });

  it("flags question_not_allowed for graded-question phrasing in teach mode", () => {
    const result = validateTutorResponse(
      "Great! Now try this: what is 25% of 80?",
      { mode: "teach" }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("question_not_allowed");
    }
  });

  it("allows a single non-graded question in teach mode", () => {
    const result = validateTutorResponse(
      "Which topic would you like to try next?",
      { mode: "teach" }
    );
    expect(result.valid).toBe(true);
  });

  it("flags too_many_questions when more than one question mark appears", () => {
    const result = validateTutorResponse(
      "What does 50% mean? And what is 50% of 80?",
      { mode: "teach" }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("too_many_questions");
    }
  });

  it("flags unsupported_diagnosis when a misconception is asserted with no confirmed evidence", () => {
    const result = validateTutorResponse(
      "This is a classic sign error — you always forget to flip the sign.",
      { mode: "mistake_explanation", confirmedMisconceptions: [] }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("unsupported_diagnosis");
    }
  });

  it("does not flag unsupported_diagnosis when the misconception IS confirmed", () => {
    const result = validateTutorResponse(
      "This looks like the sign_error pattern we've seen before — let's check the signs carefully.",
      { mode: "mistake_explanation", confirmedMisconceptions: ["sign_error"] }
    );
    expect(result.valid).toBe(true);
  });

  it("flags too_long for an oversized reply", () => {
    const longText = "This is a sentence. ".repeat(80);
    const result = validateTutorResponse(longText, { mode: "teach" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("too_long");
    }
  });

  it("allows a worked_solution reply longer than the standard 2-6 line budget", () => {
    const steps = Array.from(
      { length: 8 },
      (_, i) => `Step ${i + 1}: do the next part of the working.`
    ).join("\n");
    const result = validateTutorResponse(steps, { mode: "worked_solution" });
    expect(result.valid).toBe(true);
  });

  it("still flags too_long for a worked_solution reply that exceeds its own larger budget", () => {
    const steps = Array.from(
      { length: 25 },
      (_, i) => `Step ${i + 1}: do the next part of the working.`
    ).join("\n");
    const result = validateTutorResponse(steps, { mode: "worked_solution" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("too_long");
    }
  });

  it("uses maxWords (word count) instead of char/line thresholds when provided", () => {
    // Short in chars/lines, but over a tiny word limit.
    const text = "one two three four five six seven eight nine ten";
    const withinLimit = validateTutorResponse(text, { mode: "teach", maxWords: 20 });
    expect(withinLimit.valid).toBe(true);

    const overLimit = validateTutorResponse(text, { mode: "teach", maxWords: 5 });
    expect(overLimit.valid).toBe(false);
    if (!overLimit.valid) {
      expect(overLimit.violations).toContain("too_long");
    }
  });

  it("does not apply the char/line thresholds when maxWords is set, even for a normally-oversized reply", () => {
    // This text would trip the default MAX_CHARS/MAX_LINES thresholds, but a
    // generous maxWords should let it pass — maxWords fully replaces the
    // char/line check rather than adding to it.
    const longText = Array.from({ length: 15 }, (_, i) => `Line ${i + 1}.`).join("\n");
    const result = validateTutorResponse(longText, { mode: "teach", maxWords: 200 });
    expect(result.valid).toBe(true);
  });

  it("flags mentions_internal_state for XP/streak/mastery references", () => {
    const result = validateTutorResponse(
      "Nice! You just earned +10 XP and hit a streak of 4.",
      { mode: "teach" }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("mentions_internal_state");
    }
  });

  it("flags requests_personal_data", () => {
    const result = validateTutorResponse(
      "Before we continue, what's your home address and phone number?",
      { mode: "teach" }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("requests_personal_data");
    }
  });

  it("flags topic_drift for clearly off-topic content", () => {
    const result = validateTutorResponse("Sure! Here's a recipe for pancakes...", {
      mode: "teach",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("topic_drift");
    }
  });

  it("flags topic_drift for entertainment/trivia/dating-advice requests", () => {
    const cases = [
      "Sure, who won the world cup last year? Let's talk football.",
      "Sure! Let me write a program for you in Python.",
      "Sure! Here's some dating advice for you.",
      "Let me recommend a movie for tonight.",
    ];
    for (const text of cases) {
      const result = validateTutorResponse(text, { mode: "teach" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations).toContain("topic_drift");
      }
    }
  });

  it("does NOT flag other GCSE subjects as topic drift (this app teaches more than maths)", () => {
    const result = validateTutorResponse(
      "In chemistry, an atom's nucleus contains protons and neutrons.",
      { mode: "teach" }
    );
    expect(result.valid).toBe(true);
  });

  it("flags unsafe_content for the denylisted phrases", () => {
    const result = validateTutorResponse("I can't help with self-harm content.", {
      mode: "teach",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations).toContain("unsafe_content");
    }
  });

  it("flags unsafe_content for violence/drugs/bullying phrasing", () => {
    const cases = [
      "Here's how to hurt someone who's bothering you.",
      "Here's how to buy drugs online.",
      "Go ahead and make fun of him in class.",
    ];
    for (const text of cases) {
      const result = validateTutorResponse(text, { mode: "teach" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations).toContain("unsafe_content");
      }
    }
  });
});

describe("buildRepairPrompt", () => {
  it("never includes raw request data — only the base prompt and fixed violation text", () => {
    const prompt = buildRepairPrompt("BASE PROMPT TEXT", [
      "answer_leak",
      "too_long",
    ]);
    expect(prompt).toContain("BASE PROMPT TEXT");
    expect(prompt).toContain("revealed the final answer");
    expect(prompt).toContain("too long");
  });
});

describe("runTutorTurn", () => {
  it("returns the draft unchanged when it's already valid", async () => {
    const generate = vi.fn().mockResolvedValue("A clean, on-topic teaching reply.");
    const result = await runTutorTurn({
      mode: "teach",
      basePrompt: "BASE",
      validation: { mode: "teach" },
      generate,
    });
    expect(result.repairStatus).toBe("none");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("repairs once when the draft is invalid, and returns the repaired text if it now passes", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce("Now try this: what is 50% of 80?")
      .mockResolvedValueOnce("Percentages are fractions out of 100.");
    const result = await runTutorTurn({
      mode: "teach",
      basePrompt: "BASE",
      validation: { mode: "teach" },
      generate,
    });
    expect(result.repairStatus).toBe("repaired");
    expect(result.text).toBe("Percentages are fractions out of 100.");
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("falls back to a deterministic safe reply after exactly one failed repair — never recurses", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce("Now try this: what is 50% of 80?")
      .mockResolvedValueOnce("Try this one too: what is 10% of 40?");
    const result = await runTutorTurn({
      mode: "teach",
      basePrompt: "BASE",
      validation: { mode: "teach" },
      generate,
    });
    expect(result.repairStatus).toBe("fallback");
    expect(generate).toHaveBeenCalledTimes(2); // exactly draft + one repair, never more
    expect(result.text.length).toBeGreaterThan(0);
  });
});
