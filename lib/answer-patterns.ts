// Deterministic answer-pattern detection.
//
// Watches a student's recent answer attempts and surfaces patterns WITHOUT any
// LLM call — pure functions over data we already capture (the question, the
// correct answer, what the student chose, and whether it was right). The output
// is used two ways:
//   1. Shown to the student as a gentle inline note ("I notice you keep…").
//   2. Fed into the tutor on a reteach turn (which is already an LLM call), so
//      the model targets the real misconception instead of re-deriving it.
//
// No timing, no second model pass — just the cheap, reliable signals.

export type AnswerAttempt = {
  // A stable key for the concept being practised (e.g. the bundle topic, or a
  // normalised question prompt). Patterns are scoped per concept.
  concept: string;
  prompt: string;
  correctAnswer: string;
  // What the student actually answered (the option text or typed value).
  chosen: string;
  wasCorrect: boolean;
};

export type AnswerPattern = {
  kind: "repeat-wrong" | "repeated-distractor";
  // A short, kid-friendly line to show the student.
  studentNote: string;
  // A concise, factual observation handed to the tutor (no praise, no fluff).
  tutorObservation: string;
};

// How many wrong attempts on the same concept before we call it a pattern.
const REPEAT_WRONG_AT = 2;
// How many times the SAME wrong choice before we flag a specific misconception.
const REPEATED_DISTRACTOR_AT = 2;

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Detect patterns from the attempts on a SINGLE concept, most-recent last.
// Returns the single most relevant pattern (or null). Kept to one so the UI /
// tutor isn't flooded — a repeated specific distractor outranks a generic
// repeat-wrong, which outranks a slipping trend.
export function detectAnswerPatterns(
  attempts: AnswerAttempt[]
): AnswerPattern | null {
  if (attempts.length === 0) {
    return null;
  }

  const wrong = attempts.filter((a) => !a.wasCorrect);
  if (wrong.length === 0) {
    return null;
  }

  // 1. Repeated specific distractor — the student keeps picking the SAME wrong
  //    answer. Strongest signal: it points at one concrete misconception.
  const byChoice = new Map<string, AnswerAttempt[]>();
  for (const a of wrong) {
    const key = normalise(a.chosen);
    if (!key) {
      continue;
    }
    const list = byChoice.get(key) ?? [];
    list.push(a);
    byChoice.set(key, list);
  }
  for (const [, list] of byChoice) {
    if (list.length >= REPEATED_DISTRACTOR_AT) {
      const sample = list[list.length - 1];
      return {
        kind: "repeated-distractor",
        studentNote: `I notice you keep choosing "${sample.chosen}" — let's look at why that one's a trap. 🔍`,
        tutorObservation: `PATTERN: the student has chosen the wrong answer "${sample.chosen}" ${list.length} times for this concept (correct answer: "${sample.correctAnswer}"). This points to one specific misconception. Address that exact mistake head-on rather than re-teaching generally.`,
      };
    }
  }

  // 2. Repeat-wrong on the concept — different wrong answers, but still stuck.
  if (wrong.length >= REPEAT_WRONG_AT) {
    return {
      kind: "repeat-wrong",
      studentNote: `This one's tricky — you've had a couple of goes. Let's slow it right down. 🐢`,
      tutorObservation: `PATTERN: the student has answered this concept ("${wrong[0].concept}") wrong ${wrong.length} times with different answers — they're genuinely stuck on the method. Re-teach the core method in the simplest possible terms, smallest step.`,
    };
  }

  return null;
}
