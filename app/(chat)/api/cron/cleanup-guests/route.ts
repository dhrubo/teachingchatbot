import type { NextRequest } from "next/server";
import { getAppConfig } from "@/lib/app-config";
import { deleteExpiredGuestChats } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const config = getAppConfig();
  const result = await deleteExpiredGuestChats({
    olderThanHours: config.freeChatRetentionHours,
  });

  return Response.json(result, { status: 200 });
}
