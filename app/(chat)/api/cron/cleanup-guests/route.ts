import type { NextRequest } from "next/server";
import { getAppConfig } from "@/lib/app-config";
import { deleteExpiredGuestChats } from "@/lib/db/queries";
import { deleteExpiredGuestQuestionData } from "@/lib/db/queries/questions";
import { ChatbotError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const config = getAppConfig();
  const [chats, questionData] = await Promise.all([
    deleteExpiredGuestChats({
      olderThanHours: config.freeChatRetentionHours,
    }),
    // Same retention window, same guest-only scope — added alongside the
    // server-authoritative QuestionInstance table so guest question/attempt
    // rows don't silently persist forever while guest chats already expire.
    deleteExpiredGuestQuestionData({
      olderThanHours: config.freeChatRetentionHours,
    }),
  ]);

  return Response.json({ ...chats, ...questionData }, { status: 200 });
}
