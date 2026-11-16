import { getTopicBySlug } from "@/lib/curriculum/edexcel-1ma1";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import { getSingleTopicProgress } from "@/lib/db/queries/progress";
import { createQuizAttempt } from "@/lib/db/queries/quizzes";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import {
  generateTopicGameRounds,
  toPublicGameRound,
} from "@/lib/quiz/game-generator";
import { startTopicGameSchema } from "./schema";

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new ChatbotError("bad_request:quiz").toResponse();
  }

  const parsed = startTopicGameSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new ChatbotError("bad_request:quiz").toResponse();
  }

  const topic = getTopicBySlug(parsed.data.topicSlug);
  if (!topic) {
    return new ChatbotError(
      "bad_request:quiz",
      "Unknown Edexcel topic slug"
    ).toResponse();
  }

  try {
    const learnerId = await ensureLearnerCookie();
    const [learnerProfile, currentProg] = await Promise.all([
      getOrCreateLearner(learnerId),
      getSingleTopicProgress(learnerId, topic.slug),
    ]);

    const rounds = generateTopicGameRounds(topic.slug, learnerProfile.tier);
    const attempt = await createQuizAttempt({
      learnerId,
      topicSlug: topic.slug,
      questions: rounds,
    });

    const firstRound = rounds[0];
    if (!firstRound) {
      return new ChatbotError("bad_request:quiz").toResponse();
    }

    return Response.json({
      attemptId: attempt.id,
      topicSlug: topic.slug,
      topicTitle: topic.title,
      edexcelCode: topic.edexcelCode,
      startingMastery: currentProg?.masteryScore ?? 0,
      totalRounds: rounds.length,
      currentIndex: 0,
      round: toPublicGameRound(firstRound),
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
