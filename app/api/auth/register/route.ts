import { hashSecret } from "@/lib/auth/crypto";
import { setAuthSessionCookie } from "@/lib/auth/session";
import { DEFAULT_LEARNER_ID } from "@/lib/constants";
import {
  createParentAccount,
  createStudentAccount,
} from "@/lib/db/queries/accounts";
import { ChatbotError } from "@/lib/errors";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";
import { registerRequestSchema } from "./schema";

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new ChatbotError("bad_request:auth").toResponse();
  }

  const parsed = registerRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return new ChatbotError("bad_request:auth", firstIssue).toResponse();
  }

  try {
    const data = parsed.data;
    if (data.role === "parent") {
      const parentAccount = await createParentAccount({
        displayName: data.displayName,
        username: data.username,
        email: data.email,
        passwordHash: hashSecret(data.password),
      });

      await setAuthSessionCookie({
        accountId: parentAccount.id,
        role: "parent",
        displayName: parentAccount.displayName,
        username: parentAccount.username,
        learnerId: null,
      });

      return Response.json({
        account: {
          id: parentAccount.id,
          role: parentAccount.role,
          displayName: parentAccount.displayName,
          username: parentAccount.username,
          learnerId: null,
          watcherCode: null,
        },
      });
    }

    const currentCookieLearnerId = await resolveLearnerIdFromCookies();
    const guestLearnerId =
      currentCookieLearnerId !== DEFAULT_LEARNER_ID
        ? currentCookieLearnerId
        : null;

    const { account: studentAccount } = await createStudentAccount({
      displayName: data.displayName,
      username: data.username,
      email: data.email || null,
      passwordHash: hashSecret(data.password),
      pinHash: data.pin ? hashSecret(data.pin) : null,
      tier: data.tier,
      targetGrade: data.targetGrade,
      invitedParentEmail: data.invitedParentEmail || null,
      existingGuestLearnerId: guestLearnerId,
    });

    await setAuthSessionCookie({
      accountId: studentAccount.id,
      role: "student",
      displayName: studentAccount.displayName,
      username: studentAccount.username,
      learnerId: studentAccount.learnerId,
    });

    return Response.json({
      account: {
        id: studentAccount.id,
        role: studentAccount.role,
        displayName: studentAccount.displayName,
        username: studentAccount.username,
        learnerId: studentAccount.learnerId,
        watcherCode: studentAccount.watcherCode,
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
