import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getSkillMasteryByStudentId } from "@/lib/db/queries/mastery";
import { getStudentsByUserId } from "@/lib/db/queries/student";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).type === "guest") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const students = await getStudentsByUserId({ userId });
  const student = students[0] ?? null;
  if (!student) {
    return NextResponse.json({ student: null, skillMastery: [] });
  }

  const skillMastery = await getSkillMasteryByStudentId({
    studentId: student.id,
  });

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      schoolYear: student.schoolYear,
    },
    skillMastery,
  });
}
