import { SettingsClient } from "@/components/reminders/settings-client";
import { getAiSetupStatus } from "@/lib/ai/providers";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import { getLearnerPushSubscriptions } from "@/lib/db/queries/reminders";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";
import { getOrInitVapidKeys } from "@/lib/reminders/web-push";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const learnerId = await resolveLearnerIdFromCookies();
  const [learner, pushSubs] = await Promise.all([
    getOrCreateLearner(learnerId),
    getLearnerPushSubscriptions(learnerId),
  ]);

  const vapid = getOrInitVapidKeys();

  return (
    <SettingsClient
      initialLearner={{
        nickname: learner.nickname,
        tier: learner.tier,
        targetGrade: learner.targetGrade,
        preferredLens: learner.preferredLens,
        toneStyle: learner.toneStyle,
        speechSpeed: learner.speechSpeed,
        dailyGoalMinutes: learner.dailyGoalMinutes,
        reminderEnabled: learner.reminderEnabled,
        reminderHour: learner.reminderHour,
        reminderMinute: learner.reminderMinute,
        timezone: learner.timezone,
        currentStreak: learner.currentStreak,
        longestStreak: learner.longestStreak,
        streakFreezes: learner.streakFreezes,
        totalXp: learner.totalXp,
      }}
      pushSubscriptionCount={pushSubs.length}
      setup={getAiSetupStatus()}
      vapidPublicKey={vapid?.publicKey ?? null}
    />
  );
}
