import type { NextRequest } from "next/server";
import { deleteExpiredGuestChats } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

// Scheduled cleanup: purge guest chat history older than 24h. Triggered by the
// Vercel cron defined in vercel.json, which sends `Authorization: Bearer
// <CRON_SECRET>`. Also callable manually with the same header.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  // Require the secret in production. If CRON_SECRET is unset (e.g. local dev),
  // allow the call so it can be exercised manually.
  if (secret && authHeader !== `Bearer ${secret}`) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const result = await deleteExpiredGuestChats({ olderThanHours: 24 });

  return Response.json(result, { status: 200 });
}
