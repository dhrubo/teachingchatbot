import {
  getOrCreateLearner,
  updateLearnerStreakFields,
} from "@/lib/db/queries/learners";
import {
  getLearnerTopicProgress,
  recordTopicActivity,
  upsertDailyPracticeLog,
} from "@/lib/db/queries/progress";
import {
  getBestQuizScoresByTopic,
  getQuizAttemptById,
  saveQuizAttemptProgress,
} from "@/lib/db/queries/quizzes";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import { checkMathAnswer } from "@/lib/math/check-answer";
import { toPublicGameRound } from "@/lib/quiz/game-generator";
import {
  computeUpdatedStreak,
  formatDateInTimezone,
} from "@/lib/reminders/streaks";
import { answerTopicGameSchema } from "./schema";

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new ChatbotError("bad_request:quiz").toResponse();
  }

  const parsed = answerTopicGameSchema.safeParse(rawBody);
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

    if (body.action === "hint") {
      attempt.hintsUsed += 1;
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
        "Pick a working tile or enter an answer first!"
      ).toResponse();
    }

    const exactTileMatch =
      Boolean(currentQ.choices?.length) &&
      rawAnswer.toLowerCase() === currentQ.canonicalAnswer.trim().toLowerCase();

    const check = exactTileMatch
      ? {
          isCorrect: true,
          normalizedLearnerAnswer: rawAnswer,
          needsClarification: false,
        }
      : checkMathAnswer({
          learnerInput: rawAnswer,
          canonicalAnswer: currentQ.canonicalAnswer,
          acceptedVariants: currentQ.acceptedVariants,
        });

    if (
      check.needsClarification &&
      "clarificationPrompt" in check &&
      check.clarificationPrompt
    ) {
      return Response.json({
        action: "clarify",
        clarificationPrompt: check.clarificationPrompt,
      });
    }

    const updatedQuestions = [...attempt.questionsJson];
    updatedQuestions[attempt.currentIndex] = {
      ...currentQ,
      learnerAnswer: check.normalizedLearnerAnswer,
      isCorrect: check.isCorrect,
      timeTakenMs: body.timeTakenMs,
    };
    attempt.questionsJson = updatedQuestions;

    const nextCombo = check.isCorrect ? body.comboBefore + 1 : 0;
    const isBoss = currentQ.roundType === "boss_solve";
    const comboMult = Math.min(4, Math.max(1, nextCombo));
    const roundXp = check.isCorrect ? (isBoss ? 20 : 10) * comboMult : 3;

    if (check.isCorrect) {
      attempt.correctCount += 1;
    }

    attempt.currentIndex += 1;
    const isCompleted = attempt.currentIndex >= attempt.totalQuestions;

    const updatedTopicProg = await recordTopicActivity({
      learnerId,
      topicSlug: attempt.topicSlug,
      lensUsed: "exam",
      stage: isCompleted ? "complete" : `game:${attempt.currentIndex}`,
      questionAttempt: {
        correct: check.isCorrect,
        difficultyWeight: isBoss ? 1.5 : 1,
      },
    });

    // Award live round XP & streak
    const learnerProfile = await getOrCreateLearner(learnerId);
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
      totalXp: learnerProfile.totalXp + roundXp,
    });

    await upsertDailyPracticeLog({
      learnerId,
      practiceDate: todayStr,
      minutesDelta: isCompleted ? 2 : 0,
      xpDelta: roundXp,
      turnsDelta: 1,
      usedFreeze: streakUpdate.usedFreeze,
    });

    if (!isCompleted) {
      await saveQuizAttemptProgress(attempt);
      const nextRound = attempt.questionsJson[attempt.currentIndex];
      if (!nextRound) {
        return new ChatbotError("bad_request:quiz").toResponse();
      }

      return Response.json({
        action: "next",
        isCorrect: check.isCorrect,
        normalizedAnswer: check.normalizedLearnerAnswer,
        canonicalAnswer: currentQ.canonicalAnswer,
        workedSolution: currentQ.workedSolution,
        roundXp,
        combo: nextCombo,
        masteryScore: updatedTopicProg.masteryScore,
        totalXp: updatedLearner.totalXp,
        currentStreak: updatedLearner.currentStreak,
        currentIndex: attempt.currentIndex,
        nextRound: toPublicGameRound(nextRound),
      });
    }

    attempt.status = "completed";
    attempt.scorePercent = Math.round(
      (attempt.correctCount / attempt.totalQuestions) * 100
    );
    attempt.completedAt = new Date();
    await saveQuizAttemptProgress(attempt);

    const [topicProgressList, bestQuizScores] = await Promise.all([
      getLearnerTopicProgress(learnerId),
      getBestQuizScoresByTopic(learnerId),
    ]);

    return Response.json({
      action: "completed",
      isCorrect: check.isCorrect,
      normalizedAnswer: check.normalizedLearnerAnswer,
      canonicalAnswer: currentQ.canonicalAnswer,
      workedSolution: currentQ.workedSolution,
      roundXp,
      combo: nextCombo,
      masteryScore: updatedTopicProg.masteryScore,
      totalXp: updatedLearner.totalXp,
      currentStreak: updatedLearner.currentStreak,
      topicProgressList,
      bestQuizScores,
      summary: {
        scorePercent: attempt.scorePercent,
        correctCount: attempt.correctCount,
        totalRounds: attempt.totalQuestions,
        masteryScore: updatedTopicProg.masteryScore,
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
