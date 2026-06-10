"use client";

export type LessonAction =
  | "continue_learning"
  | "start_challenge"
  | "retry_similar"
  | "show_example"
  | "review_mistakes"
  | "choose_topic"
  | "next_mission"
  | "explain_answer";

export type LessonState =
  | "teaching"
  | "challenge"
  | "review_mistakes"
  | "results"
  | "content_complete"
  | "topic_selection";

export type StateTransition = {
  from: LessonState;
  action: LessonAction;
  to: LessonState;
};

export const ALLOWED_TRANSITIONS: StateTransition[] = [
  { from: "teaching", action: "continue_learning", to: "teaching" },
  { from: "teaching", action: "start_challenge", to: "challenge" },
  { from: "teaching", action: "choose_topic", to: "topic_selection" },
  { from: "teaching", action: "review_mistakes", to: "review_mistakes" },
  { from: "challenge", action: "review_mistakes", to: "review_mistakes" },
  { from: "challenge", action: "choose_topic", to: "topic_selection" },
  { from: "challenge", action: "explain_answer", to: "review_mistakes" },
  { from: "review_mistakes", action: "retry_similar", to: "challenge" },
  { from: "review_mistakes", action: "show_example", to: "teaching" },
  { from: "review_mistakes", action: "continue_learning", to: "teaching" },
  { from: "review_mistakes", action: "choose_topic", to: "topic_selection" },
  { from: "results", action: "review_mistakes", to: "review_mistakes" },
  { from: "results", action: "continue_learning", to: "teaching" },
  { from: "results", action: "next_mission", to: "topic_selection" },
  { from: "results", action: "choose_topic", to: "topic_selection" },
  { from: "content_complete", action: "start_challenge", to: "challenge" },
  { from: "content_complete", action: "review_mistakes", to: "review_mistakes" },
  { from: "content_complete", action: "choose_topic", to: "topic_selection" },
  { from: "content_complete", action: "next_mission", to: "topic_selection" },
];

export function allowedActions(state: LessonState): LessonAction[] {
  return ALLOWED_TRANSITIONS
    .filter((t) => t.from === state)
    .map((t) => t.action)
    .filter((a, i, arr) => arr.indexOf(a) === i);
}

export function isValidTransition(
  from: LessonState,
  action: LessonAction
): boolean {
  return ALLOWED_TRANSITIONS.some((t) => t.from === from && t.action === action);
}

export function assertHasNextAction(state: LessonState): void {
  const actions = allowedActions(state);
  if (actions.length === 0) {
    console.warn(
      `[state-machine] dead-end state detected: "${state}" has 0 allowed actions. Falling back to choose_topic.`
    );
  }
}

export const ACTION_LABELS: Record<LessonAction, string> = {
  continue_learning: "Continue Learning",
  start_challenge: "Start Challenge Mode",
  retry_similar: "Retry Similar Question",
  show_example: "Show Another Example",
  review_mistakes: "Review Mistakes",
  choose_topic: "Choose Another Topic",
  next_mission: "Next Mission",
  explain_answer: "Explain the Answer",
};
