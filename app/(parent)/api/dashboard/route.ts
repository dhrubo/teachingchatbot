import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getStudentsByUserId } from "@/lib/db/queries/student";
import { getGoalsByStudentId } from "@/lib/db/queries/student";
import { getSkillMasteryByStudentId } from "@/lib/db/queries/mastery";
import { getTopicRequests } from "@/lib/db/queries/topic-requests";
import { getAIEfficiencyStats } from "@/lib/db/queries/analytics";
import { getReviewsDueCount } from "@/lib/db/queries/learning-science";
import { db } from "@/lib/db/client";
import { cookies } from "next/headers";
import { eq, desc, sql } from "drizzle-orm";
import {
  studentMisconception,
  weeklyReport,
  questionAttempt,
  mission,
  questionArchetype,
  studentConfidence,
  revisionQueue,
} from "@/lib/db/schema";

export async function GET(req: Request) {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user as { type?: string }).type === "guest"
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const studentIdParam = searchParams.get("studentId");

  try {
    // 1. Fetch all student profiles belonging to the logged-in parent
    const students = await getStudentsByUserId({ userId });

    if (students.length === 0) {
      const isAdmin = (session.user as { role?: string }).role === "admin";
      const topicRequests = isAdmin ? await getTopicRequests() : [];
      return NextResponse.json({
        students: [],
        student: null,
        skillMastery: [],
        misconceptions: [],
        goals: [],
        weeklyReports: [],
        efficiencyStats: null,
        topicRequests,
      });
    }

    // 2. Resolve active student profile
    const cookieStore = await cookies();
    const activeStudentIdCookie = cookieStore.get("active_student_id")?.value;
    const targetStudentId = studentIdParam || activeStudentIdCookie;

    const student = targetStudentId
      ? students.find((s) => s.id === targetStudentId) || students[0]
      : students[0];

    const studentId = student.id;

    // 3. Fetch active student profile details in parallel
    const [
      skillMastery,
      goals,
      dbWeeklyReports,
      dbMisconceptions,
      aiStats,
      attemptsCountResult,
      missions,
      archetypeMappings,
      reviewsDueCount,
      confidenceStats,
      revisionQueueItems,
    ] = await Promise.all([
      getSkillMasteryByStudentId({ studentId }),
      getGoalsByStudentId({ studentId }),
      db
        .select()
        .from(weeklyReport)
        .where(eq(weeklyReport.studentId, studentId))
        .orderBy(desc(weeklyReport.startOfWeek)),
      db
        .select()
        .from(studentMisconception)
        .where(eq(studentMisconception.studentId, studentId))
        .orderBy(desc(studentMisconception.lastSeenAt)),
      getAIEfficiencyStats(studentId),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(questionAttempt)
        .where(eq(questionAttempt.studentId, studentId)),
      db.select().from(mission).where(eq(mission.isActive, true)).orderBy(mission.order),
      db
        .selectDistinct({
          skillSlug: questionArchetype.skillSlug,
          missionSlug: questionArchetype.missionSlug,
        })
        .from(questionArchetype)
        .where(eq(questionArchetype.isActive, true)),
      getReviewsDueCount(studentId),
      db
        .select({
          skillSlug: studentConfidence.skillSlug,
          confidence: studentConfidence.confidence,
          updatedAt: studentConfidence.updatedAt,
        })
        .from(studentConfidence)
        .where(eq(studentConfidence.studentId, studentId))
        .orderBy(desc(studentConfidence.updatedAt))
        .limit(5),
      db
        .select()
        .from(revisionQueue)
        .where(eq(revisionQueue.studentId, studentId))
        .orderBy(revisionQueue.nextReviewDate)
        .limit(10),
    ]);

    // 4. Calculate dynamic mission-level masteries
    const skillToMission = new Map<string, string>();
    for (const mapping of archetypeMappings) {
      skillToMission.set(mapping.skillSlug, mapping.missionSlug);
    }

    const missionScores = new Map<string, number[]>();
    for (const mastery of skillMastery) {
      const mSlug = skillToMission.get(mastery.skillSlug);
      if (mSlug) {
        if (!missionScores.has(mSlug)) {
          missionScores.set(mSlug, []);
        }
        missionScores.get(mSlug)!.push(mastery.masteryScore);
      }
    }

    const missionsWithMastery = missions.map((m) => {
      const scores = missionScores.get(m.slug) || [];
      const averageScore =
        scores.length > 0
          ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length)
          : null;
      return {
        slug: m.slug,
        title: m.title,
        description: m.description,
        yearGroup: m.yearGroup,
        gcseDomain: m.gcseDomain,
        masteryScore: averageScore,
        skillsAttempted: scores.length,
      };
    });

    // 5. Generate mock parent report if none exists in database
    const weeklyReports =
      dbWeeklyReports.length > 0
        ? dbWeeklyReports
        : [
            {
              id: "mock-weekly-report-01",
              studentId,
              summaryText: `Your child, ${student.name}, has been making steady progress this week! They've tackled core maths topics, demonstrating high confidence in basic arithmetic. We noticed a tiny misconception around minus sign distribution in algebra, which they successfully reviewed. For the upcoming week, we highly recommend working on Ratio and Proportion topics to build secure problem-solving speed.`,
              startOfWeek: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              endOfWeek: new Date(),
              createdAt: new Date(),
            },
          ];

    // 6. Compute AI Cost/Token Efficiency Stats
    const totalAttempts = attemptsCountResult[0]?.count ?? 0;
    const totalCalls = aiStats.totalCalls;
    const totalTokens = aiStats.totalPromptTokens + aiStats.totalCompletionTokens;
    const tokensSaved = aiStats.totalSavedTokens;
    const efficiencyPercentage =
      totalAttempts + totalCalls > 0
        ? Math.round((totalAttempts / (totalAttempts + totalCalls)) * 100)
        : 100;

    const efficiencyStats = {
      totalCalls,
      totalTokens,
      tokensSaved,
      totalAttempts,
      efficiencyPercentage,
    };

    const isAdmin = (session.user as { role?: string }).role === "admin";
    const topicRequests = isAdmin ? await getTopicRequests() : [];

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        schoolYear: s.schoolYear,
        xp: s.xp,
        streak: s.streak,
        badges: s.badges,
      })),
      student: {
        id: student.id,
        name: student.name,
        schoolYear: student.schoolYear,
        xp: student.xp,
        streak: student.streak,
        badges: student.badges,
        selectedSubjects: student.selectedSubjects,
        examBoard: student.examBoard,
      },
      skillMastery,
      missionsWithMastery,
      misconceptions: dbMisconceptions,
      goals,
      weeklyReports,
      efficiencyStats,
      topicRequests,
      reviewsDueCount,
      confidenceStats,
      revisionQueueItems,
    });
  } catch (error) {
    console.error("Failed to load parent dashboard api:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
