import { getActiveQuestion } from "./active-question";
import type { ChatMessage } from "./types";

// ---------------------------------------------------------------------------
// Topic threads
//
// A single chat now holds several "topic threads" (sub-conversations). Topic
// boundaries are PERSISTED, not transient: the startNewTopicSession tool writes
// a marker into its tool output, which is saved verbatim in message.parts and
// reloaded from the DB. So topic association is always rederivable from the
// message list alone — it survives a page refresh with no schema change.
//
// Phases within a topic are likewise derived from the persisted askQuestion
// "gate" (a non-graded question whose options include "Accept the challenge")
// and from graded challenge questions.
// ---------------------------------------------------------------------------

export type TopicPhase =
  | "content" // teaching shown, gate not yet posed
  | "awaiting-accept" // gate posed (Accept / Read next / Explain differently)
  | "challenge" // a graded challenge is open
  | "awaiting-recovery" // wrong answer; recovery gate posed (See explanation / …)
  | "done"; // topic finished (challenge cleared)

export type TopicStatus = "not-started" | "in-progress" | "done";

export type TopicSummary = {
  id: string;
  title: string;
  status: TopicStatus;
  challengeTotal: number;
  challengeDone: number;
  /** Index of the first message belonging to this topic. */
  startIndex: number;
};

export type TopicMarkerOutput = {
  switched?: boolean;
  topicId: string;
  title: string;
  // legacy field kept for older outputs that only carried `topic`
  topic?: string;
};

const GATE_MARKER = "accept the challenge";
// The wrong-answer recovery gate is keyed off its first option's wording.
const RECOVERY_MARKER = "see the explanation";

// True when a set of askQuestion options is a control gate (Accept-the-challenge
// or the wrong-answer recovery gate) rather than a real question to answer.
// Such gates are rendered as buttons, NOT in the answer form.
export function isGateOptions(options: string[]): boolean {
  return options.some((o) => {
    const lower = o.toLowerCase();
    return lower.includes(GATE_MARKER) || lower.includes(RECOVERY_MARKER);
  });
}

// Deterministic slug so the same title always maps to the same topic id,
// which keeps topic identity stable across reloads.
export function topicSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type AskQuestionOutput = {
  prompt: string;
  type: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type Part = ChatMessage["parts"][number];

function partOutput<T>(part: Part): T | null {
  if ("output" in part && (part as { output?: unknown }).output) {
    return (part as { output: T }).output;
  }
  return null;
}

function readMarker(part: Part): { id: string; title: string } | null {
  if (part.type !== "tool-startNewTopicSession") {
    return null;
  }
  const out = partOutput<TopicMarkerOutput>(part);
  if (!out) {
    return null;
  }
  const title = out.title ?? out.topic ?? "";
  if (!title) {
    return null;
  }
  return { id: out.topicId || topicSlug(title), title };
}

function isGatePart(part: Part): boolean {
  if (part.type !== "tool-askQuestion") {
    return false;
  }
  const out = partOutput<AskQuestionOutput>(part);
  if (!out) {
    return false;
  }
  return (out.options ?? []).some((o) => o.toLowerCase().includes(GATE_MARKER));
}

function isRecoveryGatePart(part: Part): boolean {
  if (part.type !== "tool-askQuestion") {
    return false;
  }
  const out = partOutput<AskQuestionOutput>(part);
  if (!out) {
    return false;
  }
  return (out.options ?? []).some((o) =>
    o.toLowerCase().includes(RECOVERY_MARKER)
  );
}

function isGradedChallengePart(part: Part): boolean {
  if (part.type !== "tool-askQuestion") {
    return false;
  }
  const out = partOutput<AskQuestionOutput>(part);
  return Boolean(out?.correctAnswer?.trim().length);
}

// One topic thread, with the slice of messages that belong to it.
export type TopicThread = {
  id: string;
  title: string;
  startIndex: number;
  endIndex: number; // exclusive
  messages: ChatMessage[];
};

// Scan messages in order; every message belongs to the topic of the most
// recent preceding marker. Messages before the first marker (greeting, the
// initial chunking exchange, etc.) belong to no topic and are kept in an
// implicit "intro" bucket the UI shows when no topic is selected.
export function deriveTopicThreads(messages: ChatMessage[]): {
  threads: TopicThread[];
  introEndIndex: number; // messages[0..introEndIndex) belong to no topic
} {
  const threads: TopicThread[] = [];
  let introEndIndex = messages.length;

  messages.forEach((message, index) => {
    for (const part of message.parts ?? []) {
      const marker = readMarker(part);
      if (marker) {
        if (threads.length === 0) {
          introEndIndex = index;
        }
        // Close the previous thread.
        const prev = threads.at(-1);
        if (prev) {
          prev.endIndex = index;
          prev.messages = messages.slice(prev.startIndex, index);
        }
        // A re-emitted marker for an existing topic (resume) extends that
        // topic rather than creating a duplicate entry.
        threads.push({
          id: marker.id,
          title: marker.title,
          startIndex: index,
          endIndex: messages.length,
          messages: [],
        });
      }
    }
  });

  const last = threads.at(-1);
  if (last) {
    last.endIndex = messages.length;
    last.messages = messages.slice(last.startIndex);
  }

  // Merge threads that share an id (resume re-emits the same marker) so the
  // summary lists each topic once, in first-seen order.
  const byId = new Map<string, TopicThread>();
  for (const t of threads) {
    const existing = byId.get(t.id);
    if (existing) {
      existing.messages = [...existing.messages, ...t.messages];
      existing.endIndex = t.endIndex;
    } else {
      byId.set(t.id, { ...t });
    }
  }

  return { threads: [...byId.values()], introEndIndex };
}

// Derive the phase + challenge tallies for a single topic thread.
export function deriveTopicState(thread: TopicThread): {
  phase: TopicPhase;
  challengeTotal: number;
  challengeDone: number;
} {
  let challengeTotal = 0;
  let challengeDone = 0;
  let sawGate = false;

  // Track whether the most recent gate-type question (still unanswered) is a
  // recovery gate, so a wrong answer surfaces the recovery buttons.
  let openRecoveryGate = false;

  thread.messages.forEach((message, i) => {
    const followedByUser = thread.messages
      .slice(i + 1)
      .some((m) => m.role === "user");
    for (const part of message.parts ?? []) {
      if (isGatePart(part)) {
        sawGate = true;
      }
      if (isRecoveryGatePart(part)) {
        // Unanswered recovery gate → recovery phase; answered → cleared.
        openRecoveryGate = !followedByUser;
      } else if (isGatePart(part) || isGradedChallengePart(part)) {
        // A newer accept-gate or graded challenge supersedes a recovery gate.
        openRecoveryGate = false;
      }
      if (isGradedChallengePart(part)) {
        challengeTotal += 1;
        // A challenge is "done" if a user message follows it in this thread.
        if (followedByUser) {
          challengeDone += 1;
        }
      }
    }
  });

  // An open graded challenge (no user reply after it) means challenge phase.
  const active = getActiveQuestion(thread.messages);
  const hasOpenChallenge = Boolean(active?.correctAnswer.trim());

  let phase: TopicPhase;
  if (hasOpenChallenge) {
    phase = "challenge";
  } else if (openRecoveryGate) {
    // A wrong answer was given and the recovery gate is awaiting a choice.
    phase = "awaiting-recovery";
  } else if (challengeTotal > 0 && challengeDone >= challengeTotal) {
    phase = "done";
  } else if (sawGate) {
    phase = "awaiting-accept";
  } else {
    phase = "content";
  }

  return { phase, challengeTotal, challengeDone };
}

export function summariseTopics(messages: ChatMessage[]): TopicSummary[] {
  const { threads } = deriveTopicThreads(messages);
  return threads.map((thread) => {
    const { phase, challengeTotal, challengeDone } = deriveTopicState(thread);
    const status: TopicStatus =
      phase === "done"
        ? "done"
        : thread.messages.length > 1
          ? "in-progress"
          : "not-started";
    return {
      id: thread.id,
      title: thread.title,
      status,
      challengeTotal,
      challengeDone,
      startIndex: thread.startIndex,
    };
  });
}
