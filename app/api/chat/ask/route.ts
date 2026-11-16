import { answerStudentMathsQuestion } from "@/lib/ai/ask-chat-engine";
import {
  getOrCreateLearner,
  updateLearnerStreakFields,
} from "@/lib/db/queries/learners";
import {
  appendTutorSessionTurns,
  clearTutorSessionTurns,
  getLearnerTopicProgress,
  getOrCreateTutorSession,
  getSingleTopicProgress,
  recordTopicActivity,
  upsertDailyPracticeLog,
} from "@/lib/db/queries/progress";
import { getBestQuizScoresByTopic } from "@/lib/db/queries/quizzes";
import type { StoredTutorTurn } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  computeUpdatedStreak,
  formatDateInTimezone,
} from "@/lib/reminders/streaks";
import { generateUUID } from "@/lib/utils";
import { askMathsPostSchema } from "./schema";

export const maxDuration = 45;

const ASK_CHAT_SESSION_SLUG = "__ask_chat__";

export async function GET() {
  try {
    const learnerId = await ensureLearnerCookie();
    const learner = await getOrCreateLearner(learnerId);
    const [chatSession, topicProgressList, bestQuizScores] = await Promise.all([
      getOrCreateTutorSession(
        learnerId,
        ASK_CHAT_SESSION_SLUG,
        learner.preferredLens
      ),
      getLearnerTopicProgress(learnerId),
      getBestQuizScoresByTopic(learnerId),
    ]);

    return Response.json({
      learner,
      turns: chatSession.turnsJson,
      topicProgressList,
      bestQuizScores,
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

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new ChatbotError("bad_request:tutor").toResponse();
  }

  const parsed = askMathsPostSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new ChatbotError(
      "bad_request:tutor",
      parsed.error.issues[0]?.message
    ).toResponse();
  }

  try {
    const learnerId = await ensureLearnerCookie();
    const limit = checkRateLimit(`ask-chat:${learnerId}`, 50, 60_000);
    if (!limit.allowed) {
      return new ChatbotError("rate_limit:tutor").toResponse();
    }

    const learner = await getOrCreateLearner(learnerId);
    const chatSession = await getOrCreateTutorSession(
      learnerId,
      ASK_CHAT_SESSION_SLUG,
      learner.preferredLens
    );

    const existingTopicProg = parsed.data.explicitTopicSlug
      ? await getSingleTopicProgress(learnerId, parsed.data.explicitTopicSlug)
      : null;

    const answer = await answerStudentMathsQuestion({
      question: parsed.data.question,
      tier: learner.tier,
      targetGrade: learner.targetGrade,
      toneStyle: learner.toneStyle,
      preferredLens: learner.preferredLens,
      explicitTopicSlug: parsed.data.explicitTopicSlug,
      alternateLens: parsed.data.alternateLens,
      lensesTried: existingTopicProg?.lensesTried ?? [],
      recentTurns: chatSession.turnsJson,
    });

    const nowIso = new Date().toISOString();
    const studentTurn: StoredTutorTurn = {
      id: generateUUID(),
      role: "learner",
      text: parsed.data.question,
      createdAt: nowIso,
    };

    const tutorTurn: StoredTutorTurn = {
      id: generateUUID(),
      role: "tutor",
      text: answer.displayText,
      spokenText: answer.spokenText,
      lens: answer.lensUsed,
      detectedTopicSlug: answer.detectedTopicSlug,
      detectedTopicTitle: answer.detectedTopicTitle,
      detectedEdexcelCode: answer.detectedEdexcelCode,
      boardSteps: answer.boardSteps,
      examTip: answer.examTip,
      createdAt: nowIso,
    };

    await appendTutorSessionTurns({
      sessionId: chatSession.id,
      learnerId,
      topicSlug: ASK_CHAT_SESSION_SLUG,
      activeLens: answer.lensUsed,
      stage: "1.1",
      newTurns: [studentTurn, tutorTurn],
    });

    const updatedTopicProgress = await recordTopicActivity({
      learnerId,
      topicSlug: answer.detectedTopicSlug,
      lensUsed: answer.lensUsed,
      stage: "1.1",
    });

    const xpDelta = 6;
    const todayStr = formatDateInTimezone(new Date(), learner.timezone);
    const streakUpdate = computeUpdatedStreak({
      currentStreak: learner.currentStreak,
      longestStreak: learner.longestStreak,
      streakFreezes: learner.streakFreezes,
      lastPracticedDate: learner.lastPracticedDate,
      todayDate: todayStr,
    });

    const updatedLearner = await updateLearnerStreakFields(learnerId, {
      currentStreak: streakUpdate.currentStreak,
      longestStreak: streakUpdate.longestStreak,
      streakFreezes: streakUpdate.streakFreezes,
      lastPracticedDate: streakUpdate.lastPracticedDate,
      totalXp: learner.totalXp + xpDelta,
    });

    await upsertDailyPracticeLog({
      learnerId,
      practiceDate: todayStr,
      minutesDelta: 1,
      xpDelta,
      turnsDelta: 1,
      usedFreeze: streakUpdate.usedFreeze,
    });

    const allProgress = await getLearnerTopicProgress(learnerId);

    return Response.json({
      studentTurn,
      tutorTurn,
      answer,
      updatedTopicProgress,
      topicProgressList: allProgress,
      learnerStats: {
        currentStreak: updatedLearner.currentStreak,
        totalXp: updatedLearner.totalXp,
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

export async function DELETE() {
  try {
    const learnerId = await ensureLearnerCookie();
    await clearTutorSessionTurns(learnerId, ASK_CHAT_SESSION_SLUG);
    return Response.json({ ok: true });
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
