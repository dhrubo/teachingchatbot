// Deterministic (no LLM, no I/O) normaliser for spoken-maths transcripts.
// Runs AFTER a speech-to-text call, turning what a student said into
// candidate answer string(s) the app's existing deterministic grader can
// compare against a canonical answer. Every transform here is a fixed rule
// over words — nothing in this file calls a model, the network, or the DB.
//
// Some transcripts genuinely support more than one plausible maths reading
// (e.g. "negative three squared" could mean -3^2 or (-3)^2). Rather than
// silently guessing, parseSpokenMaths returns multiple ranked candidates
// with a machine-readable ambiguityReason so the caller can ask the student
// to confirm instead of grading the wrong reading.

export type SpokenMathsCandidate = { value: string; confidence: number };

export type SpokenMathsParseResult = {
  raw: string; // the original transcript, untouched
  candidates: SpokenMathsCandidate[]; // ranked, highest confidence first, length >= 1
  ambiguityReason: string | null;
  requiresConfirmation: boolean; // true whenever ambiguityReason is set, or confidence is low
};

const ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

// Single-digit cardinal words — used both for "point five" digit-by-digit
// decimal reading, and for the "one four" digit-string-vs-fraction ambiguity
// check (which only makes sense for single spoken digits, not e.g. "twelve").
const SINGLE_DIGIT_WORDS = new Set([
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
]);

// Denominator nouns for spoken fractions — singular and plural map to the
// same denominator ("quarter"/"quarters" -> 4).
const FRACTION_DENOMINATORS: Record<string, number> = {
  half: 2,
  halves: 2,
  third: 3,
  thirds: 3,
  quarter: 4,
  quarters: 4,
  fifth: 5,
  fifths: 5,
  sixth: 6,
  sixths: 6,
  seventh: 7,
  sevenths: 7,
  eighth: 8,
  eighths: 8,
  ninth: 9,
  ninths: 9,
  tenth: 10,
  tenths: 10,
};

// Phonetic spellings an STT engine commonly produces for a spoken
// multiple-choice letter ("option bee" -> "B"). Scoped to A-F, which covers
// this app's multiple-choice question sizes.
const OPTION_LETTER_WORDS: Record<string, string> = {
  a: "A",
  ay: "A",
  eh: "A",
  b: "B",
  bee: "B",
  be: "B",
  c: "C",
  see: "C",
  sea: "C",
  d: "D",
  dee: "D",
  e: "E",
  ee: "E",
  f: "F",
  eff: "F",
};

// Multi-word filler phrases stripped before tokenising. Longer/more-specific
// phrases are listed before the shorter ones they contain, so e.g. "i think
// it's" doesn't get partially matched and leave a dangling "it's".
const FILLER_PHRASES: RegExp[] = [
  /\bi think the answer is\b/g,
  /\bi think it'?s\b/g,
  /\bmy answer is\b/g,
  /\bthe answer is\b/g,
  /\bthe answer'?s\b/g,
  /\bit is\b/g,
  /\bit'?s\b/g,
  /\bthat is\b/g,
  /\bthat'?s\b/g,
];

// Standalone filler interjections, removed wherever they occur.
const FILLER_WORDS = /\b(?:um+|uh+|erm+|er)\b/g;

/** Lowercases, strips filler phrases/words and bracket cues, collapses whitespace. */
function clean(transcript: string): string {
  let text = transcript.toLowerCase();
  for (const pattern of FILLER_PHRASES) {
    text = text.replace(pattern, " ");
  }
  text = text.replace(FILLER_WORDS, " ");
  // Bracket cues -> literal brackets, spaced so they tokenise as their own words.
  text = text.replace(/\bopen (?:bracket|parenthesis|parentheses)\b/g, " ( ");
  text = text.replace(/\bclose (?:bracket|parenthesis|parentheses)\b/g, " ) ");
  // Strip punctuation an STT layer sometimes emits around filler phrases.
  text = text.replace(/[,.]/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

type NumberRun = { value: number; consumed: number };

// Greedily consumes a run of cardinal-number-word tokens starting at index i.
// "and" is only swallowed as hundreds glue ("three hundred and twenty five"),
// never between two otherwise-unrelated numbers, so "four and five" doesn't
// get misread as a single combined number.
function consumeNumberWords(tokens: string[], start: number): NumberRun | null {
  let total = 0;
  let matchedAny = false;
  let hadHundred = false;
  let j = start;
  while (j < tokens.length) {
    const t = tokens[j];
    if (
      t === "and" &&
      hadHundred &&
      j + 1 < tokens.length &&
      (Object.hasOwn(ONES, tokens[j + 1]) || Object.hasOwn(TENS, tokens[j + 1]))
    ) {
      j++;
      continue;
    }
    if (t === "hundred") {
      total = (matchedAny ? total : 1) * 100;
      matchedAny = true;
      hadHundred = true;
      j++;
      continue;
    }
    if (Object.hasOwn(ONES, t)) {
      total += ONES[t];
      matchedAny = true;
      j++;
      continue;
    }
    if (Object.hasOwn(TENS, t)) {
      total += TENS[t];
      matchedAny = true;
      j++;
      continue;
    }
    break;
  }
  return matchedAny ? { value: total, consumed: j - start } : null;
}

/**
 * Parses a whole cardinal-number phrase (optionally signed) into an integer,
 * e.g. "twenty five" -> 25, "negative three" -> -3. Returns null if any part
 * of the phrase isn't a recognised number word.
 */
export function wordsToNumber(phrase: string): number | null {
  const tokens = phrase.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }
  let sign = 1;
  let start = 0;
  if (tokens[0] === "negative" || tokens[0] === "minus") {
    sign = -1;
    start = 1;
  }
  if (start >= tokens.length) {
    return null;
  }
  const run = consumeNumberWords(tokens, start);
  // Require the WHOLE remaining phrase to be consumed — a trailing
  // unrecognised word (e.g. "three squared") means this isn't a bare number.
  if (!run || run.consumed !== tokens.length - start) {
    return null;
  }
  return sign * run.value;
}

/**
 * Core deterministic pipeline: turns a cleaned (lowercase, filler-stripped)
 * transcript into a single best-effort maths expression, plus a confidence
 * that drops for every token this pipeline couldn't map to a known rule.
 * Reused both as the top-level fallback and to normalise the sub-phrases
 * inside the ambiguity detectors below (e.g. "two x" -> "2x").
 */
function normalizeGeneric(cleaned: string): {
  expression: string;
  confidence: number;
} {
  const tokens = cleaned.split(" ").filter(Boolean);
  const out: string[] = [];
  let unresolved = 0;
  let i = 0;

  const lastOut = () => out.at(-1) ?? "";
  const lastIsNumberLike = () => /^-?\d+(\.\d+)?$/.test(lastOut());

  while (i < tokens.length) {
    const t = tokens[i];

    // Mixed number: "<int> and a half" -> "<int> 1/2".
    if (
      t === "and" &&
      tokens[i + 1] === "a" &&
      tokens[i + 2] === "half" &&
      lastIsNumberLike()
    ) {
      out.push("1/2");
      i += 3;
      continue;
    }

    if (t === "negative" || t === "minus") {
      const prevTok = lastOut();
      const isBinary =
        prevTok !== "" && !["+", "-", "*", "/", "=", "("].includes(prevTok);
      const run = consumeNumberWords(tokens, i + 1);
      if (run) {
        const numStr = String(run.value);
        out.push(isBinary ? "-" : `-${numStr}`);
        if (isBinary) {
          out.push(numStr);
        }
        i += 1 + run.consumed;
        continue;
      }
      out.push("-");
      i++;
      continue;
    }

    if (t === "(" || t === ")") {
      out.push(t);
      i++;
      continue;
    }

    if (t === "plus") {
      out.push("+");
      i++;
      continue;
    }

    if (t === "equals") {
      out.push("=");
      i++;
      continue;
    }
    if (t === "equal" && tokens[i + 1] === "to") {
      out.push("=");
      i += 2;
      continue;
    }

    if (t === "times") {
      out.push("*");
      i++;
      continue;
    }
    if (t === "multiplied" && tokens[i + 1] === "by") {
      out.push("*");
      i += 2;
      continue;
    }

    if (t === "divided" && tokens[i + 1] === "by") {
      out.push("/");
      i += 2;
      continue;
    }
    if (t === "over") {
      out.push("/");
      i++;
      continue;
    }

    if (t === "point") {
      // Digits after "point" are read one word per digit, e.g.
      // "point one four" -> ".14" (NOT the number "fourteen").
      let j = i + 1;
      let digits = "";
      while (j < tokens.length && SINGLE_DIGIT_WORDS.has(tokens[j])) {
        digits += String(ONES[tokens[j]]);
        j++;
      }
      if (digits) {
        if (lastIsNumberLike()) {
          out[out.length - 1] = `${lastOut()}.${digits}`;
        } else {
          out.push(`0.${digits}`);
        }
        i = j;
        continue;
      }
      unresolved++;
      out.push(t);
      i++;
      continue;
    }

    if (t === "percent") {
      if (lastIsNumberLike()) {
        out[out.length - 1] = `${lastOut()}%`;
      } else {
        unresolved++;
        out.push("%");
      }
      i++;
      continue;
    }

    if (t === "squared" || t === "cubed") {
      const exp = t === "squared" ? "2" : "3";
      if (lastIsNumberLike() || lastOut() === "x" || lastOut() === "y") {
        out[out.length - 1] = `${lastOut()}^${exp}`;
      } else {
        unresolved++;
        out.push(`^${exp}`);
      }
      i++;
      continue;
    }

    if (Object.hasOwn(FRACTION_DENOMINATORS, t)) {
      const denom = FRACTION_DENOMINATORS[t];
      if (lastIsNumberLike()) {
        out[out.length - 1] = `${lastOut()}/${denom}`;
      } else {
        // Bare fraction noun with no spoken numerator, e.g. "a half" -> 1/2.
        out.push(`1/${denom}`);
      }
      i++;
      continue;
    }

    if (
      t === "a" &&
      Object.hasOwn(FRACTION_DENOMINATORS, tokens[i + 1] ?? "")
    ) {
      out.push(`1/${FRACTION_DENOMINATORS[tokens[i + 1]]}`);
      i += 2;
      continue;
    }

    if (t === "x" || t === "y") {
      if (lastIsNumberLike()) {
        out[out.length - 1] = `${lastOut()}${t}`;
      } else {
        out.push(t);
      }
      i++;
      continue;
    }

    const run = consumeNumberWords(tokens, i);
    if (run) {
      out.push(String(run.value));
      i += run.consumed;
      continue;
    }

    if (t === "and") {
      // Stray glue word not attached to a number run — drop silently.
      i++;
      continue;
    }

    // Genuinely unrecognised token: best-effort pass-through, but it costs confidence.
    unresolved++;
    out.push(t);
    i++;
  }

  const expression = out
    .join(" ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .trim();

  const confidence = unresolved === 0 ? 1 : Math.max(0.3, 1 - unresolved * 0.3);
  return { expression, confidence };
}

function detectMultipleChoiceLetter(cleaned: string): string | null {
  const match = cleaned.match(/^option\s+([a-z]+)$/);
  if (!match) {
    return null;
  }
  return OPTION_LETTER_WORDS[match[1]] ?? match[1].toUpperCase();
}

type AmbiguityDetection = {
  candidates: SpokenMathsCandidate[];
  ambiguityReason: string;
};

// "two x plus one over three": does "over three" divide just the "one", or
// the whole "2x plus one"? Both readings are common in spoken maths, so both
// are returned rather than guessing which the student meant.
function detectFractionScopeAmbiguity(
  cleaned: string
): AmbiguityDetection | null {
  const match = cleaned.match(/^(.+?)\s+plus\s+(.+?)\s+over\s+(.+)$/);
  if (!match) {
    return null;
  }
  const left = normalizeGeneric(match[1]).expression;
  const mid = normalizeGeneric(match[2]).expression;
  const right = normalizeGeneric(match[3]).expression;
  if (!left || !mid || !right) {
    return null;
  }
  return {
    candidates: [
      { value: `${left} + ${mid}/${right}`, confidence: 0.5 },
      { value: `(${left} + ${mid}) / ${right}`, confidence: 0.5 },
    ],
    ambiguityReason: "fraction-scope",
  };
}

// "negative three squared": does the minus sign bind before or after the
// exponent? -3^2 = -9, but (-3)^2 = 9 — genuinely different answers.
function detectNegationExponentAmbiguity(
  cleaned: string
): AmbiguityDetection | null {
  const match = cleaned.match(/^(?:negative|minus)\s+(.+?)\s+(squared|cubed)$/);
  if (!match) {
    return null;
  }
  const n = wordsToNumber(match[1]);
  if (n === null || n < 0) {
    return null;
  }
  const exp = match[2] === "squared" ? 2 : 3;
  return {
    candidates: [
      { value: `-${n}^${exp}`, confidence: 0.5 },
      { value: `(-${n})^${exp}`, confidence: 0.5 },
    ],
    ambiguityReason: "negation-vs-exponent-precedence",
  };
}

// "one four": a run of two single spoken digits could be a two-digit number
// read aloud digit-by-digit ("14"), or a sloppy "one-fourth" fraction ("1/4").
function detectDigitStringVsFractionAmbiguity(
  cleaned: string
): AmbiguityDetection | null {
  const tokens = cleaned.split(" ").filter(Boolean);
  if (
    tokens.length !== 2 ||
    !SINGLE_DIGIT_WORDS.has(tokens[0]) ||
    !SINGLE_DIGIT_WORDS.has(tokens[1])
  ) {
    return null;
  }
  const d1 = ONES[tokens[0]];
  const d2 = ONES[tokens[1]];
  if (d2 === 0) {
    // "/0" isn't a plausible fraction reading — treat as an unambiguous digit string instead.
    return null;
  }
  return {
    candidates: [
      { value: `${d1}${d2}`, confidence: 0.5 },
      { value: `${d1}/${d2}`, confidence: 0.5 },
    ],
    ambiguityReason: "digit-string-vs-fraction",
  };
}

// Below this confidence, the caller should ask the student to confirm even
// though this module didn't detect one of the specific named ambiguities.
const LOW_CONFIDENCE_THRESHOLD = 0.85;

export function parseSpokenMaths(transcript: string): SpokenMathsParseResult {
  const cleaned = clean(transcript);

  if (!cleaned) {
    // Silence / no speech detected must never be graded as a real attempt.
    return {
      raw: transcript,
      candidates: [{ value: "", confidence: 0 }],
      ambiguityReason: "empty-transcript",
      requiresConfirmation: true,
    };
  }

  const mcqLetter = detectMultipleChoiceLetter(cleaned);
  if (mcqLetter) {
    return {
      raw: transcript,
      candidates: [{ value: mcqLetter, confidence: 1 }],
      ambiguityReason: null,
      requiresConfirmation: false,
    };
  }

  const ambiguity =
    detectFractionScopeAmbiguity(cleaned) ??
    detectNegationExponentAmbiguity(cleaned) ??
    detectDigitStringVsFractionAmbiguity(cleaned);
  if (ambiguity) {
    return {
      raw: transcript,
      candidates: ambiguity.candidates,
      ambiguityReason: ambiguity.ambiguityReason,
      requiresConfirmation: true,
    };
  }

  const { expression, confidence } = normalizeGeneric(cleaned);
  return {
    raw: transcript,
    candidates: [{ value: expression, confidence }],
    ambiguityReason: null,
    requiresConfirmation: confidence < LOW_CONFIDENCE_THRESHOLD,
  };
}

export type SpokenMathsClarification = {
  displayText: string;
  spokenText: string;
};

/**
 * Deterministic (no LLM call) clarification question for an ambiguous or
 * low-confidence spoken-maths parse. Every case here is already fully
 * classified by parseSpokenMaths — there is nothing an LLM call would add,
 * matching this repo's established preference for deterministic logic over
 * a model call wherever one suffices (the adaptive engine, grading, and
 * misconception detection are all LLM-free by the same design). Returns
 * null when the result doesn't require confirmation.
 */
export function buildClarificationQuestion(
  result: SpokenMathsParseResult
): SpokenMathsClarification | null {
  if (!result.requiresConfirmation) {
    return null;
  }

  if (result.ambiguityReason === "empty-transcript") {
    const text = "I didn't catch that — could you say your answer again?";
    return { displayText: text, spokenText: text };
  }

  if (result.ambiguityReason === "fraction-scope") {
    const [a, b] = result.candidates;
    const text = `I heard "${result.raw}". Do you mean ${a.value}, or ${b.value}?`;
    return { displayText: text, spokenText: text };
  }

  if (result.ambiguityReason === "negation-vs-exponent-precedence") {
    const parenCandidate = result.candidates.find((c) =>
      c.value.startsWith("(")
    );
    const plainCandidate = result.candidates.find((c) => c !== parenCandidate);
    const expWord = result.raw.includes("cubed") ? "cubed" : "squared";
    const text = `I heard "${result.raw}". Do you mean the number ${expWord} first, then made negative — that's ${plainCandidate?.value} — or the negative number ${expWord} as a whole — that's ${parenCandidate?.value}?`;
    return { displayText: text, spokenText: text };
  }

  if (result.ambiguityReason === "digit-string-vs-fraction") {
    const [asNumber, asFraction] = result.candidates;
    const text = `I heard "${result.raw}". Do you mean the number ${asNumber.value}, or the fraction ${asFraction.value}?`;
    return { displayText: text, spokenText: text };
  }

  // Low confidence, no specific named ambiguity — a plain single-reading confirm.
  const best = result.candidates[0];
  const text = best?.value
    ? `I heard "${result.raw}" as ${best.value} — is that right?`
    : `I heard "${result.raw}" but I'm not sure I caught that correctly — could you say it again?`;
  return { displayText: text, spokenText: text };
}
