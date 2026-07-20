import { beforeEach, describe, expect, it, vi } from "vitest";

const generateObjectMock = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateObject: generateObjectMock };
});

const { runVoiceTutorTurn } = await import("./voice-tutor-validator");

function fakeCandidate(id: string) {
  return {
    id,
    displayName: id,
    model: {} as never,
    modelName: `${id}-model`,
    capabilities: {} as never,
  } as never as import("./providers").ProviderCandidate;
}

beforeEach(() => {
  generateObjectMock.mockReset();
});

describe("runVoiceTutorTurn", () => {
  it("returns the draft unchanged when both fields validate cleanly", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        displayText: "Percentages are fractions out of 100.",
        spokenText: "Percentages are fractions out of one hundred.",
      },
    });

    const result = await runVoiceTutorTurn({
      mode: "teach",
      basePrompt: "BASE",
      userMessage: "explain percentages",
      candidates: [fakeCandidate("openai")],
    });

    expect(result.repairStatus).toBe("none");
    expect(result.violations).toEqual([]);
    expect(result.provider).toBe("openai");
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
  });

  it("repairs once when a field is invalid, and returns the repaired pair if it now passes", async () => {
    generateObjectMock
      .mockResolvedValueOnce({
        object: {
          displayText: "Now try this: what is 25% of 80?",
          spokenText: "Now try this: what is 25% of 80?",
        },
      })
      .mockResolvedValueOnce({
        object: {
          displayText: "Percentages are fractions out of 100.",
          spokenText: "Percentages are fractions out of one hundred.",
        },
      });

    const result = await runVoiceTutorTurn({
      mode: "teach",
      basePrompt: "BASE",
      userMessage: "explain percentages",
      candidates: [fakeCandidate("openai")],
    });

    expect(result.repairStatus).toBe("repaired");
    expect(result.displayText).toBe("Percentages are fractions out of 100.");
    expect(generateObjectMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to the deterministic safe text after exactly one failed repair", async () => {
    generateObjectMock
      .mockResolvedValueOnce({
        object: {
          displayText: "Now try this: what is 25% of 80?",
          spokenText: "Now try this: what is 25% of 80?",
        },
      })
      .mockResolvedValueOnce({
        object: {
          displayText: "Try this too: what is 10% of 40?",
          spokenText: "Try this too: what is 10% of 40?",
        },
      });

    const result = await runVoiceTutorTurn({
      mode: "teach",
      basePrompt: "BASE",
      userMessage: "explain percentages",
      candidates: [fakeCandidate("openai")],
    });

    expect(result.repairStatus).toBe("fallback");
    expect(generateObjectMock).toHaveBeenCalledTimes(2); // never more than draft + one repair
    expect(result.displayText.length).toBeGreaterThan(0);
    expect(result.spokenText).toBe(result.displayText);
  });

  it("flags too_long via maxSpokenWords even when displayText is fine", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        displayText: "Short and fine.",
        spokenText: "one two three four five six seven eight nine ten eleven twelve",
      },
    });

    const result = await runVoiceTutorTurn({
      mode: "teach",
      basePrompt: "BASE",
      userMessage: "explain",
      maxSpokenWords: 5,
      candidates: [fakeCandidate("openai")],
    });

    expect(result.repairStatus).not.toBe("none");
  });

  it("falls back to the next candidate on a quota error from the first", async () => {
    generateObjectMock
      .mockRejectedValueOnce(new Error("429 quota exceeded"))
      .mockResolvedValueOnce({
        object: {
          displayText: "Percentages are fractions out of 100.",
          spokenText: "Percentages are fractions out of one hundred.",
        },
      });

    const result = await runVoiceTutorTurn({
      mode: "teach",
      basePrompt: "BASE",
      userMessage: "explain percentages",
      candidates: [fakeCandidate("openai"), fakeCandidate("groq")],
    });

    expect(result.repairStatus).toBe("none");
    expect(result.provider).toBe("groq");
  });

  it("throws when every candidate is exhausted by quota errors", async () => {
    generateObjectMock.mockRejectedValue(new Error("429 quota exceeded"));

    await expect(
      runVoiceTutorTurn({
        mode: "teach",
        basePrompt: "BASE",
        userMessage: "explain percentages",
        candidates: [fakeCandidate("openai")],
      })
    ).rejects.toThrow(/All providers exhausted/);
  });

  it("propagates a non-quota error immediately without a repair attempt", async () => {
    generateObjectMock.mockRejectedValue(new Error("API key not valid"));

    await expect(
      runVoiceTutorTurn({
        mode: "teach",
        basePrompt: "BASE",
        userMessage: "explain percentages",
        candidates: [fakeCandidate("openai")],
      })
    ).rejects.toThrow(/API key not valid/);
  });
});
