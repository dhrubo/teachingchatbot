// lib/ai/prompts-tutor.ts
//
// The tutor prompt is mode-driven: the APPLICATION decides which of these
// modes applies to a given call (see mode resolution in
// app/(chat)/api/chat/route.ts, app/api/ai/hint/route.ts and
// app/api/ai/explain-error/route.ts) and builds a short, single-purpose
// prompt for it. The model never chooses lesson state, grades answers,
// writes mastery, changes goals, or invents UI controls — it only produces
// the text for the mode it's told to run.
//
// Bump TUTOR_PROMPT_VERSION whenever this file changes; it's logged with
// every AI call (lib/ai/ai-call-log.ts) and gated by the offline eval gym
// (evals/tutor) before it can become the production version.
export const TUTOR_PROMPT_VERSION = "tutor-v2-mode-driven";

export type TutorMode =
  | "teach"
  | "reteach"
  | "hint"
  | "mistake_explanation"
  | "reflection"
  | "worked_solution";

// NOTE: "reflection" and "worked_solution" are fully specified here and in
// tutor-validator.ts, and covered by evals/tutor fixtures, but no production
// route resolves to either of them yet — resolveTutorMode.ts only ever
// returns teach/reteach/mistake_explanation, and app/api/ai/hint/route.ts is
// the only other caller (always "hint"). The UI's "Worked Solution" button
// (components/chat/review-mistakes-screen.tsx) renders a static
// `explanation` DB field today, not this mode. Wiring a real trigger for
// either mode is a deliberate follow-up, not something to infer from this
// file — don't assume either path is exercised by live traffic.

export type TutorContext = {
  /** Curriculum topics the tutor is allowed to teach right now. */
  allowedTopics?: string[];
  /** The topic thread currently active, if any. */
  currentTopic?: string | null;
  /**
   * Only CONFIRMED misconceptions (repeated, independent evidence — see
   * lib/learning-science/misconception-status.ts) — never tentative ones,
   * and never asserted just because one answer was wrong.
   */
  confirmedMisconceptions?: string[];
  /**
   * The canonical answer to the question under discussion. Only ever
   * populate this for mistake_explanation/worked_solution — teach, reteach
   * and hint callers should never pass it, so there's nothing to leak even
   * if the model tried. The deterministic validator (lib/ai/tutor-validator.ts)
   * also checks this field directly for answer-leak detection.
   */
  finalAnswer?: string | null;
  /** A deterministic, non-LLM signal about a repeated wrong-answer pattern. */
  answerPatternObservation?: string | null;
};

const SHARED_RULES = `
- British English: calm, patient, encouraging. Not childish, not emoji-heavy, not robotic.
- Plain text only — never LaTeX or $ delimiters (write "4:10" not "$4:10$").
- Never mention XP, streaks, badges, mastery scores, or difficulty bands — the app's UI shows progress, you never narrate it.
- Only teach the current topic. Never silently switch topics or start a new one without being asked.
- Every reply must contain visible teaching text — never end on a bare tool call or silence.
- Never invent UI controls, buttons or challenge questions in your text — the app owns all of that.`.trim();

// Every mode except worked_solution is held to this brevity budget — a
// numbered, step-by-step solution legitimately needs more room than 2-6
// lines (see the worked_solution mode body below, and the matching
// mode-specific limit in lib/ai/tutor-validator.ts's checkTooLong).
const BREVITY_RULE =
  "- 2-6 lines. One idea, one example. No curriculum dumps, no long chains of reasoning.";

const MODE_BODIES: Record<TutorMode, string> = {
  teach: `# MODE: TEACH
Explain one small, new concept. Do not ask a graded question, quiz, or challenge of any kind — Challenge Mode is a separate, app-driven flow the student opts into explicitly. Do not reference or imply any specific answer. You may ask at most one NON-graded question (e.g. which topic to try, or a plain "make sense so far?").`,

  reteach: `# MODE: RETEACH
The student asked to see this explained differently. Re-teach the SAME concept using a representation you have not used yet (money, pizza slices, a fraction bar, a number line, sport, sharing). Do not increase difficulty and do not ask a graded question. Lead with a concrete diagram or example; keep prose minimal.`,

  hint: `# MODE: HINT
Give one short, Socratic nudge for the question the student is stuck on. Do NOT reveal, restate, or imply the final answer in any form. Ask at most one guiding question. Two sentences maximum.`,

  mistake_explanation: `# MODE: MISTAKE EXPLANATION
The student answered incorrectly and the app has already told them the correct answer. Explain what went wrong. If a confirmed misconception is given in context, target that exact error rather than re-teaching generally. End with one concrete next step the student can take (try a similar question, see another example, or move on) — never leave them without one.`,

  reflection: `# MODE: REFLECTION
Invite the student to reflect on what they just practised, in their own words. Ask at most one open, non-graded question (e.g. "what felt tricky about that one?"). Do not grade, quiz, or introduce new content.`,

  worked_solution: `# MODE: WORKED SOLUTION
The student explicitly asked to see the full solution. Walk through it step by step using the final answer given in context — this is the one mode where stating the answer directly is expected, because the student asked for it. Use concise, numbered steps (aim for 4-8 short steps) — this is the one mode NOT held to the shared 2-6 line limit, but it still isn't an essay: one line of reasoning per step, no repeated content.`,
};

function contextBlock(context: TutorContext): string {
  const lines: string[] = [];
  if (context.allowedTopics && context.allowedTopics.length > 0) {
    lines.push(`In-scope topics: ${context.allowedTopics.join(", ")}.`);
  }
  if (context.currentTopic) {
    lines.push(`Current topic: ${context.currentTopic}.`);
  }
  if (
    context.confirmedMisconceptions &&
    context.confirmedMisconceptions.length > 0
  ) {
    lines.push(
      `Confirmed learner misconceptions (repeated evidence — safe to name directly): ${context.confirmedMisconceptions.join(", ")}.`
    );
  }
  if (context.answerPatternObservation) {
    lines.push(`Observed pattern: ${context.answerPatternObservation}`);
  }
  if (context.finalAnswer) {
    lines.push(`Final answer for this question: ${context.finalAnswer}`);
  }
  return lines.join("\n");
}

/**
 * Build the system prompt for one mode + one turn's read-only context. The
 * app calls this once per request with the mode IT has already decided —
 * the model receives no mechanism to change mode, grade an answer, write
 * mastery, or alter goals from inside its response.
 */
export function buildTutorPrompt(
  mode: TutorMode,
  context: TutorContext = {}
): string {
  const ctx = contextBlock(context);
  return [
    `# TUTOR (prompt ${TUTOR_PROMPT_VERSION})`,
    "You are SARA, a UK Year 8/9 maths tutor. The app controls lesson state, challenge questions, grading, mastery, XP and goals — your only job is the text for the mode below.",
    MODE_BODIES[mode],
    mode === "worked_solution" ? SHARED_RULES : [SHARED_RULES, BREVITY_RULE].join("\n"),
    ctx ? `# CONTEXT\n${ctx}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
