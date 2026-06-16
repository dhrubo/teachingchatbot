import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { analyzeMisconceptions } from "@/lib/ai/agents/misconception-agent";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "admin") {
    return null;
  }
  return session;
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const days = body.days ? parseInt(body.days) : 30;
    const minWrongAnswers = body.minWrongAnswers
      ? parseInt(body.minWrongAnswers)
      : 3;

    const result = await analyzeMisconceptions({ days, minWrongAnswers });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[misconception-agent] error:", error);
    return NextResponse.json(
      { error: "Failed to analyze misconceptions" },
      { status: 500 }
    );
  }
}
