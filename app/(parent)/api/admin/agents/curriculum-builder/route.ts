import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { runCurriculumBuilder } from "@/lib/ai/agents/curriculum-builder";

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
