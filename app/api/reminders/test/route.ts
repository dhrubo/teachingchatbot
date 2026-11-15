import { NextResponse } from "next/server";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import {
  getLearnerPushSubscriptions,
  removePushSubscriptionByEndpoint,
} from "@/lib/db/queries/reminders";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import { sendWebPushNotification } from "@/lib/reminders/web-push";

export async function POST() {
  const learnerId = await ensureLearnerCookie();
  const [learner, subs] = await Promise.all([
    getOrCreateLearner(learnerId),
    getLearnerPushSubscriptions(learnerId),
  ]);

  if (subs.length === 0) {
    return new ChatbotError(
      "bad_request:reminders",
      "No active push subscription found on this device yet. Enable browser notifications first."
    ).toResponse();
  }

  let sentCount = 0;
  let lastError: string | undefined;

  for (const sub of subs) {
    const res = await sendWebPushNotification(
      {
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
      {
        title: `🦌 Keep your ${Math.max(1, learner.currentStreak)}-day GCSE Maths streak!`,
        body: `Ready for a quick ${learner.dailyGoalMinutes}-minute voice check on Edexcel Maths, ${learner.nickname}?`,
        url: "/warmup",
        tag: "ranedeer-daily-test",
      }
    );

    if (res.sent) {
      sentCount += 1;
    } else {
      lastError = res.error;
      if (res.gone) {
        await removePushSubscriptionByEndpoint(learnerId, sub.endpoint);
      }
    }
  }

  if (sentCount === 0) {
    return new ChatbotError(
      "bad_request:reminders",
      lastError ?? "Test notification could not be delivered"
    ).toResponse();
  }

  return NextResponse.json({ sentCount });
}
