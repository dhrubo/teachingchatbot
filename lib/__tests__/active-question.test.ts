import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/types";

// We import from the source file; the function signatures are our contract.
import {
  type ActiveQuestion,
  countAnsweredQuestions,
  getActiveQuestion,
  isAnswerCorrect,
  isGraded,
} from "../active-question";

function makeAssistantMsg(parts: ChatMessage["parts"]): ChatMessage {
  return { id: "a1", role: "assistant", parts, content: "" } as ChatMessage;
}

function makeUserMsg(text: string): ChatMessage {
  return {
    id: "u1",
    role: "user",
    parts: [{ type: "text", text }],
    content: "",
  } as unknown as ChatMessage;
}

function makeAskQuestionPart(
  prompt: string,
  correctAnswer = "",
  options: string[] = []
): ChatMessage["parts"][number] {
  return {
    type: "tool-askQuestion",
    toolCallId: "tc1",
    output: {
      prompt,
      type: "multiple_choice",
      options,
      correctAnswer,
      explanation: "Test explanation",
    },
  } as unknown as ChatMessage["parts"][number];
}

describe("getActiveQuestion", () => {
  it("returns null for empty messages", () => {
    expect(getActiveQuestion([])).toBeNull();
  });

  it("returns null when there's no askQuestion tool call", () => {
    const msgs = [makeAssistantMsg([{ type: "text", text: "Hello" }])];
    expect(getActiveQuestion(msgs)).toBeNull();
  });

  it("returns the question when it hasn't been answered yet", () => {
    const msgs = [
      makeAssistantMsg([
        { type: "text", text: "Let me ask you something" },
        makeAskQuestionPart("What is 2+2?", "4", ["3", "4", "5"]),
      ]),
    ];
    const q = getActiveQuestion(msgs);
    expect(q).not.toBeNull();
    expect(q!.prompt).toBe("What is 2+2?");
    expect(q!.correctAnswer).toBe("4");
  });

  it("returns null when the question has been answered", () => {
    const msgs = [
      makeAssistantMsg([
        { type: "text", text: "What is 2+2?" },
        makeAskQuestionPart("What is 2+2?", "4", ["3", "4", "5"]),
      ]),
      makeUserMsg("4"),
    ];
    expect(getActiveQuestion(msgs)).toBeNull();
  });

  it("returns the latest unanswered question when there are multiple", () => {
    const msgs = [
      makeAssistantMsg([makeAskQuestionPart("Q1", "a", ["a", "b"])]),
      makeUserMsg("a"),
      makeAssistantMsg([makeAskQuestionPart("Q2", "c", ["c", "d"])]),
    ];
    const q = getActiveQuestion(msgs);
    expect(q).not.toBeNull();
    expect(q!.prompt).toBe("Q2");
  });

  it("returns null for a question answered with wrong then correct (both user msgs)", () => {
    const msgs = [
      makeAssistantMsg([
        { type: "text", text: "Test" },
        makeAskQuestionPart("What is 2+2?", "4", ["3", "4", "5"]),
      ]),
      makeUserMsg("My answer: 3"),
      makeUserMsg("My answer: 4"),
    ];
    expect(getActiveQuestion(msgs)).toBeNull();
  });
});

describe("isGraded", () => {
  it("returns true when correctAnswer is non-empty", () => {
    expect(isGraded({ correctAnswer: "42" } as ActiveQuestion)).toBe(true);
  });

  it("returns false when correctAnswer is empty", () => {
    expect(isGraded({ correctAnswer: "" } as ActiveQuestion)).toBe(false);
  });
});

describe("isAnswerCorrect", () => {
  it("returns true for exact match", () => {
    const q = { correctAnswer: "42" } as ActiveQuestion;
    expect(isAnswerCorrect(q, "42")).toBe(true);
  });

  it("is case-insensitive", () => {
    const q = { correctAnswer: "Paris" } as ActiveQuestion;
    expect(isAnswerCorrect(q, "paris")).toBe(true);
  });

  it("trims whitespace", () => {
    const q = { correctAnswer: "42" } as ActiveQuestion;
    expect(isAnswerCorrect(q, "  42  ")).toBe(true);
  });

  it("returns false for wrong answer", () => {
    const q = { correctAnswer: "42" } as ActiveQuestion;
    expect(isAnswerCorrect(q, "43")).toBe(false);
  });
});

describe("countAnsweredQuestions", () => {
  it("returns 0 for no messages", () => {
    expect(countAnsweredQuestions([])).toBe(0);
  });

  it("returns 0 for a question without a following user message", () => {
    const msgs = [makeAssistantMsg([makeAskQuestionPart("Q?", "a")])];
    expect(countAnsweredQuestions(msgs)).toBe(0);
  });

  it("counts a question followed by a user message", () => {
    const msgs = [
      makeAssistantMsg([makeAskQuestionPart("Q?", "a")]),
      makeUserMsg("a"),
    ];
    expect(countAnsweredQuestions(msgs)).toBe(1);
  });

  it("counts multiple answered questions", () => {
    const msgs = [
      makeAssistantMsg([makeAskQuestionPart("Q1", "a")]),
      makeUserMsg("a"),
      makeAssistantMsg([makeAskQuestionPart("Q2", "b")]),
      makeUserMsg("b"),
    ];
    expect(countAnsweredQuestions(msgs)).toBe(2);
  });

  it("does not count a question followed by a non-user assistant msg", () => {
    const msgs = [
      makeAssistantMsg([makeAskQuestionPart("Q?", "a")]),
      makeAssistantMsg([{ type: "text", text: "Hmm let me think" }]),
    ];
    expect(countAnsweredQuestions(msgs)).toBe(0);
  });
});
