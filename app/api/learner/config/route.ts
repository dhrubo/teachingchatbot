import { type NextRequest, NextResponse } from "next/server";
import { getAiSetupStatus } from "@/lib/ai/providers";
import {
  getOrCreateLearner,
  updateLearnerConfig,
} from "@/lib/db/queries/learners";
import {
  getLearnerTopicProgress,
  getRecentPracticeLogs,
} from "@/lib/db/queries/progress";
import { getLearnerPushSubscriptions } from "@/lib/db/queries/reminders";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import { getOrInitVapidKeys } from "@/lib/reminders/web-push";
import { learnerConfigPatchSchema } from "./schema";

export async function GET() {
  const learnerId = await ensureLearnerCookie();
  const [learner, progress, practiceLogs, pushSubs] = await Promise.all([
    getOrCreateLearner(learnerId),
    getLearnerTopicProgress(learnerId),
    getRecentPracticeLogs(learnerId, 14),
    getLearnerPushSubscriptions(learnerId),
  ]);

  const vapid = getOrInitVapidKeys();

  return NextResponse.json({
    learner,
    progress,
    practiceLogs,
    pushSubscriptionCount: pushSubs.length,
    vapidPublicKey: vapid?.publicKey ?? null,
    setup: getAiSetupStatus(),
  });
}

export async function PATCH(request: NextRequest) {
  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid JSON body"
    ).toResponse();
  }

  const parsed = learnerConfigPatchSchema.safeParse(rawJson);
  if (!parsed.success) {
    return new ChatbotError(
      "bad_request:api",
      parsed.error.issues[0]?.message
    ).toResponse();
  }

  const learnerId = await ensureLearnerCookie();
  const updated = await updateLearnerConfig(learnerId, parsed.data);

  return NextResponse.json({ learner: updated });
}
