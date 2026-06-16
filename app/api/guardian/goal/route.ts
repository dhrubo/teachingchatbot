import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createGoal, getStudentsByUserId } from "@/lib/db/queries/student";

export async function POST(req: Request) {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user as { type?: string }).type === "guest"
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { studentId, description, topic, targetDate } = body;

    if (!studentId || !description) {
      return NextResponse.json(
        { error: "Missing studentId or description" },
        { status: 400 }
      );
    }

    // Security: Verify the parent user owns this student profile
    const userId = session.user.id;
    const students = await getStudentsByUserId({ userId });
    const isOwner = students.some((s) => s.id === studentId);

    if (!isOwner) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const newGoal = await createGoal({
      studentId,
      description,
      topic: topic || null,
      targetDate: targetDate ? new Date(targetDate) : null,
      planSteps: [
        { label: "Basics", status: "todo" },
        { label: "Practice", status: "todo" },
        { label: "Mixed", status: "todo" },
        { label: "Exam-style", status: "todo" },
      ],
      progressPercent: 0,
    });

    return NextResponse.json(newGoal, { status: 201 });
  } catch (error) {
    console.error("Failed to create guardian goal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
