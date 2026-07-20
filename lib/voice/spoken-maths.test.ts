import { describe, expect, it } from "vitest";
import { buildClarificationQuestion, parseSpokenMaths, wordsToNumber } from "./spoken-maths";

// Helper: the common case in these tests is "exactly one high-confidence
// candidate, no ambiguity" — assert that shape in one place.
function expectSingleConfident(transcript: string, expected: string) {
  const result = parseSpokenMaths(transcript);
  expect(result.raw).toBe(transcript);
  expect(result.candidates).toHaveLength(1);
  expect(result.candidates[0].value).toBe(expected);
  expect(result.candidates[0].confidence).toBeGreaterThanOrEqual(0.95);
  expect(result.ambiguityReason).toBeNull();
  expect(result.requiresConfirmation).toBe(false);
}

describe("wordsToNumber", () => {
  it("parses simple cardinals", () => {
    expect(wordsToNumber("twelve")).toBe(12);
    expect(wordsToNumber("seven")).toBe(7);
  });

  it("parses tens + ones combinations", () => {
    expect(wordsToNumber("twenty five")).toBe(25);
    expect(wordsToNumber("ninety nine")).toBe(99);
  });

  it("parses hundreds, with or without 'and'", () => {
    expect(wordsToNumber("three hundred and twenty five")).toBe(325);
    expect(wordsToNumber("three hundred twenty five")).toBe(325);
    expect(wordsToNumber("two hundred")).toBe(200);
  });

  it("applies a leading negative/minus sign", () => {
    expect(wordsToNumber("negative twelve")).toBe(-12);
    expect(wordsToNumber("minus five")).toBe(-5);
  });

  it("returns null for unrecognised words", () => {
    expect(wordsToNumber("banana")).toBeNull();
    expect(wordsToNumber("")).toBeNull();
  });

  it("returns null when the phrase has a recognised prefix but an unrecognised trailing word", () => {
    // Guards against "three squared" being misread as the bare number 3.
    expect(wordsToNumber("three squared")).toBeNull();
  });
});

describe("parseSpokenMaths — signed numbers", () => {
  it("normalises 'negative five' to -5", () => {
    expectSingleConfident("negative five", "-5");
  });

  it("normalises 'minus five' to -5", () => {
    expectSingleConfident("minus five", "-5");
  });
});

describe("parseSpokenMaths — integers", () => {
  it("normalises 'twelve' to 12", () => {
    expectSingleConfident("twelve", "12");
  });
});

describe("parseSpokenMaths — decimals", () => {
  it("normalises 'point five' to 0.5", () => {
    expectSingleConfident("point five", "0.5");
  });

  it("normalises 'three point one four' to 3.14 (digit-by-digit, not 'fourteen')", () => {
    expectSingleConfident("three point one four", "3.14");
  });
});

describe("parseSpokenMaths — percentages", () => {
  it("normalises 'twenty five percent' to 25%", () => {
    expectSingleConfident("twenty five percent", "25%");
  });
});

describe("parseSpokenMaths — fractions", () => {
  it("normalises 'three quarters' to 3/4", () => {
    expectSingleConfident("three quarters", "3/4");
  });

  it("normalises 'one third' to 1/3", () => {
    expectSingleConfident("one third", "1/3");
  });
});

describe("parseSpokenMaths — mixed numbers", () => {
  it("normalises 'one and a half' to '1 1/2'", () => {
    expectSingleConfident("one and a half", "1 1/2");
  });
});

describe("parseSpokenMaths — powers", () => {
  it("normalises 'x squared' to x^2", () => {
    expectSingleConfident("x squared", "x^2");
  });

  it("normalises 'two cubed' to 2^3", () => {
    expectSingleConfident("two cubed", "2^3");
  });
});

describe("parseSpokenMaths — equations", () => {
  it("normalises 'x equals four' to 'x = 4'", () => {
    expectSingleConfident("x equals four", "x = 4");
  });
});

describe("parseSpokenMaths — expressions", () => {
  it("normalises 'two x plus three' to '2x + 3'", () => {
    expectSingleConfident("two x plus three", "2x + 3");
  });
});

describe("parseSpokenMaths — brackets (best effort)", () => {
  it("turns spoken bracket cues into literal brackets", () => {
    expectSingleConfident(
      "open bracket two plus three close bracket",
      "(2 + 3)"
    );
  });
});

describe("parseSpokenMaths — multiple-choice letters", () => {
  it("normalises 'option bee' to B (phonetic)", () => {
    expectSingleConfident("option bee", "B");
  });

  it("normalises 'option a' to A", () => {
    expectSingleConfident("option a", "A");
  });

  it("normalises phonetic 'see'/'sea' to C and 'dee' to D", () => {
    expectSingleConfident("option see", "C");
    expectSingleConfident("option sea", "C");
    expectSingleConfident("option dee", "D");
  });
});

describe("parseSpokenMaths — ambiguity: negation-vs-exponent-precedence", () => {
  it("returns two ranked candidates for 'negative three squared'", () => {
    const result = parseSpokenMaths("negative three squared");
    expect(result.ambiguityReason).toBe("negation-vs-exponent-precedence");
    expect(result.requiresConfirmation).toBe(true);
    expect(result.candidates.map((c) => c.value)).toEqual(["-3^2", "(-3)^2"]);
    for (const c of result.candidates) {
      expect(c.confidence).toBeCloseTo(0.5, 1);
    }
  });
});

describe("parseSpokenMaths — ambiguity: digit-string-vs-fraction", () => {
  it("returns two ranked candidates for 'one four'", () => {
    const result = parseSpokenMaths("one four");
    expect(result.ambiguityReason).toBe("digit-string-vs-fraction");
    expect(result.requiresConfirmation).toBe(true);
    expect(result.candidates.map((c) => c.value)).toEqual(["14", "1/4"]);
  });
});

describe("parseSpokenMaths — ambiguity: fraction-scope", () => {
  it("returns two ranked candidates for 'two x plus one over three'", () => {
    const result = parseSpokenMaths("two x plus one over three");
    expect(result.ambiguityReason).toBe("fraction-scope");
    expect(result.requiresConfirmation).toBe(true);
    expect(result.candidates.map((c) => c.value)).toEqual([
      "2x + 1/3",
      "(2x + 1) / 3",
    ]);
  });
});

describe("parseSpokenMaths — case-insensitivity", () => {
  it("treats upper/mixed case the same as lower case", () => {
    expectSingleConfident("NEGATIVE FIVE", "-5");
    expectSingleConfident("Two X Plus Three", "2x + 3");
    expectSingleConfident("Option BEE", "B");
  });
});

describe("parseSpokenMaths — filler-word tolerance", () => {
  it("strips leading interjections like 'um'", () => {
    expectSingleConfident("um twelve", "12");
  });

  it("strips 'the answer is' / 'it's' style preambles", () => {
    expectSingleConfident("the answer is negative five", "-5");
    expectSingleConfident("it's twelve", "12");
    expectSingleConfident("it is three quarters", "3/4");
  });

  it("strips combined filler ('um, the answer is...' / 'I think it's option bee')", () => {
    expectSingleConfident("um, the answer is twelve", "12");
    expectSingleConfident("I think it's option bee", "B");
  });
});

describe("parseSpokenMaths — edge case: empty/silent transcript", () => {
  // A blank STT result (silence, or speech the recognizer couldn't decode at
  // all) must never be graded as a real attempt — flag it for confirmation
  // rather than comparing an empty string against the canonical answer.
  it("flags an empty transcript rather than returning a false answer", () => {
    const result = parseSpokenMaths("");
    expect(result.ambiguityReason).toBe("empty-transcript");
    expect(result.requiresConfirmation).toBe(true);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].confidence).toBe(0);
  });

  it("flags a whitespace/filler-only transcript the same way", () => {
    const result = parseSpokenMaths("   um   ");
    expect(result.ambiguityReason).toBe("empty-transcript");
    expect(result.requiresConfirmation).toBe(true);
  });
});

describe("parseSpokenMaths — edge case: unrecognised transcript", () => {
  // Distinguishes "STT text we structurally can't map to any rule" from a
  // genuine multi-reading ambiguity: no ambiguityReason is set (there's no
  // second plausible reading to offer), but confidence is low enough that
  // requiresConfirmation is still true — the caller should ask the student
  // to repeat rather than silently grading a best-effort guess.
  it("returns a low-confidence candidate with no ambiguityReason for gibberish", () => {
    const result = parseSpokenMaths("flibbertigibbet wobblesnort");
    expect(result.ambiguityReason).toBeNull();
    expect(result.requiresConfirmation).toBe(true);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].confidence).toBeLessThan(0.85);
  });
});

describe("buildClarificationQuestion", () => {
  it("returns null when confirmation isn't required", () => {
    const result = parseSpokenMaths("twenty five");
    expect(buildClarificationQuestion(result)).toBeNull();
  });

  it("asks the student to repeat for an empty transcript", () => {
    const result = parseSpokenMaths("");
    const clarification = buildClarificationQuestion(result);
    expect(clarification).not.toBeNull();
    expect(clarification?.displayText.toLowerCase()).toContain("didn't catch");
    expect(clarification?.spokenText).toBe(clarification?.displayText);
  });

  it("presents both readings for a fraction-scope ambiguity", () => {
    const result = parseSpokenMaths("two x plus one over three");
    expect(result.ambiguityReason).toBe("fraction-scope");
    const clarification = buildClarificationQuestion(result);
    expect(clarification).not.toBeNull();
    expect(clarification?.displayText).toContain(result.candidates[0].value);
    expect(clarification?.displayText).toContain(result.candidates[1].value);
  });

  it("presents both readings for a negation-vs-exponent-precedence ambiguity", () => {
    const result = parseSpokenMaths("negative three squared");
    expect(result.ambiguityReason).toBe("negation-vs-exponent-precedence");
    const clarification = buildClarificationQuestion(result);
    expect(clarification).not.toBeNull();
    expect(clarification?.displayText).toContain("-3^2");
    expect(clarification?.displayText).toContain("(-3)^2");
    expect(clarification?.displayText).toContain("squared");
  });

  it("presents both readings for a digit-string-vs-fraction ambiguity", () => {
    const result = parseSpokenMaths("one four");
    expect(result.ambiguityReason).toBe("digit-string-vs-fraction");
    const clarification = buildClarificationQuestion(result);
    expect(clarification).not.toBeNull();
    expect(clarification?.displayText).toContain("14");
    expect(clarification?.displayText).toContain("1/4");
  });

  it("confirms a single low-confidence reading for unrecognised input", () => {
    const result = parseSpokenMaths("flibbertigibbet wobblesnort");
    const clarification = buildClarificationQuestion(result);
    expect(clarification).not.toBeNull();
    expect(clarification?.displayText).toContain(result.raw);
  });
});
