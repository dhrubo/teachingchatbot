import { notFound } from "next/navigation";
import { VoiceTutorStudio } from "@/components/tutor/voice-tutor-studio";
import { getTopicBySlug } from "@/lib/curriculum/edexcel-1ma1";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import {
  getOrCreateTutorSession,
  getSingleTopicProgress,
} from "@/lib/db/queries/progress";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";

export const dynamic = "force-dynamic";

export default async function LearnTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicSlug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ topicSlug }, resolvedSearch] = await Promise.all([
    params,
    searchParams,
  ]);
  const topic = getTopicBySlug(topicSlug);
  if (!topic) {
    notFound();
  }

  const learnerId = await resolveLearnerIdFromCookies();
  const learner = await getOrCreateLearner(learnerId);
  const [progress, session] = await Promise.all([
    getSingleTopicProgress(learnerId, topic.slug),
    getOrCreateTutorSession(learnerId, topic.slug, learner.preferredLens),
  ]);

  return (
    <VoiceTutorStudio
      initialLearner={{
        nickname: learner.nickname,
        tier: learner.tier,
        targetGrade: learner.targetGrade,
        preferredLens: learner.preferredLens,
        toneStyle: learner.toneStyle,
        speechSpeed: learner.speechSpeed,
        currentStreak: learner.currentStreak,
        streakFreezes: learner.streakFreezes,
        totalXp: learner.totalXp,
        reminderEnabled: learner.reminderEnabled,
      }}
      initialLensesTried={progress?.lensesTried ?? []}
      initialMasteryScore={progress?.masteryScore ?? 0}
      initialMode={resolvedSearch.mode === "quiz" ? "quiz" : "tutorial"}
      initialStage={session.stage || "1.1"}
      initialTurns={session.turnsJson}
      topic={topic}
    />
  );
}
