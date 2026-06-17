/**
 * Deterministic cognitive load reduction — zero AI calls.
 *
 * When a student is struggling (multiple failures, low confidence,
 * abandoned challenges), show a NOW / NEXT / LATER plan instead of
 * overwhelming them with everything at once.
 */

export type LoadPlanItem = {
  skillSlug: string;
  label: string;
  slot: "now" | "next" | "later";
  reason: string;
};

export type CognitiveLoadState = {
  recentFailures: number;      // consecutive wrong answers
  abandonedChallenges: number;  // challenges started but not completed
  lowConfidenceSkills: string[]; // skills with confidence <= 2
};

/**
 * Check if cognitive load reduction should be triggered.
 */
export function shouldReduceLoad(state: CognitiveLoadState): boolean {
  return (
    state.recentFailures >= 3 ||
    state.abandonedChallenges >= 2 ||
    state.lowConfidenceSkills.length >= 3
  );
}

/**
 * Build a NOW / NEXT / LATER plan from a list of skills to work on.
 *
 * - NOW: the skill the student is currently stuck on (or weakest)
 * - NEXT: the next skill to attempt (moderately related, not the same)
 * - LATER: a skill to review later (weak but not urgent)
 */
export function buildLoadPlan(params: {
  currentSkill: string;
  allSkills: { skillSlug: string; masteryScore: number; confidence: number }[];
  recentFailures: number;
  abandonedChallenges: number;
}): LoadPlanItem[] {
  const { currentSkill, allSkills, recentFailures, abandonedChallenges } = params;

  if (!shouldReduceLoad({ recentFailures, abandonedChallenges, lowConfidenceSkills: [] })) {
    return [];
  }

  // Sort skills by mastery (weakest first)
  const sorted = [...allSkills].sort(
    (a, b) => a.masteryScore - b.masteryScore
  );

  const nowSkill = sorted.find((s) => s.skillSlug === currentSkill) ?? sorted[0];

  const nextSkill = sorted.find(
    (s) => s.skillSlug !== nowSkill.skillSlug && s.masteryScore < 60
  );

  const laterSkill = sorted.find(
    (s) =>
      s.skillSlug !== nowSkill.skillSlug &&
      s.skillSlug !== nextSkill?.skillSlug &&
      s.confidence <= 3
  );

  const plan: LoadPlanItem[] = [];

  if (nowSkill) {
    plan.push({
      skillSlug: nowSkill.skillSlug,
      label: nowSkill.skillSlug,
      slot: "now",
      reason: recentFailures >= 3
        ? "Let's focus on this one — a few tricky steps to work through."
        : "You're working on this — let's finish it first.",
    });
  }

  if (nextSkill) {
    plan.push({
      skillSlug: nextSkill.skillSlug,
      label: nextSkill.skillSlug,
      slot: "next",
      reason: "This one is up next — similar skills, different angle.",
    });
  }

  if (laterSkill) {
    plan.push({
      skillSlug: laterSkill.skillSlug,
      label: laterSkill.skillSlug,
      slot: "later",
      reason: "We'll come back to this one for review.",
    });
  }

  return plan;
}
