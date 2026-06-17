import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/client";
import {
  studentProfile,
  studentSkillMastery,
  studentMisconception,
  questionAttempt,
  studentGoal,
  weeklyReport,
} from "@/lib/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import {
  generateWeeklyInsight,
  buildPromptFromDashboardData,
} from "@/lib/ai/agents/guardian-insight";
import { logAICall } from "@/lib/db/queries/analytics";
import { checkQuota, invalidateQuotaCache } from "@/lib/ai/quota-monitor";

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
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId required" },
        { status: 400 }
      );
    }

    // Fetch student data
    const [student] = await db
      .select()
      .from(studentProfile)
      .where(eq(studentProfile.id, studentId))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Fetch mastery data
    const masteryData = await db
      .select()
      .from(studentSkillMastery)
      .where(eq(studentSkillMastery.studentId, studentId));

    // Fetch misconceptions
    const misconceptions = await db
      .select()
      .from(studentMisconception)
      .where(eq(studentMisconception.studentId, studentId))
      .orderBy(desc(studentMisconception.count))
      .limit(20);

    // Fetch recent attempts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAttempts = await db
      .select()
      .from(questionAttempt)
      .where(
        and(
          eq(questionAttempt.studentId, studentId),
          gte(questionAttempt.createdAt, thirtyDaysAgo)
        )
      )
      .orderBy(desc(questionAttempt.createdAt))
      .limit(50);

    // Fetch active goals
    const goals = await db
      .select()
      .from(studentGoal)
      .where(
        and(
          eq(studentGoal.studentId, studentId),
          sql`${studentGoal.status} != 'achieved'`
        )
      );

    // Build prompt and generate insight
    const promptData = buildPromptFromDashboardData(
      student,
      masteryData.map((m) => ({
        skillSlug: m.skillSlug,
        masteryScore: m.masteryScore,
        currentBand: m.currentBand,
        attempts: m.attempts,
        correct: m.correct,
      })),
      misconceptions.map((m) => ({
        skillSlug: m.skillSlug,
        misconception: m.misconception,
        count: m.count,
      })),
      recentAttempts.map((a) => ({
        skillSlug: a.skillSlug,
        isCorrect: a.isCorrect,
        createdAt: a.createdAt,
      })),
      goals.map((g) => ({
        description: g.description,
        status: g.status,
        targetDate: g.targetDate,
      }))
    );

    // Quota check — parent reports are deferrable
    const quota = await checkQuota("parent_report");
    if (!quota.allowed) {
      return NextResponse.json({
        report: null,
        insight: {
          strengths: [],
          weaknesses: [],
          revisionPriorities: [],
          confidenceTrend: "Report generation is queued — AI quota is near its daily limit.",
        },
        queued: true,
      });
    }

    const insight = await generateWeeklyInsight(promptData);

    // Log the AI call
    const candidates = (await import("@/lib/ai/providers")).getTutorProviderCandidates(true);
    const modelUsed = candidates[0]?.modelName ?? "unknown";

    try {
      await logAICall({
        studentId,
        purpose: "weekly_summary",
        modelUsed,
        promptTokens: 500,
        completionTokens: 200,
      });
    } catch {
      // Non-fatal
    }

    // Save to weeklyReport table
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [report] = await db
      .insert(weeklyReport)
      .values({
        studentId,
        summaryText: insight.summaryText,
        startOfWeek: weekAgo,
        endOfWeek: now,
      })
      .returning();

    return NextResponse.json({
      report,
      insight: {
        strengths: insight.strengths,
        weaknesses: insight.weaknesses,
        revisionPriorities: insight.revisionPriorities,
        confidenceTrend: insight.confidenceTrend,
      },
    });
  } catch (error) {
    console.error("[guardian-insight] error:", error);
    return NextResponse.json(
      { error: "Failed to generate insight" },
      { status: 500 }
    );
  }
}
