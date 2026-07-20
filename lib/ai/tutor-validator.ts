import type { TutorMode } from "./prompts-tutor";

// Deterministic, typed guard on tutor output. Every tutor draft goes through
// this before it's shown or repaired — never the model's own judgement of
// whether its reply is safe/on-scope.
export type ViolationCode =
  | "answer_leak"
  | "question_not_allowed"
  | "too_many_questions"
  | "unsupported_diagnosis"
  | "topic_drift"
  | "too_long"
  | "mentions_internal_state"
  | "requests_personal_data"
  | "unsafe_content";

export type TutorValidationContext = {
  mode: TutorMode;
  /** Only set for mistake_explanation/worked_solution — see TutorContext. */
  finalAnswer?: string | null;
  allowedTopics?: string[];
  confirmedMisconceptions?: string[];
  /**
   * When set, `too_long` counts WORDS against this limit instead of the
   * default char/line thresholds — used by the voice tutor
   * (lib/ai/voice-tutor-prompt.ts), whose displayText/spokenText limits are
   * expressed in words (maxDisplayWords/maxSpokenWords), not lines.
   */
  maxWords?: number;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; violations: ViolationCode[] };

// Modes where a graded/quiz-style question, or the final answer, must never
// appear — Challenge Mode (a separate, app-driven flow) owns grading.
const MODES_FORBIDDING_QUESTIONS: readonly TutorMode[] = [
  "teach",
  "reteach",
  "hint",
  "reflection",
];
const MODES_ALLOWING_FINAL_ANSWER: readonly TutorMode[] = [
  "mistake_explanation",
  "worked_solution",
];

const FORBIDDEN_QUESTION_PHRASES = [
  /try this/i,
  /your turn/i,
  /can you solve/i,
  /here('?s| is) your (first |next )?challenge/i,
  /answer below/i,
  /ready for a challenge/i,
];

const INTERNAL_STATE_PHRASES = [
  /\bxp\b/i,
  /\bstreaks?\b/i,
  /mastery score/i,
  /difficulty band/i,
  /system prompt/i,
  /\btool[ -]?call/i,
  /\bprompt version/i,
];

const PERSONAL_DATA_PHRASES = [
  /what'?s your (home )?address/i,
  /where do you live/i,
  /phone number/i,
  /(your|the) school'?s? name/i,
  /\bpostcode\b/i,
  /full name and address/i,
  /date of birth/i,
];

// Best-effort denylist, NOT a full safety classifier. This is a coarse net
// for the offline eval gym (evals/tutor) and a last-resort guard, not a
// substitute for a dedicated moderation system — see docs/privacy.md. It
// covers common, unambiguous phrasing; it will miss paraphrases, other
// languages, and anything not matched by a fixed pattern list. A production
// deployment to minors needs a dedicated moderation model in front of this,
// not just these regexes (see docs/privacy.md's moderation section).
const UNSAFE_CONTENT_PHRASES = [
  // Self-harm / suicide
  /kill (myself|yourself)/i,
  /suicide/i,
  /self[ -]?harm/i,
  /(cut|hurt) myself/i,
  /want to die/i,
  // Violence / weapons
  /how to (make|build) a (bomb|weapon|gun)/i,
  /how to (hurt|attack|fight) (someone|somebody)/i,
  // Drugs
  /how to (make|get|buy) (drugs|meth|cocaine)/i,
  // Sexual content involving a minor context — kept deliberately broad and
  // conservative for a scholastic app used by 12-14 year olds.
  /\b(nude|naked) (photo|picture|pic)s?\b/i,
  /sexual(ly)? explicit/i,
  // Bullying / harassment
  /how to bully/i,
  /make fun of (someone|somebody|him|her|them)/i,
];

// A set of clearly off-topic markers. Deterministic and coarse by design —
// a real topic-drift classifier would need the full curriculum taxonomy,
// which is out of scope for this pass (see final report). Deliberately does
// NOT flag other GCSE subjects (biology/chemistry/physics/etc.) since this
// app teaches more than maths (see data/*, docs/biology, docs/chemistry,
// docs/physics) — only unambiguous non-curriculum content is listed here.
const OFF_TOPIC_MARKERS = [
  // Creative writing / entertainment requests
  /write (me )?a (poem|story|song|rap)/i,
  /song lyrics/i,
  /recipe for/i,
  /tell me a joke/i,
  /recommend a (movie|film|show|game)/i,
  // General trivia unrelated to any curriculum
  /who is the (prime minister|president)/i,
  /who won the (world cup|super bowl|election)/i,
  /favourite (footballer|celebrity|youtuber)/i,
  // Non-curriculum programming requests
  /\b(python|javascript|html) (code|program)\b/i,
  /write (me )?a (program|script|app)\b/i,
  // Personal/relationship advice — out of scope for a maths tutor and
  // better handled by a trusted adult, not this app.
  /(should i|how do i) (break up with|ask out|date)/i,
  /dating advice/i,
];

// worked_solution is the one mode whose own instructions (numbered,
// step-by-step working) legitimately need more room than the 2-6 line
// brevity rule every other mode is held to — see prompts-tutor.ts.
const MAX_CHARS = 900;
const MAX_LINES = 10;
const WORKED_SOLUTION_MAX_CHARS = 1800;
const WORKED_SOLUTION_MAX_LINES = 20;

function countQuestionMarks(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Escapes regex metacharacters so an arbitrary answer string (e.g. "3.5",
// "1/2") can be dropped into a RegExp literally.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkAnswerLeak(text: string, ctx: TutorValidationContext): boolean {
  if (!ctx.finalAnswer) {
    return false;
  }
  if (MODES_ALLOWING_FINAL_ANSWER.includes(ctx.mode)) {
    return false;
  }
  const answer = ctx.finalAnswer.trim();
  if (!answer) {
    return false;
  }
  // Match the answer as a standalone token, not merely as a substring — a
  // plain `.includes()` here would flag e.g. finalAnswer "5" against text
  // containing "15", "50", or "page 5", none of which reveal the answer.
  // Lookaround (rather than \b) so it also works for answers that start or
  // end with a non-word character, like "-5" or "1/2".
  const pattern = new RegExp(
    `(?<![0-9a-zA-Z])${escapeRegExp(answer)}(?![0-9a-zA-Z])`,
    "i"
  );
  return pattern.test(text);
}

function checkQuestionNotAllowed(
  text: string,
  ctx: TutorValidationContext
): boolean {
  if (!MODES_FORBIDDING_QUESTIONS.includes(ctx.mode)) {
    return false;
  }
  return FORBIDDEN_QUESTION_PHRASES.some((re) => re.test(text));
}

function checkTooManyQuestions(text: string): boolean {
  return countQuestionMarks(text) > 1;
}

function checkUnsupportedDiagnosis(
  text: string,
  ctx: TutorValidationContext
): boolean {
  const diagnosisPattern =
    /\b(misconception|you (always|keep|tend to)|classic (sign|inverse|rounding) error)\b/i;
  if (!diagnosisPattern.test(text)) {
    return false;
  }
  const confirmed = ctx.confirmedMisconceptions ?? [];
  if (confirmed.length === 0) {
    // Asserting ANY diagnosis with zero confirmed evidence is unsupported.
    return true;
  }
  const lower = text.toLowerCase();
  const namesAConfirmedOne = confirmed.some((tag) =>
    lower.includes(tag.replace(/_/g, " ").toLowerCase())
  );
  return !namesAConfirmedOne;
}

function checkTopicDrift(text: string): boolean {
  return OFF_TOPIC_MARKERS.some((re) => re.test(text));
}

function checkTooLong(text: string, ctx: TutorValidationContext): boolean {
  if (ctx.maxWords !== undefined) {
    return countWords(text) > ctx.maxWords;
  }
  const lineCount = text.split("\n").filter((l) => l.trim().length > 0).length;
  const maxChars = ctx.mode === "worked_solution" ? WORKED_SOLUTION_MAX_CHARS : MAX_CHARS;
  const maxLines = ctx.mode === "worked_solution" ? WORKED_SOLUTION_MAX_LINES : MAX_LINES;
  return text.length > maxChars || lineCount > maxLines;
}

function checkMentionsInternalState(text: string): boolean {
  return INTERNAL_STATE_PHRASES.some((re) => re.test(text));
}

function checkRequestsPersonalData(text: string): boolean {
  return PERSONAL_DATA_PHRASES.some((re) => re.test(text));
}

function checkUnsafeContent(text: string): boolean {
  return UNSAFE_CONTENT_PHRASES.some((re) => re.test(text));
}

export function validateTutorResponse(
  text: string,
  ctx: TutorValidationContext
): ValidationResult {
  const violations: ViolationCode[] = [];

  if (checkAnswerLeak(text, ctx)) {
    violations.push("answer_leak");
  }
  if (checkQuestionNotAllowed(text, ctx)) {
    violations.push("question_not_allowed");
  }
  if (checkTooManyQuestions(text)) {
    violations.push("too_many_questions");
  }
  if (checkUnsupportedDiagnosis(text, ctx)) {
    violations.push("unsupported_diagnosis");
  }
  if (checkTopicDrift(text)) {
    violations.push("topic_drift");
  }
  if (checkTooLong(text, ctx)) {
    violations.push("too_long");
  }
  if (checkMentionsInternalState(text)) {
    violations.push("mentions_internal_state");
  }
  if (checkRequestsPersonalData(text)) {
    violations.push("requests_personal_data");
  }
  if (checkUnsafeContent(text)) {
    violations.push("unsafe_content");
  }

  return violations.length === 0 ? { valid: true } : { valid: false, violations };
}

const VIOLATION_FIX_INSTRUCTIONS: Record<ViolationCode, string> = {
  answer_leak: "You revealed the final answer. Remove it completely.",
  question_not_allowed:
    "You asked a graded/quiz-style question. Remove it — only the app's Challenge Mode may pose graded questions.",
  too_many_questions: "You asked more than one question. Ask at most one.",
  unsupported_diagnosis:
    "You named a specific misconception without confirmed evidence for it. Remove the diagnosis, or speak generally about checking the method instead.",
  topic_drift: "You drifted off the current maths topic. Stay strictly on it.",
  too_long:
    "Your reply was too long for this mode. Shorten it while keeping only the structure this mode requires.",
  mentions_internal_state:
    "You mentioned XP, streaks, mastery scores, difficulty bands, or other internal system state. Remove those references — the app's UI shows progress.",
  requests_personal_data:
    "You asked for personal information (address, phone number, school name, date of birth, etc). Remove that request entirely.",
  unsafe_content: "Your reply contained unsafe content. Rewrite it to be safe and age-appropriate.",
};

/**
 * Build the ONE-TIME repair prompt: the original fixed mode prompt plus a
 * short, fixed list of only the failed violation codes. Never includes raw
 * request/user data, so nothing here can be mutated by student input.
 */
export function buildRepairPrompt(
  basePrompt: string,
  violations: ViolationCode[]
): string {
  const fixes = violations
    .map((v) => `- ${VIOLATION_FIX_INSTRUCTIONS[v]}`)
    .join("\n");
  return [
    basePrompt,
    "# REPAIR PASS\nYour previous reply had issues. Fix ONLY the issues below; keep the rest of your reply as close to the original as possible. Do not call any tools. Output only the corrected reply text.",
    fixes,
  ].join("\n\n");
}

const FALLBACK_TEXT: Record<TutorMode, string> = {
  teach:
    "Let's take this one step at a time — which part would you like to go over first?",
  reteach:
    "Let's look at this a different way. What part felt confusing, so I can pick a good example?",
  hint: "Think about what the question is really asking, and try breaking it into smaller steps.",
  mistake_explanation:
    "Let's look at the steps together — check each one carefully against the method we practised.",
  reflection: "What part of this felt trickiest to you?",
  worked_solution:
    "Let's go through this step by step together — let me know when you're ready to continue.",
};

/** The fixed, deterministic safe reply for a mode — used when a repair still fails validation. */
export function getFallbackText(mode: TutorMode): string {
  return FALLBACK_TEXT[mode];
}

export type RepairStatus = "none" | "repaired" | "fallback";

export type TutorTurnResult = {
  text: string;
  repairStatus: RepairStatus;
  /** Violations remaining after the process finished — empty unless repairStatus is "fallback". */
  violations: ViolationCode[];
};

/**
 * Draft -> validate -> (at most ONE constrained repair call) -> validate ->
 * deterministic fallback. Never recurses — there is no loop here, just this
 * fixed three-step sequence, so a second bad repair can't trigger another
 * repair attempt.
 */
export async function runTutorTurn(params: {
  mode: TutorMode;
  basePrompt: string;
  validation: TutorValidationContext;
  generate: (systemPrompt: string) => Promise<string>;
}): Promise<TutorTurnResult> {
  const draft = await params.generate(params.basePrompt);
  const draftResult = validateTutorResponse(draft, params.validation);
  if (draftResult.valid) {
    return { text: draft, repairStatus: "none", violations: [] };
  }

  const repairPrompt = buildRepairPrompt(params.basePrompt, draftResult.violations);
  const repaired = await params.generate(repairPrompt);
  const repairedResult = validateTutorResponse(repaired, params.validation);
  if (repairedResult.valid) {
    return { text: repaired, repairStatus: "repaired", violations: [] };
  }

  return {
    text: FALLBACK_TEXT[params.mode],
    repairStatus: "fallback",
    violations: repairedResult.violations,
  };
}
