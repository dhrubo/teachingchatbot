import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getSkillMasteryByStudentId } from "@/lib/db/queries/mastery";
import { getStudentsByUserId } from "@/lib/db/queries/student";
import { getTopicRequests } from "@/lib/db/queries/topic-requests";

export async function GET() {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user as { type?: string }).type === "guest"
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const students = await getStudentsByUserId({ userId });
  const student = students[0] ?? null;

  // Requested (curriculum-gap) topics are ADMIN-only info.
  const isAdmin = (session.user as { role?: string }).role === "admin";
  const topicRequests = isAdmin ? await getTopicRequests() : [];

  if (!student) {
    return NextResponse.json({
      student: null,
      skillMastery: [],
      topicRequests,
    });
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
    topicRequests,
  });
}
