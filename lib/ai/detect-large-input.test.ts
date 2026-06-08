import { describe, it, expect } from "vitest";
import { detectLargeInput, extractTopics, CHUNKING_MESSAGE } from "./detect-large-input";

describe("detectLargeInput", () => {
  it("returns triggered=false for a short question", () => {
    const result = detectLargeInput("What is 2 + 2?");
    expect(result.triggered).toBe(false);
  });

  it("returns triggered=false for a long word problem", () => {
    const input = "Sally has 42 apples and gives 17 to her friend Tom. Then she buys 3 more and shares them equally among 5 baskets. How many apples are in each basket?";
    const result = detectLargeInput(input);
    expect(result.triggered).toBe(false);
  });

  it("returns triggered=true for a bullet list of 5+ topics", () => {
    const input = [
      "- Fractions",
      "- Decimals",
      "- Percentages",
      "- Ratios",
      "- Algebra",
      "- Geometry",
    ].join("\n");
    const result = detectLargeInput(input);
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe("many_topics");
  });

  it("returns triggered=true for a numbered list of 5+ items", () => {
    const input = [
      "1. Fractions",
      "2. Decimals",
      "3. Percentages",
      "4. Ratios",
      "5. Algebra",
      "6. Probability",
    ].join("\n");
    const result = detectLargeInput(input);
    expect(result.triggered).toBe(true);
    expect(result.topicsCount).toBeGreaterThanOrEqual(6);
  });

  it("returns triggered=true for a comma list of 6+ items", () => {
    const result = detectLargeInput("a, b, c, d, e, f, g");
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe("many_topics");
  });

  it("returns triggered=true for syllabus marker with 3+ topics", () => {
    const input = "Here is my curriculum: Fractions, Decimals, Percentages";
    const result = detectLargeInput(input);
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe("list_or_syllabus");
  });

  it("returns triggered=false for short sentences", () => {
    const result = detectLargeInput("I need help with fractions.");
    expect(result.triggered).toBe(false);
  });

  it("returns triggered=false for a line with sentence punctuation", () => {
    const input = "Can you explain how to add fractions with different denominators? I keep getting stuck on finding the common multiple.";
    const result = detectLargeInput(input);
    expect(result.triggered).toBe(false);
  });

  it("returns triggered=false for 4 short bullet items (below threshold)", () => {
    const input = ["- Red", "- Blue", "- Green", "- Yellow"].join("\n");
    const result = detectLargeInput(input);
    expect(result.triggered).toBe(false);
  });

  it("handles syllabus marker without enough comma items gracefully", () => {
    const result = detectLargeInput("My syllabus: Maths");
    expect(result.triggered).toBe(false);
  });
});

describe("extractTopics", () => {
  it("parses a newline-separated bullet list", () => {
    const input = ["- Fractions", "- Decimals", "- Percentages"].join("\n");
    const topics = extractTopics(input);
    expect(topics).toEqual(["Fractions", "Decimals", "Percentages"]);
  });

  it("parses a comma-separated list", () => {
    const topics = extractTopics("Fractions, Decimals, Percentages");
    expect(topics).toEqual(["Fractions", "Decimals", "Percentages"]);
  });

  it("parses a numbered list", () => {
    const input = ["1) Fractions", "2) Decimals", "3) Percentages"].join("\n");
    const topics = extractTopics(input);
    expect(topics).toEqual(["Fractions", "Decimals", "Percentages"]);
  });

  it("strips leading/trailing whitespace and dashes", () => {
    const topics = extractTopics("  -- Fractions  ");
    expect(topics).toContain("Fractions");
  });

  it("limits to 40 topics", () => {
    const input = Array.from({ length: 50 }, (_, i) => `Topic ${i + 1}`).join(", ");
    const topics = extractTopics(input);
    expect(topics.length).toBe(40);
  });

  it("drops items shorter than 2 chars", () => {
    const topics = extractTopics("a, b, c");
    expect(topics.length).toBe(0);
  });

  it("drops items longer than 60 chars", () => {
    const topics = extractTopics("x".repeat(70));
    expect(topics.length).toBe(0);
  });
});

describe("CHUNKING_MESSAGE", () => {
  it("exists and is a non-empty string", () => {
    expect(CHUNKING_MESSAGE).toBeTruthy();
    expect(typeof CHUNKING_MESSAGE).toBe("string");
    expect(CHUNKING_MESSAGE.length).toBeGreaterThan(50);
  });
});
