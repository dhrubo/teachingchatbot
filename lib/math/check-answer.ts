import { Parser } from "expr-eval";
import { parseSpokenMaths } from "@/lib/voice/spoken-maths";

const parser = new Parser({
  operators: {
    logical: false,
    comparison: false,
  },
});

export type MathAnswerCheckResult = {
  isCorrect: boolean;
  normalizedLearnerAnswer: string;
  needsClarification: boolean;
  clarificationPrompt?: string;
  roundingHint?: string;
};

function stripFormatting(raw: string): string {
  let cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[£$€,\s]/g, "")
    .replace(/^(?:[a-z]=)/, "")
    .replace(/\.$/, "");

  // Spoken "2 to 3" ratio normalization -> "2:3"
  cleaned = cleaned.replace(/^(\d+(?:\.\d+)?)to(\d+(?:\.\d+)?)$/, "$1:$2");
  // Mixed fraction like "1 3/4" (before spaces stripped) handled separately below
  return cleaned;
}

function parseNumericValue(raw: string): number | null {
  const trimmed = raw
    .trim()
    .toLowerCase()
    .replace(/[£$€,]/g, "")
    .replace(/^(?:[a-z]\s*=\s*)/, "")
    .replace(/\b(?:pounds|pound|cm|mm|m|km|kg|g|seconds|s|degrees|°)\b/g, "")
    .trim();

  if (!trimmed) {
    return null;
  }

  // Percentage e.g. "15%" -> 15 (we compare raw numbers, and also handle 0.15 vs 15% explicitly)
  if (trimmed.endsWith("%")) {
    const num = Number(trimmed.slice(0, -1).trim());
    return Number.isFinite(num) ? num : null;
  }

  // Mixed number e.g. "1 3/4" or "2 and 1/2"
  const mixedMatch = trimmed.match(/^(-?\d+)\s+(?:and\s+)?(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (den !== 0) {
      const sign = whole < 0 ? -1 : 1;
      return whole + sign * (num / den);
    }
  }

  // Safe arithmetic/fraction expression e.g. "19/20", "3/4", "1000 * 1.05^3"
  if (/^[0-9+\-*/^().\s]+$/.test(trimmed)) {
    try {
      const val = parser.evaluate(trimmed);
      if (typeof val === "number" && Number.isFinite(val)) {
        return val;
      }
    } catch {
      return null;
    }
  }

  const direct = Number(trimmed);
  return Number.isFinite(direct) ? direct : null;
}

function candidateMatchesTarget(
  candidateStr: string,
  targetStr: string
): { exact: boolean; unroundedMatch: boolean } {
  const cleanCandidate = stripFormatting(candidateStr);
  const cleanTarget = stripFormatting(targetStr);

  if (cleanCandidate === cleanTarget) {
    return { exact: true, unroundedMatch: false };
  }

  const candNum = parseNumericValue(candidateStr);
  const targetNum = parseNumericValue(targetStr);

  if (candNum !== null && targetNum !== null) {
    const diff = Math.abs(candNum - targetNum);
    if (diff <= 1e-4) {
      return { exact: true, unroundedMatch: false };
    }
    // Money / 2 d.p. rounding check: e.g. student gave 1157.625 instead of 1157.63
    if (diff <= 0.015) {
      return { exact: false, unroundedMatch: true };
    }
  }

  return { exact: false, unroundedMatch: false };
}

/**
 * Deterministic GCSE Maths answer evaluator.
 * Handles typed maths, spoken transcripts ("three quarters", "one thousand one hundred..."),
 * fractions/decimals, currency/units, ratios, and spoken-maths ambiguities without calling an LLM.
 */
export function checkMathAnswer(input: {
  learnerInput: string;
  canonicalAnswer: string;
  acceptedVariants?: string[];
}): MathAnswerCheckResult {
  const spoken = parseSpokenMaths(input.learnerInput);

  if (spoken.ambiguityReason && spoken.candidates.length > 1) {
    const options = spoken.candidates
      .slice(0, 2)
      .map((c) => c.value)
      .join(" or ");
    return {
      isCorrect: false,
      normalizedLearnerAnswer:
        spoken.candidates[0]?.value ?? input.learnerInput,
      needsClarification: true,
      clarificationPrompt: `Just checking what you meant — did you mean ${options}?`,
    };
  }

  const allTargets = [input.canonicalAnswer, ...(input.acceptedVariants ?? [])];
  const learnerCandidates = [
    input.learnerInput,
    ...spoken.candidates.map((c) => c.value),
  ];

  let sawRoundingNearMiss = false;

  for (const candidate of learnerCandidates) {
    for (const target of allTargets) {
      const match = candidateMatchesTarget(candidate, target);
      if (match.exact) {
        return {
          isCorrect: true,
          normalizedLearnerAnswer:
            spoken.candidates[0]?.value ?? input.learnerInput.trim(),
          needsClarification: false,
        };
      }
      if (match.unroundedMatch) {
        sawRoundingNearMiss = true;
      }
    }
  }

  if (sawRoundingNearMiss) {
    return {
      isCorrect: false,
      normalizedLearnerAnswer:
        spoken.candidates[0]?.value ?? input.learnerInput.trim(),
      needsClarification: false,
      roundingHint:
        "Your method is spot on — check your final rounding (for money, Edexcel expects 2 decimal places).",
    };
  }

  return {
    isCorrect: false,
    normalizedLearnerAnswer:
      spoken.candidates[0]?.value ?? input.learnerInput.trim(),
    needsClarification: false,
  };
}

/**
 * Scrubs raw LaTeX / symbols out of spokenText so TTS never reads "backslash frac"
 * or "caret" aloud if an LLM slips markdown into spokenText.
 */
export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/\$\$?([^$]+)\$\$?/g, "$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2")
    .replace(/\\times/g, " times ")
    .replace(/\\div/g, " divided by ")
    .replace(/\\sqrt\{([^}]+)\}/g, "the square root of $1")
    .replace(/\^2\b/g, " squared")
    .replace(/\^3\b/g, " cubed")
    .replace(/\^(\d+)/g, " to the power of $1")
    .replace(/£(\d+(?:\.\d+)?)/g, "$1 pounds")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
