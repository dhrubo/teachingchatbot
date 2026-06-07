// Conservative detector for "large input" / pasted-list / syllabus messages.
//
// Deliberately NOT the naive "split on commas, length > 500" approach: a normal
// maths word problem has commas and can be long, and we must not block those.
// Instead we look for structure that genuinely indicates a list or syllabus:
// several short newline-separated lines, bullets, or numbered/lettered items.

export type LargeInputResult = {
  triggered: boolean;
  reason: "list_or_syllabus" | "many_topics" | null;
  topicsCount: number;
  inputLength: number;
};

const BULLET_OR_NUMBER = /^\s*(?:[-*•]|\d+[).]|[a-zA-Z][).])\s+/;
const SYLLABUS_MARKER =
  /\b(syllabus|curriculum|topic list|scheme of work|units?|module|paper \d)\b/i;

// A "list-like" line is short and looks like an item rather than a sentence.
function isListLikeLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (BULLET_OR_NUMBER.test(trimmed)) {
    return true;
  }
  // Short, no sentence-ending punctuation, few words → looks like a topic item.
  const words = trimmed.split(/\s+/).length;
  const looksLikeSentence = /[.?!]$/.test(trimmed) || words > 8;
  return trimmed.length <= 60 && !looksLikeSentence;
}

export function detectLargeInput(input: string): LargeInputResult {
  const inputLength = input.length;
  const lines = input.split(/\r?\n/);
  const listLikeLines = lines.filter(isListLikeLine);

  // Count distinct candidate "topics": list-like lines, plus comma-separated
  // fragments ONLY when the message is itself short and list-shaped (not prose).
  let topicsCount = listLikeLines.length;
  const isMostlyList =
    listLikeLines.length >= Math.max(3, Math.ceil(lines.length * 0.6));

  if (topicsCount <= 1 && !/[.?!]/.test(input)) {
    // Single-line, no sentence punctuation — maybe a comma list like "a, b, c, d, e, f".
    const commaParts = input
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && p.split(/\s+/).length <= 4);
    if (commaParts.length >= 6) {
      topicsCount = commaParts.length;
      return {
        triggered: true,
        reason: "many_topics",
        topicsCount,
        inputLength,
      };
    }
  }

  const hasSyllabusMarker = SYLLABUS_MARKER.test(input);

  // A syllabus marker with an inline comma list (e.g. "curriculum: A, B, C")
  // counts those comma fragments as topics too.
  if (hasSyllabusMarker && topicsCount < 3) {
    const commaTopics = input
      .split(/[,\n]/)
      .map((p) => p.replace(/^.*:/, "").trim())
      .filter((p) => p.length > 0 && p.split(/\s+/).length <= 4);
    if (commaTopics.length >= 3) {
      topicsCount = Math.max(topicsCount, commaTopics.length);
    }
  }

  // Trigger when it clearly reads as a list/syllabus with several items.
  if ((isMostlyList && topicsCount >= 5) || (hasSyllabusMarker && topicsCount >= 3)) {
    return {
      triggered: true,
      reason: hasSyllabusMarker ? "list_or_syllabus" : "many_topics",
      topicsCount,
      inputLength,
    };
  }

  return { triggered: false, reason: null, topicsCount, inputLength };
}

// Parse a pasted list into individual topic labels for the pinned panel.
// Splits on newlines and commas, trims bullets/numbering, drops empties.
export function extractTopics(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((t) =>
      t
        .replace(/^\s*(?:[-*•]|\d+[).]|[a-zA-Z][).])\s+/, "")
        .replace(/^[-–\s]+|[-–\s]+$/g, "")
        .trim()
    )
    .filter((t) => t.length > 1 && t.length <= 60)
    .slice(0, 40);
}

// The short chunking reply the server returns instead of calling the LLM.
export const CHUNKING_MESSAGE = `That's quite a lot to take in 👍

Let's keep it simple so we don't overload things.

Pick one topic to start 👇

A) Fractions
B) Algebra
C) Probability
D) Ratios
E) Other`;
