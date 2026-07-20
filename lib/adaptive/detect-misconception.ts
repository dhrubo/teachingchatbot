import type { GeneratedQuestionValue } from "@/lib/questions/generate-from-archetype";
import { normaliseAnswer } from "@/lib/questions/grade-answer";

/**
 * Result of misconception detection on a single wrong answer. `code` is null
 * unless a concrete signal actually matched — a wrong answer alone is NEVER
 * enough to assert a misconception (that requires repeated, independent
 * evidence; see lib/learning-science/batch-misconception-analysis.ts). This
 * is one data point, not a diagnosis: callers should treat a non-null code as
 * "tentative" until the batch analysis promotes it.
 */
export type MisconceptionDetection = {
  code: string | null;
  /** 0-1. How confident this single-answer signal is, not the learner-level confidence. */
  confidence: number;
  reason: string;
};

/**
 * Best-effort misconception signal-matching from a single wrong answer. Pure
 * + zero LLM. Only returns a code when a concrete signal actually matches one
 * of the archetype's declared tags — it never falls back to guessing the
 * archetype's primary tag just because the answer was wrong.
 */
export function detectMisconception(params: {
  question: Pick<GeneratedQuestionValue, "correctAnswer" | "rules">;
  studentAnswer: string;
  misconceptionTags: string[];
}): MisconceptionDetection {
  const { studentAnswer, correctAnswer, misconceptionTags } = {
    studentAnswer: params.studentAnswer,
    correctAnswer: params.question.correctAnswer,
    misconceptionTags: params.misconceptionTags,
  };

  const student = normaliseAnswer(studentAnswer);
  const correct = normaliseAnswer(correctAnswer);
  if (student === "" || student === correct) {
    return { code: null, confidence: 0, reason: "answer_correct_or_empty" };
  }

  const studentNum = Number(student);
  const correctNum = Number(correct);
  const bothNumeric =
    Number.isFinite(studentNum) && Number.isFinite(correctNum);

  // Sign error: right magnitude, wrong sign.
  if (
    bothNumeric &&
    studentNum === -correctNum &&
    correctNum !== 0 &&
    misconceptionTags.includes("sign_error")
  ) {
    return { code: "sign_error", confidence: 0.8, reason: "magnitude_matches_sign_flipped" };
  }

  // Off-by-one inverse-operation slips are common in solving equations.
  if (
    bothNumeric &&
    Math.abs(studentNum - correctNum) <= 1 &&
    misconceptionTags.includes("forgot_inverse_operation")
  ) {
    return {
      code: "forgot_inverse_operation",
      confidence: 0.5,
      reason: "off_by_one_numeric",
    };
  }

  // No concrete signal matched — do NOT guess. A wrong answer alone is not
  // evidence of any specific misconception.
  return { code: null, confidence: 0, reason: "no_signal_match" };
}
