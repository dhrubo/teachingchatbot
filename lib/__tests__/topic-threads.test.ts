import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/types";
import {
  deriveTopicState,
  deriveTopicThreads,
  isGateOptions,
  summariseTopics,
  topicSlug,
} from "../topic-threads";

function msg(
  id: string,
  role: "user" | "assistant",
  parts: ChatMessage["parts"]
): ChatMessage {
  return { id, role, parts, content: "" } as ChatMessage;
}

function startTopicPart(
  topicId: string,
  title: string
): ChatMessage["parts"][number] {
  return {
    type: "tool-startNewTopicSession",
    output: { switched: true, topicId, title },
  } as unknown as ChatMessage["parts"][number];
}

function askQuestionPart(
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
      explanation: "Explanation text",
    },
  } as unknown as ChatMessage["parts"][number];
}

describe("topicSlug", () => {
  it("converts a title to a URL-safe slug", () => {
    expect(topicSlug("Fractions and Decimals")).toBe("fractions-and-decimals");
  });

  it("handles special characters", () => {
    expect(topicSlug("Pythagoras' Theorem!")).toBe("pythagoras-theorem");
  });

  it("trims whitespace", () => {
    expect(topicSlug("  Algebra  ")).toBe("algebra");
  });

  it("is deterministic", () => {
    expect(topicSlug("Probability")).toBe(topicSlug("Probability"));
  });
});

describe("isGateOptions", () => {
  it("returns true for accept-the-challenge options", () => {
    expect(
      isGateOptions([
        "Accept the challenge",
        "Read next topic",
        "Explain differently",
      ])
    ).toBe(true);
  });

  it("returns true for recovery gate options", () => {
    expect(isGateOptions(["See the explanation", "Try again"])).toBe(true);
  });

  it("returns false for normal quiz options", () => {
    expect(isGateOptions(["3", "4", "5"])).toBe(false);
  });

  it("returns false for empty options", () => {
    expect(isGateOptions([])).toBe(false);
  });
});

describe("deriveTopicThreads", () => {
  it("returns empty threads for a chat with no topic markers", () => {
    const msgs = [
      msg("1", "assistant", [{ type: "text", text: "Hello!" }]),
      msg("2", "user", [{ type: "text", text: "Hi" }]),
    ];
    const { threads, introEndIndex } = deriveTopicThreads(msgs);
    expect(threads).toHaveLength(0);
    expect(introEndIndex).toBe(msgs.length);
  });

  it("creates a thread for a single topic marker", () => {
    const msgs = [
      msg("1", "assistant", [{ type: "text", text: "Welcome" }]),
      msg("2", "assistant", [startTopicPart("fractions", "Fractions")]),
      msg("3", "assistant", [{ type: "text", text: "Let's learn fractions!" }]),
      msg("4", "user", [{ type: "text", text: "OK" }]),
    ];
    const { threads, introEndIndex } = deriveTopicThreads(msgs);
    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe("fractions");
    expect(threads[0].title).toBe("Fractions");
    // intro ends at index of the first marker (msg 2 = index 1)
    expect(introEndIndex).toBe(1);
    // thread messages: the marker, the teaching, and the user reply
    expect(threads[0].messages).toHaveLength(3);
  });

  it("creates multiple threads for multiple topic markers", () => {
    const msgs = [
      msg("1", "assistant", [startTopicPart("fractions", "Fractions")]),
      msg("2", "user", [{ type: "text", text: "Got it" }]),
      msg("3", "assistant", [startTopicPart("probability", "Probability")]),
      msg("4", "user", [{ type: "text", text: "OK" }]),
    ];
    const { threads } = deriveTopicThreads(msgs);
    expect(threads).toHaveLength(2);
    expect(threads[0].id).toBe("fractions");
    expect(threads[1].id).toBe("probability");
  });

  it("merges threads when the same topic is resumed", () => {
    const msgs = [
      msg("1", "assistant", [startTopicPart("fractions", "Fractions")]),
      msg("2", "user", [{ type: "text", text: "Done" }]),
      msg("3", "assistant", [startTopicPart("fractions", "Fractions")]), // resume
      msg("4", "user", [{ type: "text", text: "Back again" }]),
    ];
    const { threads } = deriveTopicThreads(msgs);
    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe("fractions");
    // merged: both markers + all messages after them
    expect(threads[0].messages).toHaveLength(4);
  });
});

describe("deriveTopicState", () => {
  it("returns content phase when there are no challenges", () => {
    const thread = {
      id: "t1",
      title: "Test",
      startIndex: 0,
      endIndex: 2,
      messages: [
        msg("1", "assistant", [{ type: "text", text: "Teaching" }]),
        msg("2", "user", [{ type: "text", text: "OK" }]),
      ],
    };
    const state = deriveTopicState(thread);
    expect(state.phase).toBe("content");
    expect(state.challengeTotal).toBe(0);
    expect(state.challengeDone).toBe(0);
  });

  it("returns challenge phase when a graded question is unanswered", () => {
    const thread = {
      id: "t1",
      title: "Test",
      startIndex: 0,
      endIndex: 2,
      messages: [
        msg("1", "assistant", [
          { type: "text", text: "Question time!" },
          askQuestionPart("What is 2+2?", "4", ["3", "4", "5"]),
        ]),
      ],
    };
    const state = deriveTopicState(thread);
    expect(state.phase).toBe("challenge");
    expect(state.challengeTotal).toBe(1);
    expect(state.challengeDone).toBe(0);
  });

  it("returns done phase when a graded question has been answered", () => {
    const thread = {
      id: "t1",
      title: "Test",
      startIndex: 0,
      endIndex: 2,
      messages: [
        msg("1", "assistant", [
          askQuestionPart("What is 2+2?", "4", ["3", "4", "5"]),
        ]),
        msg("2", "user", [{ type: "text", text: "My answer: 4" }]),
      ],
    };
    const state = deriveTopicState(thread);
    expect(state.phase).toBe("done");
    expect(state.challengeTotal).toBe(1);
    expect(state.challengeDone).toBe(1);
  });

  it("counts non-graded questions (no correctAnswer) as zero challenges", () => {
    const thread = {
      id: "t1",
      title: "Test",
      startIndex: 0,
      endIndex: 2,
      messages: [
        msg("1", "assistant", [
          askQuestionPart("What's your name?"), // no correctAnswer
        ]),
      ],
    };
    const state = deriveTopicState(thread);
    expect(state.challengeTotal).toBe(0);
    expect(state.phase).toBe("content");
  });
});

describe("summariseTopics", () => {
  it("returns empty for a chat with no topics", () => {
    const msgs = [msg("1", "user", [{ type: "text", text: "Hi" }])];
    expect(summariseTopics(msgs)).toHaveLength(0);
  });

  it("summarises a chat with one topic", () => {
    const msgs = [
      msg("1", "assistant", [startTopicPart("fractions", "Fractions")]),
      msg("2", "user", [{ type: "text", text: "Start" }]),
    ];
    const summary = summariseTopics(msgs);
    expect(summary).toHaveLength(1);
    expect(summary[0].title).toBe("Fractions");
    expect(summary[0].id).toBe("fractions");
    expect(summary[0].status).toBe("in-progress");
  });

  it("marks a topic with all challenges answered as done", () => {
    const msgs = [
      msg("1", "assistant", [startTopicPart("fractions", "Fractions")]),
      msg("2", "assistant", [
        askQuestionPart("What is 1/2 + 1/2?", "1", ["1", "2", "3/4"]),
      ]),
      msg("3", "user", [{ type: "text", text: "My answer: 1" }]),
    ];
    const summary = summariseTopics(msgs);
    expect(summary[0].status).toBe("done");
    expect(summary[0].challengeTotal).toBe(1);
    expect(summary[0].challengeDone).toBe(1);
  });
});
