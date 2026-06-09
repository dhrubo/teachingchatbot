import type { ChatMessage } from "./types";

export type ActiveQuestion = {
  id: string; // the toolCallId — used to know which question is being answered
  prompt: string;
  type: "multiple_choice" | "select" | "text";
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type AskQuestionOutput = {
  prompt: string;
  type: "multiple_choice" | "select" | "text";
  options: string[];
  correctAnswer: string;
  explanation: string;
};

// Find the most recent askQuestion tool call across the conversation.
// We treat a question as "open" if it is the last askQuestion in the thread
// and no user message has been sent after it.
export function getActiveQuestion(
  messages: ChatMessage[]
): ActiveQuestion | null {
  let lastQuestion: ActiveQuestion | null = null;
  let lastQuestionIndex = -1;

  messages.forEach((message, index) => {
    for (const part of message.parts ?? []) {
      if (part.type === "tool-askQuestion" && "output" in part && part.output) {
        const out = part.output as AskQuestionOutput;
        const toolCallId = (part as { toolCallId?: string }).toolCallId ?? "";
        lastQuestion = {
          id: toolCallId,
          prompt: out.prompt,
          type: out.type,
          options: out.options ?? [],
          correctAnswer: out.correctAnswer ?? "",
          explanation: out.explanation ?? "",
        };
        lastQuestionIndex = index;
      }
    }
  });

  if (!lastQuestion) {
    return null;
  }

  // If the student already replied after the question, it's no longer active.
  const answeredAfter = messages
    .slice(lastQuestionIndex + 1)
    .some((m) => m.role === "user");

  return answeredAfter ? null : lastQuestion;
}

// A question is "graded" only if it has a correct answer to check against.
// Non-graded prompts (name, topic choice, continue-or-switch) just collect input.
export function isGraded(question: ActiveQuestion): boolean {
  return question.correctAnswer.trim().length > 0;
}

export function isAnswerCorrect(
  question: ActiveQuestion,
  answer: string
): boolean {
  return (
    answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
  );
}

// How many askQuestion prompts have been answered, i.e. a question followed
// by at least one user message. Used for the "questions answered" tally.
export function countAnsweredQuestions(messages: ChatMessage[]): number {
  let answered = 0;
  messages.forEach((message, index) => {
    const hasQuestion = (message.parts ?? []).some(
      (p) => p.type === "tool-askQuestion" && "output" in p && p.output
    );
    if (
      hasQuestion &&
      messages.slice(index + 1).some((m) => m.role === "user")
    ) {
      answered += 1;
    }
  });
  return answered;
}
