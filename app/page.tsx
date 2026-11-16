import { EdexcelDashboard } from "@/components/home/edexcel-dashboard";
import { getAuthSession } from "@/lib/auth/session";
import { getAccountById } from "@/lib/db/queries/accounts";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import { getLearnerTopicProgress } from "@/lib/db/queries/progress";
import { getBestQuizScoresByTopic } from "@/lib/db/queries/quizzes";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [learnerId, session] = await Promise.all([
    resolveLearnerIdFromCookies(),
    getAuthSession(),
  ]);

  const [learner, progressRows, quizScoresBySlug, acct] = await Promise.all([
    getOrCreateLearner(learnerId),
    getLearnerTopicProgress(learnerId),
    getBestQuizScoresByTopic(learnerId),
    session ? getAccountById(session.accountId) : Promise.resolve(null),
  ]);

  const progressBySlug: Record<
    string,
    {
      masteryScore: number;
      lensesTried: (typeof learner.preferredLens)[];
    }
  > = {};

  for (const row of progressRows) {
    progressBySlug[row.topicSlug] = {
      masteryScore: row.masteryScore,
      lensesTried: row.lensesTried,
    };
  }

  return (
    <EdexcelDashboard
      authSession={
        acct
          ? {
              role: acct.role,
              displayName: acct.displayName,
              username: acct.username,
              watcherCode: acct.watcherCode,
            }
          : null
      }
      learner={{
        nickname: learner.nickname,
        tier: learner.tier,
        targetGrade: learner.targetGrade,
        reminderEnabled: learner.reminderEnabled,
        currentStreak: learner.currentStreak,
        totalXp: learner.totalXp,
      }}
      progressBySlug={progressBySlug}
      quizScoresBySlug={quizScoresBySlug}
    />
  );
}
