import { getTopicBySlug } from "@/lib/curriculum/edexcel-1ma1";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import { createQuizAttempt } from "@/lib/db/queries/quizzes";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import {
  generateProceduralQuiz,
  toPublicQuizQuestion,
} from "@/lib/quiz/procedural-generator";
import { quizStartSchema } from "./schema";

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new ChatbotError("bad_request:quiz").toResponse();
  }

  const parsed = quizStartSchema.safeParse(rawBody);
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
    const learnerProfile = await getOrCreateLearner(learnerId);
    const questions = generateProceduralQuiz(topic.slug, learnerProfile.tier);

    const attempt = await createQuizAttempt({
      learnerId,
      topicSlug: topic.slug,
      questions,
    });

    const firstQuestion = questions[0];
    if (!firstQuestion) {
      return new ChatbotError("bad_request:quiz").toResponse();
    }

    return Response.json({
      attemptId: attempt.id,
      topicSlug: topic.slug,
      topicTitle: topic.title,
      totalQuestions: questions.length,
      currentIndex: 0,
      question: toPublicQuizQuestion(firstQuestion),
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
