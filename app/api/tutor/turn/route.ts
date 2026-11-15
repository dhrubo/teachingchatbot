import { type NextRequest, NextResponse } from "next/server";
import { runRanedeerTurn } from "@/lib/ai/ranedeer-engine";
import { getTopicBySlug } from "@/lib/curriculum/edexcel-1ma1";
import {
  getOrCreateLearner,
  updateLearnerStreakFields,
} from "@/lib/db/queries/learners";
import {
  appendTutorSessionTurns,
  getOrCreateTutorSession,
  getSingleTopicProgress,
  recordTopicActivity,
  upsertDailyPracticeLog,
} from "@/lib/db/queries/progress";
import type { StoredTutorTurn } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  computeUpdatedStreak,
  formatDateInTimezone,
} from "@/lib/reminders/streaks";
import { generateUUID } from "@/lib/utils";
import { tutorTurnPostSchema } from "./schema";

export const maxDuration = 45;

export async function GET(request: NextRequest) {
  const topicSlug = request.nextUrl.searchParams.get("topicSlug")?.trim() ?? "";
  const topic = getTopicBySlug(topicSlug);
  if (!topic) {
    return new ChatbotError(
      "bad_request:tutor",
      "Unknown Edexcel topic slug"
    ).toResponse();
  }

  const learnerId = await ensureLearnerCookie();
  const profile = await getOrCreateLearner(learnerId);
  const progress = await getSingleTopicProgress(learnerId, topicSlug);
  const session = await getOrCreateTutorSession(
    learnerId,
    topicSlug,
    profile.preferredLens
  );

  const activeLens = session.activeLens ?? profile.preferredLens;
  const initialPack = topic.lenses[activeLens];

  return NextResponse.json({
    learner: profile,
    progress,
    session: {
      id: session.id,
      activeLens,
      stage: session.stage,
      turns: session.turnsJson,
    },
    initialTurn: {
      spokenText: initialPack.spokenText,
      displayText: initialPack.displayText,
      followUpQuestion: initialPack.followUpQuestion,
      activeLens,
      stage: "1.1",
      board: initialPack.board,
      providerUsed: "Edexcel Curated Multi-Lens Engine",
    },
  });
}

export async function POST(request: NextRequest) {
  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return new ChatbotError(
      "bad_request:tutor",
      "Invalid JSON body"
    ).toResponse();
  }

  const parsed = tutorTurnPostSchema.safeParse(rawJson);
  if (!parsed.success) {
    return new ChatbotError(
      "bad_request:tutor",
      parsed.error.issues[0]?.message
    ).toResponse();
  }

  const body = parsed.data;
  const topic = getTopicBySlug(body.topicSlug);
  if (!topic) {
    return new ChatbotError(
      "bad_request:tutor",
      "Unknown Edexcel topic slug"
    ).toResponse();
  }

  const learnerId = await ensureLearnerCookie();
  const limit = checkRateLimit(`tutor:${learnerId}`, 60, 60_000);
  if (!limit.allowed) {
    return new ChatbotError("rate_limit:tutor").toResponse();
  }

  const learnerProfile = await getOrCreateLearner(learnerId);
  const existingProgress = await getSingleTopicProgress(
    learnerId,
    body.topicSlug
  );
  const session = await getOrCreateTutorSession(
    learnerId,
    body.topicSlug,
    learnerProfile.preferredLens
  );

  const turnResult = await runRanedeerTurn({
    profile: {
      nickname: learnerProfile.nickname,
      tier: learnerProfile.tier,
      targetGrade: learnerProfile.targetGrade,
      preferredLens: learnerProfile.preferredLens,
      toneStyle: learnerProfile.toneStyle,
    },
    request: {
      topicSlug: body.topicSlug,
      action: body.action,
      targetLens: body.targetLens ?? session.activeLens,
      stage: body.stage ?? session.stage,
      learnerMessage: body.learnerMessage,
      lensesAlreadyTried: existingProgress?.lensesTried ?? [],
    },
    recentTurns: session.turnsJson,
  });

  const nowIso = new Date().toISOString();
  const newTurns: StoredTutorTurn[] = [];

  if (body.learnerMessage?.trim()) {
    newTurns.push({
      id: generateUUID(),
      role: "learner",
      text: body.learnerMessage.trim(),
      stage: body.stage ?? session.stage,
      createdAt: nowIso,
    });
  }

  newTurns.push({
    id: generateUUID(),
    role: "tutor",
    text: turnResult.displayText,
    spokenText: turnResult.spokenText,
    lens: turnResult.activeLens,
    stage: turnResult.stage,
    createdAt: nowIso,
  });

  await appendTutorSessionTurns({
    sessionId: session.id,
    learnerId,
    topicSlug: body.topicSlug,
    activeLens: turnResult.activeLens,
    stage: turnResult.stage,
    newTurns,
  });

  const updatedProgress = await recordTopicActivity({
    learnerId,
    topicSlug: body.topicSlug,
    lensUsed: turnResult.activeLens,
    stage: turnResult.stage,
    questionAttempt:
      turnResult.answerFeedback && !turnResult.answerFeedback.needsClarification
        ? {
            correct: turnResult.answerFeedback.isCorrect,
            difficultyWeight: turnResult.stage === "complete" ? 1.5 : 1,
          }
        : undefined,
  });

  // Award XP & update Duolingo daily streak!
  const xpDelta = turnResult.answerFeedback?.xpAwarded ?? 5;
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
    totalXp: learnerProfile.totalXp + xpDelta,
  });

  const todayLog = await upsertDailyPracticeLog({
    learnerId,
    practiceDate: todayStr,
    minutesDelta: 1,
    xpDelta,
    turnsDelta: 1,
    usedFreeze: streakUpdate.usedFreeze,
  });

  return NextResponse.json({
    turn: turnResult,
    progress: updatedProgress,
    streak: {
      currentStreak: updatedLearner.currentStreak,
      longestStreak: updatedLearner.longestStreak,
      streakFreezes: updatedLearner.streakFreezes,
      totalXp: updatedLearner.totalXp,
      minutesToday: todayLog.minutesPracticed,
      dailyGoalMinutes: updatedLearner.dailyGoalMinutes,
      streakIncremented: streakUpdate.streakIncremented,
      usedFreeze: streakUpdate.usedFreeze,
      earnedBonusFreeze: streakUpdate.earnedBonusFreeze,
    },
  });
}
