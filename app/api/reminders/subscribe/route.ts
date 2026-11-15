import { type NextRequest, NextResponse } from "next/server";
import { updateLearnerConfig } from "@/lib/db/queries/learners";
import {
  removePushSubscriptionByEndpoint,
  savePushSubscription,
} from "@/lib/db/queries/reminders";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import { pushSubscribePostSchema, pushUnsubscribeDeleteSchema } from "./schema";

export async function POST(request: NextRequest) {
  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return new ChatbotError(
      "bad_request:reminders",
      "Invalid JSON body"
    ).toResponse();
  }

  const parsed = pushSubscribePostSchema.safeParse(rawJson);
  if (!parsed.success) {
    return new ChatbotError(
      "bad_request:reminders",
      parsed.error.issues[0]?.message
    ).toResponse();
  }

  const learnerId = await ensureLearnerCookie();
  const { subscription, reminderHour, reminderMinute, timezone } = parsed.data;

  const saved = await savePushSubscription({
    learnerId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const learner = await updateLearnerConfig(learnerId, {
    reminderEnabled: true,
    ...(reminderHour !== undefined ? { reminderHour } : {}),
    ...(reminderMinute !== undefined ? { reminderMinute } : {}),
    ...(timezone ? { timezone } : {}),
  });

  return NextResponse.json({
    subscribed: true,
    subscriptionId: saved.id,
    learner,
  });
}

export async function DELETE(request: NextRequest) {
  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return new ChatbotError(
      "bad_request:reminders",
      "Invalid JSON body"
    ).toResponse();
  }

  const parsed = pushUnsubscribeDeleteSchema.safeParse(rawJson);
  if (!parsed.success) {
    return new ChatbotError(
      "bad_request:reminders",
      parsed.error.issues[0]?.message
    ).toResponse();
  }

  const learnerId = await ensureLearnerCookie();
  await removePushSubscriptionByEndpoint(learnerId, parsed.data.endpoint);
  const learner = await updateLearnerConfig(learnerId, {
    reminderEnabled: false,
  });

  return NextResponse.json({ unsubscribed: true, learner });
}
