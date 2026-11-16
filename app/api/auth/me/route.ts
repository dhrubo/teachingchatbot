import { getAuthSession } from "@/lib/auth/session";
import {
  getAccountById,
  getWatchedLearnersForParent,
} from "@/lib/db/queries/accounts";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return Response.json({ session: null });
  }

  const acct = await getAccountById(session.accountId);
  if (!acct) {
    return Response.json({ session: null });
  }

  if (acct.role === "parent") {
    const kids = await getWatchedLearnersForParent(acct.id);
    return Response.json({
      session: {
        accountId: acct.id,
        role: acct.role,
        displayName: acct.displayName,
        username: acct.username,
        email: acct.email,
        learnerId: null,
        watchedKidsCount: kids.length,
      },
    });
  }

  return Response.json({
    session: {
      accountId: acct.id,
      role: acct.role,
      displayName: acct.displayName,
      username: acct.username,
      email: acct.email,
      learnerId: acct.learnerId,
      watcherCode: acct.watcherCode,
      invitedParentEmail: acct.invitedParentEmail,
    },
  });
}
