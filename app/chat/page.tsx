import { AskMathsChat } from "@/components/chat/ask-maths-chat";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import {
  getLearnerTopicProgress,
  getOrCreateTutorSession,
} from "@/lib/db/queries/progress";
import { getBestQuizScoresByTopic } from "@/lib/db/queries/quizzes";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, learnerId] = await Promise.all([
    searchParams,
    resolveLearnerIdFromCookies(),
  ]);

  const learner = await getOrCreateLearner(learnerId);
  const [chatSession, progressList, bestQuizScores] = await Promise.all([
    getOrCreateTutorSession(learnerId, "__ask_chat__", learner.preferredLens),
    getLearnerTopicProgress(learnerId),
    getBestQuizScoresByTopic(learnerId),
  ]);

  return (
    <AskMathsChat
      initialBestQuizScores={bestQuizScores}
      initialLearner={{
        nickname: learner.nickname,
        tier: learner.tier,
        targetGrade: learner.targetGrade,
        speechSpeed: learner.speechSpeed,
        currentStreak: learner.currentStreak,
        totalXp: learner.totalXp,
        reminderEnabled: learner.reminderEnabled,
      }}
      initialProgressList={progressList.map((p) => ({
        topicSlug: p.topicSlug,
        masteryScore: p.masteryScore,
        questionsAnswered: p.questionsAnswered,
        questionsCorrect: p.questionsCorrect,
        lensesTried: p.lensesTried,
      }))}
      initialQuery={q?.trim() || undefined}
      initialTurns={chatSession.turnsJson}
    />
  );
}
