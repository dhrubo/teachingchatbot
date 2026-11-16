import {
  getOrCreateLearner,
  updateLearnerStreakFields,
} from "@/lib/db/queries/learners";
import {
  recordTopicActivity,
  upsertDailyPracticeLog,
} from "@/lib/db/queries/progress";
import {
  getQuizAttemptById,
  saveQuizAttemptProgress,
} from "@/lib/db/queries/quizzes";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import { checkMathAnswer } from "@/lib/math/check-answer";
import { toPublicQuizQuestion } from "@/lib/quiz/procedural-generator";
import {
  computeUpdatedStreak,
  formatDateInTimezone,
} from "@/lib/reminders/streaks";
import { quizAnswerSchema } from "./schema";

function computeIntegrityFlags(counts: {
  tabSwitchCount: number;
  pasteCount: number;
  rapidGuessCount: number;
}): string[] {
  const flags: string[] = [];
  if (counts.tabSwitchCount > 0) {
    flags.push("tab_switched");
  }
  if (counts.pasteCount > 0) {
    flags.push("paste_blocked");
  }
  if (counts.rapidGuessCount >= 2) {
    flags.push("rapid_guessing");
  }
  return flags;
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new ChatbotError("bad_request:quiz").toResponse();
  }

  const parsed = quizAnswerSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new ChatbotError(
      "bad_request:quiz",
      parsed.error.issues[0]?.message
    ).toResponse();
  }

  try {
    const body = parsed.data;
    const learnerId = await ensureLearnerCookie();
    const attempt = await getQuizAttemptById(body.attemptId);

    if (
      !attempt ||
      attempt.learnerId !== learnerId ||
      attempt.status !== "in_progress"
    ) {
      return new ChatbotError("not_found:quiz").toResponse();
    }

    const currentQ = attempt.questionsJson[attempt.currentIndex];
    if (!currentQ) {
      return new ChatbotError("not_found:quiz").toResponse();
    }

    attempt.tabSwitchCount += body.tabSwitchesDelta;
    attempt.pasteCount += body.pasteDelta;

    if (body.action === "hint") {
      attempt.hintsUsed += 1;
      attempt.integrityFlags = computeIntegrityFlags(attempt);
      await saveQuizAttemptProgress(attempt);
      return Response.json({
        action: "hint",
        hintSpoken: currentQ.hintSpoken,
        hintsUsed: attempt.hintsUsed,
      });
    }

    const rawAnswer = body.answer?.trim() ?? "";
    if (!rawAnswer) {
      return new ChatbotError(
        "bad_request:quiz",
        "Please enter or say your answer before submitting."
      ).toResponse();
    }

    const check = checkMathAnswer({
      learnerInput: rawAnswer,
      canonicalAnswer: currentQ.canonicalAnswer,
      acceptedVariants: currentQ.acceptedVariants,
    });

    if (check.needsClarification && check.clarificationPrompt) {
      await saveQuizAttemptProgress(attempt);
      return Response.json({
        action: "clarify",
        clarificationPrompt: check.clarificationPrompt,
      });
    }

    // Grade and lock this question on the server
    const updatedQuestions = [...attempt.questionsJson];
    updatedQuestions[attempt.currentIndex] = {
      ...currentQ,
      learnerAnswer: check.normalizedLearnerAnswer,
      isCorrect: check.isCorrect,
      timeTakenMs: body.timeTakenMs,
    };
    attempt.questionsJson = updatedQuestions;

    if (check.isCorrect) {
      attempt.correctCount += 1;
    }

    if (
      typeof body.timeTakenMs === "number" &&
      body.timeTakenMs > 0 &&
      body.timeTakenMs < 3500 &&
      !check.isCorrect
    ) {
      attempt.rapidGuessCount += 1;
    }

    attempt.integrityFlags = computeIntegrityFlags(attempt);
    attempt.currentIndex += 1;

    const isCompleted = attempt.currentIndex >= attempt.totalQuestions;

    await recordTopicActivity({
      learnerId,
      topicSlug: attempt.topicSlug,
      lensUsed: "exam",
      stage: isCompleted ? "complete" : `quiz:${attempt.currentIndex}`,
      questionAttempt: {
        correct: check.isCorrect,
        difficultyWeight: currentQ.index === 4 ? 1.5 : 1.1,
      },
    });

    if (!isCompleted) {
      await saveQuizAttemptProgress(attempt);
      const nextQ = attempt.questionsJson[attempt.currentIndex];
      if (!nextQ) {
        return new ChatbotError("bad_request:quiz").toResponse();
      }

      return Response.json({
        action: "next",
        isCorrect: check.isCorrect,
        normalizedAnswer: check.normalizedLearnerAnswer,
        canonicalAnswer: currentQ.canonicalAnswer,
        workedSolution: currentQ.workedSolution,
        roundingHint: check.roundingHint,
        currentIndex: attempt.currentIndex,
        correctCountSoFar: attempt.correctCount,
        nextQuestion: toPublicQuizQuestion(nextQ),
      });
    }

    attempt.status = "completed";
    attempt.scorePercent = Math.round(
      (attempt.correctCount / attempt.totalQuestions) * 100
    );
    attempt.completedAt = new Date();
    await saveQuizAttemptProgress(attempt);

    // Update learner XP + Duolingo daily streak upon finishing the 5-question quiz
    const learnerProfile = await getOrCreateLearner(learnerId);
    const cleanBonus = attempt.integrityFlags.length === 0 ? 15 : 0;
    const xpEarned = attempt.correctCount * 12 + cleanBonus;
    const todayStr = formatDateInTimezone(new Date(), learnerProfile.timezone);
    const streakUpdate = computeUpdatedStreak({
      currentStreak: learnerProfile.currentStreak,
      longestStreak: learnerProfile.longestStreak,
      streakFreezes: learnerProfile.streakFreezes,
      lastPracticedDate: learnerProfile.lastPracticedDate,
      todayDate: todayStr,
    });

    const updatedLearner = await updateLearnerStreakFields(learnerId, {
      currentStreak: streakUpdate.currentStreak,
      longestStreak: streakUpdate.longestStreak,
      streakFreezes: streakUpdate.streakFreezes,
      lastPracticedDate: streakUpdate.lastPracticedDate,
      totalXp: learnerProfile.totalXp + xpEarned,
    });

    await upsertDailyPracticeLog({
      learnerId,
      practiceDate: todayStr,
      minutesDelta: 3,
      xpDelta: xpEarned,
      turnsDelta: attempt.totalQuestions,
      usedFreeze: streakUpdate.usedFreeze,
    });

    return Response.json({
      action: "completed",
      isCorrect: check.isCorrect,
      normalizedAnswer: check.normalizedLearnerAnswer,
      canonicalAnswer: currentQ.canonicalAnswer,
      workedSolution: currentQ.workedSolution,
      summary: {
        scorePercent: attempt.scorePercent,
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        xpEarned,
        currentStreak: updatedLearner.currentStreak,
        integrityFlags: attempt.integrityFlags,
        tabSwitchCount: attempt.tabSwitchCount,
        pasteCount: attempt.pasteCount,
        rapidGuessCount: attempt.rapidGuessCount,
        hintsUsed: attempt.hintsUsed,
        reviewItems: attempt.questionsJson.map((q) => ({
          index: q.index,
          difficultyLabel: q.difficultyLabel,
          promptText: q.promptText,
          learnerAnswer: q.learnerAnswer ?? "—",
          canonicalAnswer: q.canonicalAnswer,
          isCorrect: Boolean(q.isCorrect),
          workedSolution: q.workedSolution,
        })),
      },
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError(
      "bad_request:database",
      error instanceof Error ? error.message : String(error)
    ).toResponse();
  }
}
