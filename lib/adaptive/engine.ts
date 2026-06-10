import {
  getArchetypesForSkillBand,
  getMasteryForSkills,
  getRecentAttempts,
  getSkillSlugsForLesson,
  getSkillSlugsForMission,
  recordAttempt,
  upsertMastery,
} from "@/lib/db/queries/questions";
import {
  type GeneratedQuestionValue,
  generateFromArchetype,
} from "@/lib/questions/generate-from-archetype";
import { gradeAnswer } from "@/lib/questions/grade-answer";
import { detectMisconception } from "./detect-misconception";
import {
  pickArchetypeSlug,
  type SkillMastery,
  selectNextBand,
  selectWeakestSkill,
} from "./select-next-question";
import {
  type DifficultyBand,
  emptyMastery,
  type MasteryState,
  updateMastery,
} from "./update-mastery";

export type NextQuestion = {
  archetypeId: string;
  archetypeSlug: string;
  skillSlug: string;
  difficultyBand: DifficultyBand;
  questionType: GeneratedQuestionValue["questionType"];
  prompt: string;
  options: string[] | null;
  // correctAnswer + rules let the client grade locally with ZERO further calls.
  correctAnswer: string;
  rules: Record<string, unknown>;
  hint: string | null;
  explanation: string | null;
};

/**
 * Select the next adaptive question for a lesson run.
 * Pure DB reads + deterministic generation — NO LLM calls.
 */
export async function selectNextQuestionForLesson(params: {
  studentId?: string;
  guestSessionId?: string;
  lessonSlug: string;
  rng?: () => number;
}): Promise<NextQuestion | null> {
  const skillSlugs = await getSkillSlugsForLesson(params.lessonSlug);
  return selectFromSkills({ ...params, skillSlugs });
}

/** As selectNextQuestionForLesson, but scoped to a whole mission's skills. */
export async function selectNextQuestionForMission(params: {
  studentId?: string;
  guestSessionId?: string;
  missionSlug: string;
  rng?: () => number;
}): Promise<NextQuestion | null> {
  const skillSlugs = await getSkillSlugsForMission(params.missionSlug);
  return selectFromSkills({ ...params, skillSlugs });
}

async function selectFromSkills(params: {
  studentId?: string;
  guestSessionId?: string;
  skillSlugs: string[];
  rng?: () => number;
}): Promise<NextQuestion | null> {
  const rng = params.rng ?? Math.random;
  const skillSlugs = params.skillSlugs;
  if (skillSlugs.length === 0) {
    console.warn(
      "[adaptive-engine] no skill slugs found for mission/lesson"
    );
    return null;
  }

  const masteryRows = params.studentId
    ? await getMasteryForSkills(params.studentId, skillSlugs)
    : [];
  const masteryBySkill = new Map<string, SkillMastery>(
    masteryRows.map((m) => [
      m.skillSlug,
      {
        skillSlug: m.skillSlug,
        masteryScore: m.masteryScore,
        currentBand: m.currentBand,
        recentCorrectStreak: m.recentCorrectStreak,
        recentWrongStreak: m.recentWrongStreak,
      },
    ])
  );

  const skillSlug = selectWeakestSkill(skillSlugs, masteryBySkill);
  if (!skillSlug) {
    return null;
  }

  const band = selectNextBand({ mastery: masteryBySkill.get(skillSlug), rng });

  const [archetypes, recent] = await Promise.all([
    getArchetypesForSkillBand(skillSlug, band).catch((err) => {
      console.error("[adaptive-engine] getArchetypesForSkillBand failed:", err);
      return [];
    }),
    getRecentAttempts({
      studentId: params.studentId,
      guestSessionId: params.guestSessionId,
      limit: 10,
    }).catch((err) => {
      console.error("[adaptive-engine] getRecentAttempts failed:", err);
      return [];
    }),
  ]);
  if (archetypes.length === 0) {
    console.warn(
      "[adaptive-engine] no archetypes for",
      { skillSlug, band }
    );
    return null;
  }
  const chosenSlug = pickArchetypeSlug(
    archetypes.map((a) => a.slug),
    recent,
    rng
  );
  const archetype =
    archetypes.find((a) => a.slug === chosenSlug) ?? archetypes[0];

  const generated = generateFromArchetype(archetype, rng);
  if (!generated) {
    console.warn(
      "[adaptive-engine] generateFromArchetype returned null",
      { slug: archetype.slug }
    );
    return null;
  }

  return {
    archetypeId: archetype.id,
    archetypeSlug: archetype.slug,
    skillSlug: archetype.skillSlug,
    difficultyBand: archetype.difficultyBand,
    questionType: generated.questionType,
    prompt: generated.prompt,
    options: generated.options,
    correctAnswer: generated.correctAnswer,
    rules: generated.rules,
    hint: generated.hint,
    explanation: generated.explanation,
  };
}

/**
 * Record an answer: log the attempt and (for logged-in students) update mastery.
 * Returns the updated mastery so callers can show progress. NO LLM calls.
 */
export async function recordAnswer(params: {
  studentId?: string;
  guestSessionId?: string;
  archetypeId: string;
  skillSlug: string;
  difficultyBand: DifficultyBand;
  prompt: string;
  studentAnswer: string;
  correctAnswer: string;
  rules?: Record<string, unknown>;
  misconceptionTags?: string[];
  timeTakenMs?: number;
  /** Pass pre-fetched mastery to avoid a redundant DB query. */
  currentMastery?: MasteryState;
}): Promise<{ isCorrect: boolean; mastery: MasteryState | null }> {
  const isCorrect = gradeAnswer({
    studentAnswer: params.studentAnswer,
    correctAnswer: params.correctAnswer,
    rules: params.rules,
  });

  const misconceptionTag = isCorrect
    ? null
    : detectMisconception({
        question: {
          correctAnswer: params.correctAnswer,
          rules: params.rules ?? {},
        },
        studentAnswer: params.studentAnswer,
        misconceptionTags: params.misconceptionTags ?? [],
      });

  await recordAttempt({
    studentId: params.studentId ?? null,
    guestSessionId: params.guestSessionId ?? null,
    archetypeId: params.archetypeId,
    skillSlug: params.skillSlug,
    difficultyBand: params.difficultyBand,
    prompt: params.prompt,
    studentAnswer: params.studentAnswer,
    correctAnswer: params.correctAnswer,
    isCorrect,
    misconceptionTag,
    timeTakenMs: params.timeTakenMs,
  });

  // Guests do not persist mastery.
  if (!params.studentId) {
    return { isCorrect, mastery: null };
  }

  const current: MasteryState =
    params.currentMastery
    ?? (await getMasteryForSkills(params.studentId, [params.skillSlug]))
      .find((m) => m.skillSlug === params.skillSlug)
    ?? emptyMastery();
  const next = updateMastery(current, {
    isCorrect,
    difficultyBand: params.difficultyBand,
  });

  await upsertMastery(params.studentId, {
    skillSlug: params.skillSlug,
    masteryScore: next.masteryScore,
    currentBand: next.currentBand,
    recentCorrectStreak: next.recentCorrectStreak,
    recentWrongStreak: next.recentWrongStreak,
    isCorrect,
  });

  return { isCorrect, mastery: next };
}
