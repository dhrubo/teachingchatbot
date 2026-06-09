import { gcd } from "./answer-helpers";

export type AnswerRules = {
  numeric?: boolean;
  tolerance?: number;
  caseInsensitive?: boolean;
  normaliseAlgebra?: boolean;
  fraction?: boolean;
  ratio?: boolean;
  allowPercentSymbol?: boolean;
  allowCurrency?: boolean;
  options?: string[];
};

// Strip whitespace, currency/percent/degree symbols, normalise operators.
export function normaliseAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/£/g, "")
    .replace(/\$/g, "")
    .replace(/°/g, "")
    .replace(/%/g, "");
}

function parseFraction(value: string): [number, number] | null {
  const cleaned = value.trim().replace(/\s+/g, "");
  if (cleaned.includes("/")) {
    const [n, d] = cleaned.split("/");
    const num = Number(n);
    const den = Number(d);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return [num, den];
    }
    return null;
  }
  const num = Number(cleaned);
  if (Number.isFinite(num)) {
    // Whole number is a fraction over 1.
    return Number.isInteger(num) ? [num, 1] : null;
  }
  return null;
}

function fractionsEqual(a: string, b: string): boolean {
  const fa = parseFraction(a);
  const fb = parseFraction(b);
  if (!(fa && fb)) {
    return false;
  }
  // Cross-multiply to compare without floating point.
  return fa[0] * fb[1] === fb[0] * fa[1];
}

function parseRatio(value: string): number[] | null {
  const parts = value.trim().replace(/\s+/g, "").split(":");
  if (parts.length < 2) {
    return null;
  }
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) {
    return null;
  }
  return nums;
}

function simplifyRatioParts(parts: number[]): number[] {
  const divisor = parts.reduce((acc, n) => gcd(acc, n), parts[0]);
  return parts.map((n) => n / (divisor || 1));
}

function ratiosEqual(a: string, b: string): boolean {
  const ra = parseRatio(a);
  const rb = parseRatio(b);
  if (!(ra && rb) || ra.length !== rb.length) {
    return false;
  }
  const sa = simplifyRatioParts(ra);
  const sb = simplifyRatioParts(rb);
  return sa.every((n, i) => n === sb[i]);
}

// Normalise simple linear algebraic expressions: order terms, drop "1" coeffs,
// collapse spacing. Good enough for "2x+3" vs "3 + 2x".
export function normaliseAlgebraic(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/(^|[+-])1([a-z])/g, "$1$2"); // 1x -> x
  // Split into signed terms and sort for order-independence.
  const terms = cleaned.replace(/-/g, "+-").split("+").filter(Boolean).sort();
  return terms.join("+");
}

export function gradeAnswer(params: {
  studentAnswer: string;
  correctAnswer: string;
  rules?: AnswerRules;
}): boolean {
  const { studentAnswer, correctAnswer } = params;
  const rules = params.rules ?? {};

  if (studentAnswer.trim() === "") {
    return false;
  }

  if (rules.fraction && fractionsEqual(studentAnswer, correctAnswer)) {
    return true;
  }

  if (rules.ratio && ratiosEqual(studentAnswer, correctAnswer)) {
    return true;
  }

  if (rules.numeric) {
    const student = Number(normaliseAnswer(studentAnswer));
    const correct = Number(normaliseAnswer(correctAnswer));
    const tolerance = rules.tolerance ?? 0;
    return (
      Number.isFinite(student) &&
      Number.isFinite(correct) &&
      Math.abs(student - correct) <= tolerance
    );
  }

  if (rules.normaliseAlgebra) {
    return (
      normaliseAlgebraic(studentAnswer) === normaliseAlgebraic(correctAnswer)
    );
  }

  return normaliseAnswer(studentAnswer) === normaliseAnswer(correctAnswer);
}
