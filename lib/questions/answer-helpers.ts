// Deterministic maths helpers made available to archetype answerExpression /
// hint / explanation strings. These run with ZERO LLM calls.

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** Simplify a fraction `num/den` to "num/den" in lowest terms (e.g. 2/4 -> "1/2"). */
export function simplifyFraction(num: number, den: number): string {
  if (den === 0) {
    return "0";
  }
  const sign = num * den < 0 ? -1 : 1;
  const n = Math.abs(num);
  const d = Math.abs(den);
  const g = gcd(n, d);
  const sn = (sign * n) / g;
  const sd = d / g;
  if (sd === 1) {
    return `${sn}`;
  }
  return `${sn}/${sd}`;
}

/** Simplify a ratio `a:b` to lowest terms (e.g. 6:4 -> "3:2"). */
export function simplifyRatio(a: number, b: number): string {
  const g = gcd(a, b);
  return `${a / g}:${b / g}`;
}

/** Convert a terminating decimal to a simplified fraction string (e.g. 0.25 -> "1/4"). */
export function simplifyDecimalToFraction(decimal: number): string {
  const str = `${decimal}`;
  const dp = str.includes(".") ? str.split(".")[1].length : 0;
  const den = 10 ** dp;
  const num = Math.round(decimal * den);
  return simplifyFraction(num, den);
}

/** Round to a sensible number of decimal places, dropping trailing zeros. */
export function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Round to 2 decimal places. */
export function round2(value: number): number {
  return round(value, 2);
}

export const ANSWER_HELPERS = {
  gcd,
  simplifyFraction,
  simplifyRatio,
  simplifyDecimalToFraction,
  round,
  round2,
  Math,
} as const;
