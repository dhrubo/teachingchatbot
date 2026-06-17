import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getDueReviews,
  getReviewsDueCount,
  getWeakRevisionSkills,
} from "@/lib/db/queries/learning-science";
import { getStudentProfile } from "@/lib/db/queries/student";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.type === "guest") {
    return NextResponse.json({ retrievalPractice: [], dueCount: 0 });
  }

  const student = await getStudentProfile(session.user.id);
  if (!student) {
    return NextResponse.json({ retrievalPractice: [], dueCount: 0 });
  }

  const [dueReviews, dueCount, weakSkills] = await Promise.all([
    getDueReviews(student.id, 5),
    getReviewsDueCount(student.id),
    getWeakRevisionSkills(student.id, 3),
  ]);

  return NextResponse.json({
    retrievalPractice: dueReviews.map((r) => ({
      skillSlug: r.skillSlug,
      masteryScore: r.masteryScore,
      confidence: r.confidence,
      intervalDays: r.intervalDays,
    })),
    dueCount,
    weakSkills: weakSkills.map((w) => ({
      skillSlug: w.skillSlug,
      masteryScore: w.masteryScore,
    })),
  });
}
