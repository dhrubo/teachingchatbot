import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { buildQuiz } from "@/lib/ai/agents/quiz-builder";

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
    const { subject, yearGroup, examBoard, title, numQuestions } = body;

    if (!subject || !yearGroup) {
      return NextResponse.json(
        { error: "subject and yearGroup required" },
        { status: 400 }
      );
    }

    const result = await buildQuiz({
      subject,
      yearGroup: parseInt(yearGroup),
      examBoard: examBoard ?? "AQA",
      title: title ?? `${subject} Year ${yearGroup} Quiz`,
      numQuestions: Math.min(Math.max(parseInt(numQuestions ?? "10"), 1), 50),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[quiz-builder] error:", error);
    return NextResponse.json(
      { error: "Failed to build quiz" },
      { status: 500 }
    );
  }
}
