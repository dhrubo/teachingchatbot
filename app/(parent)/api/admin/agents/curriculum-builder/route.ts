import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { runCurriculumBuilder } from "@/lib/ai/agents/curriculum-builder";
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
    const { subject, yearGroup, examBoard } = body;

    if (!subject || !yearGroup) {
      return NextResponse.json(
        { error: "subject and yearGroup are required" },
        { status: 400 }
      );
    }

    // Quota check — curriculum generation is expensive, only proceed when green
    const quota = await checkQuota("curriculum_generation");
    if (!quota.allowed) {
      return NextResponse.json({
        error: "AI quota is near its daily limit. Try again tomorrow.",
        queued: true,
      }, { status: 429 });
    }

    const result = await runCurriculumBuilder({
      subject,
      yearGroup: Number(yearGroup),
      examBoard: examBoard ?? "AQA",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[curriculum-builder] error:", error);
    return NextResponse.json(
      { error: "Curriculum generation failed" },
      { status: 500 }
    );
  }
}
