import { verifySecret } from "@/lib/auth/crypto";
import { setAuthSessionCookie } from "@/lib/auth/session";
import { findAccountForLogin } from "@/lib/db/queries/accounts";
import { ChatbotError } from "@/lib/errors";
import { loginRequestSchema } from "./schema";

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new ChatbotError("bad_request:auth").toResponse();
  }

  const parsed = loginRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return new ChatbotError("bad_request:auth", firstIssue).toResponse();
  }

  try {
    const data = parsed.data;
    if (data.mode === "password") {
      const acct = await findAccountForLogin(data.identifier);
      if (!acct || !verifySecret(data.password, acct.passwordHash)) {
        return new ChatbotError("unauthorized:auth").toResponse();
      }

      await setAuthSessionCookie({
        accountId: acct.id,
        role: acct.role,
        displayName: acct.displayName,
        username: acct.username,
        learnerId: acct.learnerId,
      });

      return Response.json({
        account: {
          id: acct.id,
          role: acct.role,
          displayName: acct.displayName,
          username: acct.username,
          learnerId: acct.learnerId,
          watcherCode: acct.watcherCode,
        },
      });
    }

    const acct = await findAccountForLogin(data.username);
    if (
      !acct ||
      acct.role !== "student" ||
      !verifySecret(data.pin, acct.pinHash)
    ) {
      return new ChatbotError(
        "unauthorized:auth",
        "Invalid kid username or 4-digit PIN."
      ).toResponse();
    }

    await setAuthSessionCookie({
      accountId: acct.id,
      role: "student",
      displayName: acct.displayName,
      username: acct.username,
      learnerId: acct.learnerId,
    });

    return Response.json({
      account: {
        id: acct.id,
        role: acct.role,
        displayName: acct.displayName,
        username: acct.username,
        learnerId: acct.learnerId,
        watcherCode: acct.watcherCode,
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
