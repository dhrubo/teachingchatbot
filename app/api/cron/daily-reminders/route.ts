import { type NextRequest, NextResponse } from "next/server";
import { getDueWarmupTopics } from "@/lib/curriculum/edexcel-1ma1";
import { listLearnersWithRemindersEnabled } from "@/lib/db/queries/learners";
import { getLearnerTopicProgress } from "@/lib/db/queries/progress";
import {
  getLearnerPushSubscriptions,
  markPushSubscriptionNotified,
  removePushSubscriptionByEndpoint,
} from "@/lib/db/queries/reminders";
import { ChatbotError } from "@/lib/errors";
import { shouldSendDailyReminderNow } from "@/lib/reminders/streaks";
import { sendWebPushNotification } from "@/lib/reminders/web-push";

export const maxDuration = 60;

async function handleCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new ChatbotError("unauthorized:reminders").toResponse();
    }
  }

  const ignoreHour = request.nextUrl.searchParams.get("mode") === "daily-sweep";
  const learners = await listLearnersWithRemindersEnabled();

  let checked = 0;
  let notificationsSent = 0;

  for (const learner of learners) {
    checked += 1;
    const eligibility = shouldSendDailyReminderNow({
      reminderEnabled: learner.reminderEnabled,
      reminderHour: learner.reminderHour,
      timezone: learner.timezone,
      lastPracticedDate: learner.lastPracticedDate,
      ignoreHourMatch: ignoreHour,
    });

    if (!eligibility.shouldSend) {
      continue;
    }

    const [subs, progress] = await Promise.all([
      getLearnerPushSubscriptions(learner.id),
      getLearnerTopicProgress(learner.id),
    ]);

    const nextTopic = getDueWarmupTopics(progress, learner.tier)[0];
    const topicLabel = nextTopic?.title ?? "Compound Interest";
    const streakLabel =
      learner.currentStreak > 0
        ? `🔥 Protect your ${learner.currentStreak}-day streak!`
        : "🦌 Time for your daily 5-min GCSE Maths voice session!";

    for (const sub of subs) {
      if (sub.lastNotifiedDate === eligibility.todayDate) {
        continue;
      }

      const res = await sendWebPushNotification(
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        {
          title: streakLabel,
          body: `${learner.nickname}, let's master ${topicLabel} in ${learner.dailyGoalMinutes} minutes — explained your way.`,
          url: "/warmup",
          tag: `ranedeer-${eligibility.todayDate}`,
        }
      );

      if (res.sent) {
        notificationsSent += 1;
        await markPushSubscriptionNotified(sub.id, eligibility.todayDate);
      } else if (res.gone) {
        await removePushSubscriptionByEndpoint(learner.id, sub.endpoint);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    learnersChecked: checked,
    notificationsSent,
  });
}

export function GET(request: NextRequest) {
  return handleCron(request);
}

export function POST(request: NextRequest) {
  return handleCron(request);
}
