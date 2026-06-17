import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getStudentProfile } from "@/lib/db/queries/student";
import {
  runBatchMisconceptionAnalysis,
  countRecentWrongAnswers,
} from "@/lib/learning-science/batch-misconception-analysis";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.type === "guest") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentProfile = await getStudentProfile(session.user.id);
  if (!studentProfile) {
    return NextResponse.json({ error: "No student profile found" }, { status: 404 });
  }

  const wrongCount = await countRecentWrongAnswers(studentProfile.id);
  if (wrongCount === 0) {
    return NextResponse.json({
      analyzed: false,
      reasons: ["No wrong answers to analyze yet"],
      skillsAnalyzed: 0,
      weaknessesUpserted: 0,
    });
  }

  const result = await runBatchMisconceptionAnalysis(studentProfile.id);

  return NextResponse.json({
    ...result,
    wrongCount,
    message: result.analyzed
      ? `Analyzed ${result.skillsAnalyzed} skill groups, upserted ${result.weaknessesUpserted} weaknesses`
      : "No analysis performed",
  });
}
