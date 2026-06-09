import { auth } from "@/app/(auth)/auth";
import { getMission, getMissionsByYear } from "@/lib/ai/missions";
import { getStudentMissionProgress } from "@/lib/db/queries/mission";
import { getStudentsByUserId } from "@/lib/db/queries/student";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).type === "guest") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id!;
  const students = await getStudentsByUserId({ userId });
  const student = students[0] ?? null;
  if (!student) {
    return NextResponse.json({ student: null, progress: [] });
  }
  const year = (student.schoolYear ?? 8).toString() as "8" | "9";
  const progress = await getStudentMissionProgress(student.id);
  const missions = getMissionsByYear(year);
  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      schoolYear: student.schoolYear,
    },
    missions: missions.map((m) => ({
      id: m.id,
      title: m.title,
      emoji: m.emoji,
      description: m.description,
    })),
    progress: progress.map((p) => ({
      missionId: p.missionId,
      status: p.status,
      score: p.score,
      challengesDone: p.challengesDone,
      challengesTotal: p.challengesTotal,
      completedAt: p.completedAt,
    })),
  });
}
