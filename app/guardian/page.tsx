import {
  GuardianDashboard,
  type SerializedWatchedKid,
} from "@/components/guardian/guardian-dashboard";
import { getAuthSession } from "@/lib/auth/session";
import {
  getAccountById,
  getWatchedLearnersForParent,
} from "@/lib/db/queries/accounts";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";

export const dynamic = "force-dynamic";

export default async function GuardianPage() {
  const [learnerId, session] = await Promise.all([
    resolveLearnerIdFromCookies(),
    getAuthSession(),
  ]);

  const [navLearner, acct] = await Promise.all([
    getOrCreateLearner(learnerId),
    session ? getAccountById(session.accountId) : Promise.resolve(null),
  ]);

  let watchedKids: SerializedWatchedKid[] = [];
  if (acct?.role === "parent") {
    const rawKids = await getWatchedLearnersForParent(acct.id);
    watchedKids = rawKids.map((k) => ({
      learnerId: k.learner.id,
      nickname: k.learner.nickname,
      tier: k.learner.tier,
      targetGrade: k.learner.targetGrade,
      currentStreak: k.learner.currentStreak,
      totalXp: k.learner.totalXp,
      studentUsername: k.studentUsername,
      watcherCode: k.watcherCode,
      relationship: k.relationship,
      topicsStudiedCount: k.topicsStudiedCount,
      averageMastery: k.averageMastery,
      recentQuizzes: k.recentQuizzes.map((q) => ({
        id: q.id,
        topicSlug: q.topicSlug,
        status: q.status,
        scorePercent: q.scorePercent,
        correctCount: q.correctCount,
        totalQuestions: q.totalQuestions,
        tabSwitchCount: q.tabSwitchCount,
        pasteCount: q.pasteCount,
        rapidGuessCount: q.rapidGuessCount,
        hintsUsed: q.hintsUsed,
        integrityFlags: q.integrityFlags,
        startedAtIso: q.startedAt.toISOString(),
      })),
    }));
  }

  return (
    <GuardianDashboard
      activeLearnerId={learnerId}
      initialWatchedKids={watchedKids}
      navLearner={{
        nickname: navLearner.nickname,
        tier: navLearner.tier,
        targetGrade: navLearner.targetGrade,
        currentStreak: navLearner.currentStreak,
        reminderEnabled: navLearner.reminderEnabled,
      }}
      sessionInfo={
        acct
          ? {
              role: acct.role,
              displayName: acct.displayName,
              username: acct.username,
              watcherCode: acct.watcherCode,
              invitedParentEmail: acct.invitedParentEmail,
            }
          : null
      }
    />
  );
}
