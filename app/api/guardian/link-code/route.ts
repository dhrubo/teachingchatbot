import { getAuthSession } from "@/lib/auth/session";
import {
  inviteParentWatcherByEmail,
  linkParentToKidByWatcherCode,
} from "@/lib/db/queries/accounts";
import { ChatbotError } from "@/lib/errors";
import { guardianLinkRequestSchema } from "./schema";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const parsed = guardianLinkRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return new ChatbotError("bad_request:api", firstIssue).toResponse();
  }

  try {
    const data = parsed.data;
    if (data.mode === "watcher_code") {
      if (session.role !== "parent") {
        return new ChatbotError("unauthorized:guardian").toResponse();
      }

      const linked = await linkParentToKidByWatcherCode({
        parentAccountId: session.accountId,
        watcherCode: data.watcherCode,
      });

      return Response.json({
        linked: true,
        learnerNickname: linked.learner.nickname,
        studentUsername: linked.studentAccount.username,
      });
    }

    if (session.role !== "student") {
      return new ChatbotError(
        "bad_request:auth",
        "Only student profiles can set an invited parent email."
      ).toResponse();
    }

    const result = await inviteParentWatcherByEmail({
      studentAccountId: session.accountId,
      parentEmail: data.parentEmail,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError(
      "bad_request:database",
      error instanceof Error ? error.message : String(error)
    ).toResponse();
  }
}
