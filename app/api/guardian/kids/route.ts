import { hashSecret } from "@/lib/auth/crypto";
import { getAuthSession } from "@/lib/auth/session";
import {
  createStudentAccount,
  getWatchedLearnersForParent,
} from "@/lib/db/queries/accounts";
import { ChatbotError } from "@/lib/errors";
import {
  resolveLearnerIdFromCookies,
  setActiveLearnerCookie,
} from "@/lib/learner-session";
import { createKidByParentSchema } from "./schema";

export async function GET() {
  const session = await getAuthSession();
  if (!session || session.role !== "parent") {
    return new ChatbotError("unauthorized:guardian").toResponse();
  }

  try {
    const [kids, activeLearnerId] = await Promise.all([
      getWatchedLearnersForParent(session.accountId),
      resolveLearnerIdFromCookies(),
    ]);
    return Response.json({
      kids,
      activeLearnerId,
    });
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

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session || session.role !== "parent") {
    return new ChatbotError("unauthorized:guardian").toResponse();
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const parsed = createKidByParentSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return new ChatbotError("bad_request:auth", firstIssue).toResponse();
  }

  try {
    const data = parsed.data;
    const { account: kidAccount, learner } = await createStudentAccount({
      displayName: data.displayName,
      username: data.username,
      pinHash: hashSecret(data.pin),
      passwordHash: data.password ? hashSecret(data.password) : null,
      tier: data.tier,
      targetGrade: data.targetGrade,
      createdByParentId: session.accountId,
    });

    await setActiveLearnerCookie(learner.id);

    return Response.json({
      kid: {
        learner,
        studentUsername: kidAccount.username,
        watcherCode: kidAccount.watcherCode,
      },
    });
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
