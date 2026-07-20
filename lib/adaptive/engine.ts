import { db } from "@/lib/db/client";
import {
  claimQuestionInstanceForSubmission,
  createQuestionInstance,
  getArchetypesForSkillBand,
  getAttemptByQuestionInstanceId,
  getMasteryForSkills,
  getQuestionInstanceById,
  getRecentAttempts,
  getSkillSlugsForLesson,
  getSkillSlugsForMission,
  recordAttempt,
  upsertMastery,
} from "@/lib/db/queries/questions";
import { generateFromArchetype } from "@/lib/questions/generate-from-archetype";
import { gradeAnswer } from "@/lib/questions/grade-answer";
import { detectMisconception } from "./detect-misconception";
import { upsertConfidence } from "@/lib/db/queries/learning-science";
import {
  buildSanitizedDto,
  checkOwnership,
  clampConfidence,
  clampTimeTakenMs,
  type SanitisedQuestionDto,
} from "./question-instance";
import {
  pickArchetypeSlug,
  type SkillMastery,
  selectNextBand,
  selectWeakestSkill,
} from "./select-next-question";
import { emptyMastery, type MasteryState, updateMastery } from "./update-mastery";

/**
 * Select the next adaptive question for a lesson run, persist it
 * server-side as a QuestionInstance, and return only the sanitised DTO —
 * the canonical answer/rules/misconception tags never leave the server.
 * Pure DB reads + deterministic generation — NO LLM calls.
 */
export async function selectNextQuestionForLesson(params: {
  studentId?: string;
  guestSessionId?: string;
  lessonSlug: string;
  rng?: () => number;
}): Promise<SanitisedQuestionDto | null> {
  const skillSlugs = await getSkillSlugsForLesson(params.lessonSlug);
  return selectFromSkills({ ...params, skillSlugs });
}

/** As selectNextQuestionForLesson, but scoped to a whole mission's skills. */
export async function selectNextQuestionForMission(params: {
  studentId?: string;
  guestSessionId?: string;
  missionSlug: string;
  rng?: () => number;
}): Promise<SanitisedQuestionDto | null> {
  const skillSlugs = await getSkillSlugsForMission(params.missionSlug);
  return selectFromSkills({ ...params, skillSlugs });
}

async function selectFromSkills(params: {
  studentId?: string;
  guestSessionId?: string;
  skillSlugs: string[];
  rng?: () => number;
}): Promise<SanitisedQuestionDto | null> {
  const rng = params.rng ?? Math.random;
  const skillSlugs = params.skillSlugs;
  if (skillSlugs.length === 0) {
    console.warn("[adaptive-engine] no skill slugs found for mission/lesson");
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
    console.warn("[adaptive-engine] no archetypes for", { skillSlug, band });
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
    console.warn("[adaptive-engine] generateFromArchetype returned null", {
      slug: archetype.slug,
    });
    return null;
  }

  const instance = await createQuestionInstance({
    studentId: params.studentId ?? null,
    guestSessionId: params.guestSessionId ?? null,
    archetypeId: archetype.id,
    skillSlug: archetype.skillSlug,
    difficultyBand: archetype.difficultyBand,
    questionType: generated.questionType,
    prompt: generated.prompt,
    options: generated.options,
    correctAnswer: generated.correctAnswer,
    rules: generated.rules,
    misconceptionTags: archetype.misconceptionTagsJson ?? [],
    hint: generated.hint,
    explanation: generated.explanation,
  });

  return buildSanitizedDto(instance);
}

export type SubmitAnswerResult =
  | {
      status: "ok";
      isCorrect: boolean;
      correctAnswer: string;
      explanation: string | null;
      mastery: MasteryState | null;
    }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "expired" }
  | { status: "duplicate" };

/**
 * Grade a submitted answer against the canonical QuestionInstance — never
 * against client-supplied fields. Verifies ownership, expiry and submission
 * status, then grades + records the attempt + updates mastery atomically.
 * NO LLM calls.
 */
export async function submitAnswerForInstance(params: {
  questionInstanceId: string;
  studentAnswer: string;
  timeTakenMs?: unknown;
  confidence?: unknown;
  idempotencyKey?: string | null;
  studentId?: string;
  guestSessionId?: string;
}): Promise<SubmitAnswerResult> {
  const instance = await getQuestionInstanceById(params.questionInstanceId);
  if (!instance) {
    return { status: "not_found" };
  }

  if (
    !checkOwnership(instance, {
      studentId: params.studentId,
      guestSessionId: params.guestSessionId,
    })
  ) {
    return { status: "forbidden" };
  }

  if (instance.expiresAt.getTime() <= Date.now()) {
    return { status: "expired" };
  }

  const idempotencyKey = params.idempotencyKey ?? null;

  // Already submitted before this call started — either a safe replay of the
  // exact same request, or a genuine duplicate attempt.
  if (instance.submittedAt) {
    return await replaySubmission(instance.id, idempotencyKey);
  }

  const claimed = await claimQuestionInstanceForSubmission(
    instance.id,
    idempotencyKey
  );
  if (!claimed) {
    // Lost the race to a concurrent submission — resolve the same way as an
    // already-submitted instance found up front.
    return await replaySubmission(instance.id, idempotencyKey);
  }

  const studentAnswer = params.studentAnswer ?? "";
  const isCorrect = gradeAnswer({
    studentAnswer,
    correctAnswer: claimed.correctAnswer,
    rules: claimed.rulesJson,
  });

  const misconception = isCorrect
    ? { code: null }
    : detectMisconception({
        question: { correctAnswer: claimed.correctAnswer, rules: claimed.rulesJson },
        studentAnswer,
        misconceptionTags: claimed.misconceptionTagsJson,
      });

  const timeTakenMs = clampTimeTakenMs(params.timeTakenMs) ?? undefined;
  const confidence = clampConfidence(params.confidence);

  let mastery: MasteryState | null = null;

  await db.transaction(async (tx) => {
    await recordAttempt(
      {
        studentId: params.studentId ?? null,
        guestSessionId: params.guestSessionId ?? null,
        questionInstanceId: claimed.id,
        archetypeId: claimed.archetypeId,
        skillSlug: claimed.skillSlug,
        difficultyBand: claimed.difficultyBand,
        prompt: claimed.prompt,
        studentAnswer,
        correctAnswer: claimed.correctAnswer,
        isCorrect,
        misconceptionTag: misconception.code,
        timeTakenMs,
      },
      tx
    );

    if (!params.studentId) {
      // Guests don't persist mastery.
      return;
    }

    const current: MasteryState =
      (await getMasteryForSkills(params.studentId, [claimed.skillSlug])).find(
        (m) => m.skillSlug === claimed.skillSlug
      ) ?? emptyMastery();
    const next = updateMastery(current, {
      isCorrect,
      difficultyBand: claimed.difficultyBand,
    });

    await upsertMastery(
      params.studentId,
      {
        skillSlug: claimed.skillSlug,
        masteryScore: next.masteryScore,
        currentBand: next.currentBand,
        recentCorrectStreak: next.recentCorrectStreak,
        recentWrongStreak: next.recentWrongStreak,
        isCorrect,
      },
      tx
    );

    mastery = next;
  });

  // Best-effort: record self-reported confidence for this skill. Non-critical
  // (never blocks/fails the grading result), so failures are swallowed.
  if (params.studentId && confidence !== null) {
    try {
      await upsertConfidence({
        studentId: params.studentId,
        subject: "maths",
        skillSlug: claimed.skillSlug,
        confidence,
      });
    } catch {
      /* non-critical */
    }
  }

  return {
    status: "ok",
    isCorrect,
    correctAnswer: claimed.correctAnswer,
    explanation: claimed.explanation,
    mastery,
  };
}

async function replaySubmission(
  questionInstanceId: string,
  idempotencyKey: string | null
): Promise<SubmitAnswerResult> {
  const instance = await getQuestionInstanceById(questionInstanceId);
  if (!instance) {
    return { status: "not_found" };
  }
  const sameKey =
    idempotencyKey !== null &&
    instance.submittedIdempotencyKey !== null &&
    idempotencyKey === instance.submittedIdempotencyKey;
  if (!sameKey) {
    return { status: "duplicate" };
  }

  const attempt = await getAttemptByQuestionInstanceId(questionInstanceId);
  if (!attempt) {
    // Submitted but the attempt row isn't visible yet (shouldn't normally
    // happen outside a narrow race) — treat conservatively as a duplicate
    // rather than re-grading and risking a second mastery update.
    return { status: "duplicate" };
  }

  return {
    status: "ok",
    isCorrect: attempt.isCorrect,
    correctAnswer: instance.correctAnswer,
    explanation: instance.explanation,
    mastery: null,
  };
}
