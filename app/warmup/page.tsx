import {
  buildWarmupCardsFromTopics,
  DailyWarmupClient,
} from "@/components/warmup/daily-warmup-client";
import { getDueWarmupTopics } from "@/lib/curriculum/edexcel-1ma1";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import { getLearnerTopicProgress } from "@/lib/db/queries/progress";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";

export const dynamic = "force-dynamic";

export default async function WarmupPage() {
  const learnerId = await resolveLearnerIdFromCookies();
  const [learner, progressRows] = await Promise.all([
    getOrCreateLearner(learnerId),
    getLearnerTopicProgress(learnerId),
  ]);

  const dueTopics = getDueWarmupTopics(progressRows, learner.tier);
  const masteryMap = new Map(
    progressRows.map((row) => [row.topicSlug, row.masteryScore])
  );
  const cards = buildWarmupCardsFromTopics(dueTopics, masteryMap);

  return (
    <DailyWarmupClient
      cards={cards}
      learner={{
        nickname: learner.nickname,
        tier: learner.tier,
        targetGrade: learner.targetGrade,
        speechSpeed: learner.speechSpeed,
        currentStreak: learner.currentStreak,
        streakFreezes: learner.streakFreezes,
        totalXp: learner.totalXp,
        reminderEnabled: learner.reminderEnabled,
      }}
    />
  );
}
