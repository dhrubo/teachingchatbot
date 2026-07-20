import { describe, expect, it } from "vitest";
import { classifyVoiceTurn } from "./classify-voice-turn";

describe("classifyVoiceTurn", () => {
  it("classifies a control command regardless of expectedResponseType", () => {
    const result = classifyVoiceTurn("give me a hint");
    expect(result).toEqual({
      kind: "command",
      command: "hint",
      matchedPhrase: "give me a hint",
    });
  });

  it("classifies a plain conversational utterance as a teaching_turn when there's no pending question", () => {
    const result = classifyVoiceTurn("can you explain percentages again");
    expect(result.kind).toBe("teaching_turn");
  });

  it("classifies a clean spoken-maths answer as 'answer' when a question is pending", () => {
    const result = classifyVoiceTurn("twenty five", "numeric");
    expect(result.kind).toBe("answer");
    if (result.kind === "answer") {
      expect(result.candidateAnswer).toBe("25");
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    }
  });

  it("classifies an ambiguous spoken-maths answer as clarification_needed", () => {
    const result = classifyVoiceTurn("negative three squared", "numeric");
    expect(result.kind).toBe("clarification_needed");
    if (result.kind === "clarification_needed") {
      expect(result.ambiguityReason).toBe("negation-vs-exponent-precedence");
      expect(result.candidates).toHaveLength(2);
      expect(result.clarification.displayText).toContain("squared");
    }
  });

  it("never returns 'answer' or 'clarification_needed' when no expectedResponseType is given", () => {
    // Same transcript that would be an ambiguous answer WITH a pending
    // question must fall through to teaching_turn without one — this route
    // should never try to grade/clarify an answer nobody asked for.
    const result = classifyVoiceTurn("negative three squared");
    expect(result.kind).toBe("teaching_turn");
  });

  it("treats a bare multiple-choice letter as an answer, never a command, for multiple_choice questions", () => {
    const result = classifyVoiceTurn("option bee", "multiple_choice");
    expect(result.kind).toBe("answer");
    if (result.kind === "answer") {
      expect(result.candidateAnswer).toBe("B");
    }
  });

  it("still recognises a real command even when a question is pending", () => {
    const result = classifyVoiceTurn("repeat that", "numeric");
    expect(result).toEqual({
      kind: "command",
      command: "repeat",
      matchedPhrase: "repeat that",
    });
  });
});
