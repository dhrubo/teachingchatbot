export type HomeworkGuardResult = {
  blocked: boolean;
  reason?: "direct_answer_demand" | "solve_for_me" | "multi_question_worksheet";
  socraticRedirectSpoken: string;
  socraticRedirectDisplay: string;
  followUpQuestion: string;
};

const DIRECT_ANSWER_PATTERNS: readonly RegExp[] = [
  /\b(?:just|only|simply)\s+(?:give|tell|show|say)\s+(?:me\s+)?the\s+(?:final\s+)?answer\b/i,
  /\btell\s+me\s+the\s+(?:final\s+|exact\s+|right\s+|correct\s+)?answer\b/i,
  /\bgive\s+me\s+the\s+(?:final\s+|exact\s+|right\s+|correct\s+)?answer\b/i,
  /\bwhat(?:'s|\s+is)\s+the\s+(?:final\s+)?answer\s+(?:to|for)\b/i,
  /\bdo\s+(?:my|this)\s+(?:maths\s+)?homework\b/i,
  /\b(?:no|without|skip)\s+(?:the\s+)?(?:steps|explanation|working)[,\s]+(?:just|give)\b/i,
  /\bfinish\s+my\s+(?:worksheet|homework|quiz|test)\b/i,
];

const SOLVE_FOR_ME_PATTERNS: readonly RegExp[] = [
  /\b(?:solve|calculate|work\s+out|compute|evaluate)\b.{1,80}\bfor\s+me\b/i,
  /\bsolve\s*:\s*[0-9a-z()+\-*/^=\s]{4,}/i,
];

function looksLikePastedWorksheet(text: string): boolean {
  const numberedItems = text.match(/(?:^|\n|\s)(?:q?\d+[).:]|\([a-d]\))\s+/gi);
  if (numberedItems && numberedItems.length >= 3) {
    return true;
  }
  const nonEmptyLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return nonEmptyLines.length >= 4 && text.length > 220;
}

export function detectAnswerSeeking(
  message: string,
  topicTitle = "this topic"
): HomeworkGuardResult {
  const trimmed = message.trim();
  if (trimmed.length < 8) {
    return {
      blocked: false,
      socraticRedirectSpoken: "",
      socraticRedirectDisplay: "",
      followUpQuestion: "",
    };
  }

  for (const pattern of DIRECT_ANSWER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        blocked: true,
        reason: "direct_answer_demand",
        socraticRedirectSpoken: `I can't hand over final answers directly — my job is to help you master ${topicTitle} yourself! Tell me what your very first step would be, and we will work through it together.`,
        socraticRedirectDisplay: `Anti-Cheat Tutor Guard: Direct answers are locked so you build real GCSE mastery on ${topicTitle}. Share your first working step and I will guide you from there.`,
        followUpQuestion:
          "Which formula, multiplier, or operation do you think comes first here?",
      };
    }
  }

  for (const pattern of SOLVE_FOR_ME_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        blocked: true,
        reason: "solve_for_me",
        socraticRedirectSpoken: `Let's tackle that together without me spoiling the final number! What have you tried for the first step so far?`,
        socraticRedirectDisplay:
          "Anti-Cheat Tutor Guard: I won't solve homework equations end-to-end for you, but I'll gladly check your first step!",
        followUpQuestion:
          "Write or say your first line of working, and I will tell you if your setup is on track.",
      };
    }
  }

  if (looksLikePastedWorksheet(trimmed)) {
    return {
      blocked: true,
      reason: "multi_question_worksheet",
      socraticRedirectSpoken:
        "It looks like you pasted a whole worksheet! Pick just one question, tell me what you think the first step is, and I will coach you through the method.",
      socraticRedirectDisplay:
        "Anti-Cheat Tutor Guard: Multi-question worksheets can't be solved in bulk. Choose one question and share your first step.",
      followUpQuestion:
        "Which single question would you like to understand first, and what is your opening step?",
    };
  }

  return {
    blocked: false,
    socraticRedirectSpoken: "",
    socraticRedirectDisplay: "",
    followUpQuestion: "",
  };
}
