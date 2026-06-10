import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { checkAdminRateLimit } from "@/lib/ratelimit";
import { getRegularUsers, setUserApprovalStatus } from "@/lib/db/queries/admin";
import {
  getActiveMissionCount,
  getActiveMissions,
  getAllTopicRequests,
} from "@/lib/db/queries/topic-requests";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "admin") {
    return null;
  }
  return session;
}

// Admin-only: curriculum overview, topic requests, and signed-up users.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [topicRequests, missions, missionCount, users] = await Promise.all([
    getAllTopicRequests(),
    getActiveMissions(),
    getActiveMissionCount(),
    getRegularUsers(),
  ]);

  return NextResponse.json({
    topicRequests,
    missions: missions.sort((a, b) =>
      a.yearGroup === b.yearGroup
        ? a.title.localeCompare(b.title)
        : a.yearGroup - b.yearGroup
    ),
    missionCount,
    users,
  });
}

// Admin-only: approve / reject / reset a user's premium access.
export async function POST(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    await checkAdminRateLimit(adminSession.user.id);
  } catch {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const { userId, status } = (await req.json()) as {
    userId?: string;
    status?: string;
  };
  if (
    !userId ||
    !(status === "approved" || status === "rejected" || status === "pending")
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  await setUserApprovalStatus(userId, status);
  return NextResponse.json({ ok: true });
}
