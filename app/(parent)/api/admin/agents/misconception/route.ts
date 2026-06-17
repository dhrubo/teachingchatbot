import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { analyzeMisconceptions } from "@/lib/ai/agents/misconception-agent";
import { checkQuota } from "@/lib/ai/quota-monitor";

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

    // Quota check — skip LLM-based analysis when quota is tight (deterministic batch still runs)
    const quota = await checkQuota("misconception_analysis");
    if (!quota.allowed) {
      return NextResponse.json({
        analyses: [],
        totalWrong: 0,
        errors: ["Skipped — AI quota is near its daily limit. Deterministic batch analysis still runs."],
        queued: true,
      });
    }

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
