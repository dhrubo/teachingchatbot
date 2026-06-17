import { describe, expect, it } from "vitest";
import { fallbackConceptCards } from "../ai/missions";

describe("fallbackConceptCards", () => {
  it("returns exactly 6 cards", () => {
    const cards = fallbackConceptCards("Percentages");
    expect(cards).toHaveLength(6);
  });

  it("returns cards in the prescribed sequence", () => {
    const cards = fallbackConceptCards("Ratios");
    const titles = cards.map((c) => c.title);
    expect(titles[0]).toMatch(/what is/i);
    expect(titles[1]).toMatch(/vocabulary/i);
    expect(titles[2]).toMatch(/worked/i);
    expect(titles[3]).toMatch(/mistake/i);
    expect(titles[4]).toMatch(/exam/i);
    expect(titles[5]).toMatch(/recap/i);
  });

  it("includes all required fields for every card", () => {
    const cards = fallbackConceptCards("Algebra");
    for (const card of cards) {
      expect(card.id).toBeTruthy();
      expect(card.title).toBeTruthy();
      expect(card.visual).toBeTruthy();
      expect(card.example).toBeTruthy();
      expect(card.explanation).toBeTruthy();
    }
  });

  it("each card has a unique id", () => {
    const cards = fallbackConceptCards("Probability");
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
