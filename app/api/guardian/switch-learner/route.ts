import { getAuthSession } from "@/lib/auth/session";
import { verifyParentWatchesLearner } from "@/lib/db/queries/accounts";
import { ChatbotError } from "@/lib/errors";
import { setActiveLearnerCookie } from "@/lib/learner-session";
import { switchLearnerSchema } from "./schema";

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

  const parsed = switchLearnerSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const allowed = await verifyParentWatchesLearner(
      session.accountId,
      parsed.data.learnerId
    );
    if (!allowed) {
      return new ChatbotError("forbidden:guardian").toResponse();
    }

    await setActiveLearnerCookie(parsed.data.learnerId);
    return Response.json({ ok: true, activeLearnerId: parsed.data.learnerId });
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
