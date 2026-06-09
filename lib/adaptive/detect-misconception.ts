import type { GeneratedQuestionValue } from "@/lib/questions/generate-from-archetype";
import { normaliseAnswer } from "@/lib/questions/grade-answer";

/**
 * Best-effort misconception tagging from a wrong answer. Pure + zero LLM.
 *
 * We use the archetype's declared misconceptionTags plus a few generic signal
 * checks. The returned tag (if any) is stored on the attempt so the reteach flow
 * and parent reports can target the specific error.
 */
export function detectMisconception(params: {
  question: Pick<GeneratedQuestionValue, "correctAnswer" | "rules">;
  studentAnswer: string;
  misconceptionTags: string[];
}): string | null {
  const { studentAnswer, correctAnswer, misconceptionTags } = {
    studentAnswer: params.studentAnswer,
    correctAnswer: params.question.correctAnswer,
    misconceptionTags: params.misconceptionTags,
  };

  const student = normaliseAnswer(studentAnswer);
  const correct = normaliseAnswer(correctAnswer);
  if (student === "" || student === correct) {
    return null;
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
    return "sign_error";
  }

  // Off-by-one inverse-operation slips are common in solving equations.
  if (
    bothNumeric &&
    Math.abs(studentNum - correctNum) <= 1 &&
    misconceptionTags.includes("forgot_inverse_operation")
  ) {
    return "forgot_inverse_operation";
  }

  // Default: surface the archetype's primary declared misconception, if any.
  return misconceptionTags[0] ?? null;
}
