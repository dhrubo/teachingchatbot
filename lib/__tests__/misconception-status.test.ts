import { describe, expect, it } from "vitest";
import {
  MIN_FREQUENCY_FOR_CONFIRMED,
  statusForFrequency,
} from "../learning-science/misconception-status";

describe("statusForFrequency", () => {
  it("is tentative below the confirmation threshold", () => {
    expect(statusForFrequency(1)).toBe("tentative");
    expect(statusForFrequency(MIN_FREQUENCY_FOR_CONFIRMED - 1)).toBe(
      "tentative"
    );
  });

  it("is confirmed at/above the confirmation threshold", () => {
    expect(statusForFrequency(MIN_FREQUENCY_FOR_CONFIRMED)).toBe("confirmed");
    expect(statusForFrequency(MIN_FREQUENCY_FOR_CONFIRMED + 5)).toBe(
      "confirmed"
    );
  });
});
