// app/(chat)/api/app/config/route.ts
// Returns server config + per-user question count. The client uses this to
// adapt the UI (show registration cards, gate features).

import { auth } from "@/app/(auth)/auth";
import { getAppConfig } from "@/lib/app-config";
import { getMessageCountByUserId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const config = getAppConfig();
  const isGuest = session.user.type === "guest";

  // Count user messages in the last 24h (for guest daily limit).
  const questionsUsed = await getMessageCountByUserId({
    id: session.user.id,
    differenceInHours: 24,
  });

  return Response.json({
    mode: config.mode,
    isGuest,
    questionLimit: isGuest ? config.guestDailyQuestionLimit : null,
    questionsUsed,
    retentionHours: isGuest ? config.freeChatRetentionHours : null,
  });
}
