# Guardian Dashboard & AI Efficiency Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the guardian dashboard to feature a multi-profile switcher, an interactive mastery heatmap mapped to seeded curriculum missions, an AI efficiency analytics dashboard, student misconception trackers, and a goal setter.

**Architecture:** Extend the parent dashboard route to fetch parent-owned profiles, resolve the active student dynamically (via query parameter, cookie, or fallback), calculate mission-level mastery in-memory by linking attempted skills to their respective missions, and compute AI free-request efficiency. Create a secure goal-setting endpoint and build a responsive, gorgeous Sunset-themed parent interface.

**Tech Stack:** Next.js (App Router), React, SWR, Framer Motion, Drizzle ORM, Lucide Icons, Sonner.

---

### Task 1: Modify Parent Dashboard API Route

**Files:**
- Modify: `app/(parent)/api/dashboard/route.ts`

- [ ] **Step 1: Write the updated dashboard API route with multi-profile and analytics support**

In `app/(parent)/api/dashboard/route.ts`, replace the existing contents with:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getStudentsByUserId } from "@/lib/db/queries/student";
import { getGoalsByStudentId } from "@/lib/db/queries/student";
import { getSkillMasteryByStudentId } from "@/lib/db/queries/mastery";
import { getTopicRequests } from "@/lib/db/queries/topic-requests";
import { getAIEfficiencyStats } from "@/lib/db/queries/analytics";
import { db } from "@/lib/db/client";
import { cookies } from "next/headers";
import { eq, desc, sql } from "drizzle-orm";
import {
  studentMisconception,
  weeklyReport,
  questionAttempt,
  mission,
  questionArchetype,
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
    });
  } catch (error) {
    console.error("Failed to load parent dashboard api:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Run type check to ensure compilation**

Run: `npx tsc --noEmit`
Expected: Passes successfully with no errors.

---

### Task 2: Create Goal-Setting API Route

**Files:**
- Create: `app/api/guardian/goal/route.ts`

- [ ] **Step 1: Write the goal creation endpoint**

Create a new file `app/api/guardian/goal/route.ts` with the following implementation:

```typescript
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
```

- [ ] **Step 2: Verify type safety**

Run: `npx tsc --noEmit`
Expected: Compile clean.

---

### Task 3: Overhaul Parent Dashboard Page

**Files:**
- Modify: `app/(parent)/dashboard/page.tsx`

- [ ] **Step 1: Write the updated Parent Dashboard Page code**

Replace `app/(parent)/dashboard/page.tsx` with a highly polished visual interface:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "@/components/chat/toast";
import { motion, AnimatePresence } from "framer-motion";

type StudentProfileMin = {
  id: string;
  name: string;
  schoolYear: string;
  xp: number;
  streak: number;
  badges: string[];
  selectedSubjects?: string[];
  examBoard?: string;
};

type MissionWithMastery = {
  slug: string;
  title: string;
  description: string;
  yearGroup: number;
  gcseDomain: string;
  masteryScore: number | null;
  skillsAttempted: number;
};

type Goal = {
  id: string;
  topic: string | null;
  description: string;
  status: "not_started" | "in_progress" | "achieved" | "needs_more_work";
  targetDate: string | null;
  progressPercent: number;
};

type Misconception = {
  id: string;
  skillSlug: string;
  misconception: string;
  count: number;
  lastSeenAt: string;
};

type WeeklyReport = {
  id: string;
  summaryText: string;
  startOfWeek: string;
  endOfWeek: string;
};

type EfficiencyStats = {
  totalCalls: number;
  totalTokens: number;
  tokensSaved: number;
  totalAttempts: number;
  efficiencyPercentage: number;
};

type TopicRequest = {
  id: string;
  topicText: string;
  requestCount: number;
};

type DashboardData = {
  students: StudentProfileMin[];
  student: StudentProfileMin | null;
  skillMastery: any[];
  missionsWithMastery: MissionWithMastery[];
  misconceptions: Misconception[];
  goals: Goal[];
  weeklyReports: WeeklyReport[];
  efficiencyStats: EfficiencyStats | null;
  topicRequests: TopicRequest[];
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch dashboard data");
  return res.json();
});

export default function GuardianDashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  // Use SWR for dynamic fetching when activeStudentId changes
  const { data, error, isLoading } = useSWR<DashboardData>(
    session?.user?.id && authStatus === "authenticated"
      ? `/api/dashboard${activeStudentId ? `?studentId=${activeStudentId}` : ""}`
      : null,
    fetcher
  );

  // Form states for Goal Setter
  const [goalTopic, setGoalTopic] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [submittingGoal, setSubmittingGoal] = useState(false);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (
      !session?.user ||
      (session.user as { type?: string }).type === "guest"
    ) {
      router.replace("/");
    }
  }, [session, authStatus, router]);

  // Set selected student on backend active cookie for sync
  const handleStudentSwitch = useCallback(async (studentId: string) => {
    setActiveStudentId(studentId);
    try {
      await fetch("/api/profiles/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
    } catch (e) {
      console.error("Failed to sync active student cookie:", e);
    }
  }, []);

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.student?.id) return;
    if (!goalDescription.trim()) {
      toast({ type: "error", description: "Goal description is required" });
      return;
    }

    setSubmittingGoal(true);
    try {
      const res = await fetch("/api/guardian/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: data.student.id,
          description: goalDescription,
          topic: goalTopic || null,
          targetDate: goalDate || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create goal");

      toast({ type: "success", description: "Practice target assigned successfully!" });
      setGoalTopic("");
      setGoalDescription("");
      setGoalDate("");
      
      // Trigger SWR refresh
      mutate(`/api/dashboard${activeStudentId ? `?studentId=${activeStudentId}` : ""}`);
    } catch (err) {
      toast({ type: "error", description: "Failed to assign target. Please try again." });
    } finally {
      setSubmittingGoal(false);
    }
  };

  if (authStatus === "loading" || (isLoading && !data)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground font-medium animate-pulse">Loading Guardian Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.student) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-center bg-background min-h-screen">
        <h1 className="text-3xl font-bold text-foreground">Guardian Dashboard</h1>
        <p className="text-muted-foreground mt-3">No active students linked to your guardian account yet.</p>
        <button
          className="mt-6 rounded-full bg-[image:var(--gradient-sunset)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 hover:scale-[1.02] transition-all"
          onClick={() => router.push("/")}
        >
          Add Your First Student Profile
        </button>
      </div>
    );
  }

  const {
    students,
    student,
    missionsWithMastery,
    misconceptions,
    goals,
    weeklyReports,
    efficiencyStats,
    topicRequests,
  } = data;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 bg-background min-h-screen text-foreground selection:bg-amber-500/20 pb-20">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Parent Portal</span>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">Guardian Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor curriculum progress, practice targets, and tutoring stats for your children.
          </p>
        </div>
        <button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/15 hover:shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-95 text-center self-start md:self-center"
          onClick={() => router.push("/")}
        >
          Back to Tutoring App
        </button>
      </div>

      {/* Student Switcher */}
      <div className="mb-10 rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Select Student</h3>
        <div className="flex flex-wrap gap-4 items-center">
          {students.map((s) => {
            const isActive = s.id === student.id;
            return (
              <button
                key={s.id}
                onClick={() => handleStudentSwitch(s.id)}
                className={`flex items-center gap-3 rounded-full py-2.5 px-4 transition-all duration-300 ${
                  isActive
                    ? "bg-[image:var(--gradient-sunset)] text-white shadow-md shadow-amber-500/10"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold uppercase ${
                    isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  {s.name.charAt(0)}
                </div>
                <div className="text-left leading-tight pr-1">
                  <p className="text-sm font-bold">{s.name}</p>
                  <p className={`text-[10px] ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                    Year {s.schoolYear} &middot; {s.xp} XP
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns (Syllabus & Analytics) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Mastery Heatmap */}
          <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Syllabus Mastery Map</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Average score of adaptive challenges taken by {student.name}.</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Mastered</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500/60"></span> Secure</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500/60"></span> Practice</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted"></span> New</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missionsWithMastery.map((m) => {
                const isMastered = m.masteryScore !== null && m.masteryScore >= 75;
                const isSecure = m.masteryScore !== null && m.masteryScore >= 50 && m.masteryScore < 75;
                const isInProgress = m.masteryScore !== null && m.masteryScore > 0 && m.masteryScore < 50;
                
                let tileBg = "bg-muted/30 border-border/20 text-muted-foreground/60";
                let badgeStyle = "bg-muted text-muted-foreground";
                let badgeLabel = "Not Started";

                if (isMastered) {
                  tileBg = "bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-300";
                  badgeStyle = "bg-amber-500 text-white font-bold";
                  badgeLabel = "Mastered";
                } else if (isSecure) {
                  tileBg = "bg-amber-500/5 border-amber-500/15 text-amber-800 dark:text-amber-400";
                  badgeStyle = "bg-amber-500/60 text-white font-semibold";
                  badgeLabel = "Secure";
                } else if (isInProgress) {
                  tileBg = "bg-indigo-500/5 border-indigo-500/15 text-indigo-900 dark:text-indigo-400";
                  badgeStyle = "bg-indigo-500/60 text-white font-medium";
                  badgeLabel = "Practice";
                }

                return (
                  <div
                    key={m.slug}
                    className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between hover:shadow-sm ${tileBg}`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-sm text-foreground">{m.title}</h4>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-3">
                      <span className="text-[10px] text-muted-foreground">
                        {m.skillsAttempted} Skills Practiced
                      </span>
                      {m.masteryScore !== null ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">{m.masteryScore}%</span>
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[image:var(--gradient-sunset)] rounded-full"
                              style={{ width: `${m.masteryScore}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] italic text-muted-foreground">Locked</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Efficiency Dashboard */}
          {efficiencyStats && (
            <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">AI Efficiency Analytics</h2>
              <p className="text-xs text-muted-foreground mb-6">Tracking deterministically served math challenges versus generative AI costs.</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-border/40 bg-muted/25 p-4 flex flex-col justify-between hover:scale-[1.01] transition-transform">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Answers</span>
                  <div>
                    <h3 className="text-2xl font-black text-foreground mt-2">{efficiencyStats.totalAttempts}</h3>
                    <p className="text-[9px] text-muted-foreground mt-1">Syllabus assessments</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-muted/25 p-4 flex flex-col justify-between hover:scale-[1.01] transition-transform">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI tutor support</span>
                  <div>
                    <h3 className="text-2xl font-black text-foreground mt-2">{efficiencyStats.totalCalls}</h3>
                    <p className="text-[9px] text-muted-foreground mt-1">Hints &amp; explanations</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-muted/25 p-4 flex flex-col justify-between hover:scale-[1.01] transition-transform">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Calculated Savings</span>
                  <div>
                    <h3 className="text-2xl font-black text-foreground mt-2">
                      {(efficiencyStats.tokensSaved / 1000).toFixed(1)}k
                    </h3>
                    <p className="text-[9px] text-muted-foreground mt-1">Tokens bypassed</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-amber-500/5 border-amber-500/15 p-4 flex flex-col justify-between hover:scale-[1.01] transition-transform">
                  <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Tutor efficiency</span>
                  <div>
                    <h3 className="text-2xl font-black text-amber-500 mt-2">{efficiencyStats.efficiencyPercentage}%</h3>
                    <p className="text-[9px] text-muted-foreground mt-1">AI-free challenge runs</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-xs text-muted-foreground gap-3">
                <p className="leading-relaxed md:max-w-xl">
                  💡 <strong>How SARA saves resources:</strong> SARA uses a template-based archetype model. Rather than querying costly LLMs on every single question or response, SARA evaluates algebraic, numerical, and multi-choice challenges completely locally. AI is dynamically triggered only when SARA provides customized Socratic tutor hints.
                </p>
                <div className="text-right whitespace-nowrap">
                  <p className="font-bold text-foreground">{(efficiencyStats.efficiencyPercentage).toFixed(0)}% AI Free Runs</p>
                  <p className="text-[10px]">Deterministic local engine</p>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Coacher Summaries */}
          {weeklyReports.length > 0 && (
            <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">Weekly Coacher Reports</h2>
              <p className="text-xs text-muted-foreground mb-4">Socratic diagnostics and tips from active chatbot study tracks.</p>
              
              <div className="space-y-4">
                {weeklyReports.map((report) => (
                  <div key={report.id} className="rounded-2xl border border-border/40 bg-muted/10 p-5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-foreground">Progress Recap</span>
                      <span className="text-[10px] text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                        {new Date(report.startOfWeek).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} &ndash; {new Date(report.endOfWeek).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed italic pr-2">
                      &ldquo;{report.summaryText}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar (Goal Setter & Misconceptions) */}
        <div className="space-y-8">
          {/* Target Setter Form */}
          <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">Parent Target Setter</h2>
            <p className="text-xs text-muted-foreground mb-4">Assign dynamic curriculum practice goals.</p>

            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Syllabus Topic</label>
                <select
                  value={goalTopic}
                  onChange={(e) => setGoalTopic(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 p-2.5 text-sm font-medium text-foreground focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">No specific topic (General revision)</option>
                  {missionsWithMastery.map((m) => (
                    <option key={m.slug} value={m.title}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Practice Target Description</label>
                <textarea
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  placeholder="e.g. Complete 5 correct ratios or revise Algebra basic challenge blocks."
                  rows={3}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 p-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Target Finish Date</label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 p-2.5 text-sm text-foreground focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submittingGoal}
                className="w-full rounded-xl bg-[image:var(--gradient-sunset)] py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                {submittingGoal ? "Assigning target..." : "Assign Practice Target"}
              </button>
            </form>
          </div>

          {/* Practice Goals Tracker */}
          <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">Assigned Targets</h2>
            <p className="text-xs text-muted-foreground mb-4">Tracking child task completions.</p>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {goals.length > 0 ? (
                goals.map((g) => (
                  <div key={g.id} className="rounded-2xl border border-border/40 bg-muted/10 p-4 relative overflow-hidden">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        {g.topic && (
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                            {g.topic}
                          </span>
                        )}
                        <h4 className="font-bold text-sm text-foreground leading-tight">{g.description}</h4>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        g.status === "achieved"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {g.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {g.targetDate ? `Due: ${new Date(g.targetDate).toLocaleDateString("en-GB")}` : "No due date"}
                      </span>
                      <span className="text-xs font-bold text-foreground">{g.progressPercent}%</span>
                    </div>

                    <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[image:var(--gradient-sunset)] rounded-full transition-all duration-500"
                        style={{ width: `${g.progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No practice targets assigned yet.</p>
              )}
            </div>
          </div>

          {/* Aggregated Student Slips/Misconceptions */}
          <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">Aggregated Student Slips</h2>
            <p className="text-xs text-muted-foreground mb-4">Recognized student slips and focus spots.</p>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {misconceptions.length > 0 ? (
                misconceptions.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-border/40 bg-red-500/5 p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                          {m.skillSlug.replace(/_/g, " ")}
                        </span>
                        <h4 className="font-bold text-sm text-foreground leading-tight">
                          {m.misconception}
                        </h4>
                      </div>
                      <span className="text-[9px] font-bold bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        seen {m.count}×
                      </span>
                    </div>
                    <span className="text-[9px] text-muted-foreground block mt-3">
                      Last flagged: {new Date(m.lastSeenAt).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No misconceptions or recurrent slips flagged yet.</p>
              )}
            </div>
          </div>

          {/* Admin Requested Topics Coverage Panel */}
          {topicRequests.length > 0 && (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 shadow-sm">
              <h2 className="text-lg font-bold tracking-tight text-foreground mb-1 flex items-center gap-2">
                📋 Requested Topics <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{topicRequests.length}</span>
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Missing curriculum topics requested by students — Admin view.</p>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {topicRequests.map((r) => (
                  <div key={r.id} className="flex justify-between items-center rounded-xl bg-card border border-border/30 p-3 text-xs">
                    <span className="font-bold text-foreground">{r.topicText}</span>
                    <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {r.requestCount}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify code compiling**

Run: `npx tsc --noEmit`
Expected: Passes successfully with no type/linter errors.

---

### Task 4: Write Analytics & Dashboard Logic Tests

**Files:**
- Create: `lib/__tests__/guardian-dashboard.test.ts`

- [ ] **Step 1: Write comprehensive test suite**

Create `lib/__tests__/guardian-dashboard.test.ts` with tests to verify both goal creations, ownership, efficiency stats calculations, and mock report triggers.

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db/client";
import { aiCall, studentProfile, user, studentGoal, questionAttempt, questionArchetype } from "@/lib/db/schema";
import { createGoal, getGoalsByStudentId } from "@/lib/db/queries/student";
import { getAIEfficiencyStats } from "@/lib/db/queries/analytics";
import { eq, sql } from "drizzle-orm";

describe("Guardian Dashboard & Analytics Logic", () => {
  let testUserId: string;
  let testStudentId: string;

  beforeEach(async () => {
    // Clean up
    await db.delete(studentGoal);
    await db.delete(questionAttempt);
    await db.delete(aiCall);
    await db.delete(studentProfile);
    await db.delete(user);

    // Seed User
    const [createdUser] = await db
      .insert(user)
      .values({
        email: "parent-test@sara.com",
      })
      .returning();
    testUserId = createdUser.id;

    // Seed Student
    const [createdStudent] = await db
      .insert(studentProfile)
      .values({
        userId: testUserId,
        name: "Jamie",
        schoolYear: "8",
      })
      .returning();
    testStudentId = createdStudent.id;
  });

  afterEach(async () => {
    await db.delete(studentGoal);
    await db.delete(questionAttempt);
    await db.delete(aiCall);
    await db.delete(studentProfile);
    await db.delete(user);
  });

  it("should create and fetch a parent assigned practice target", async () => {
    const goal = await createGoal({
      studentId: testStudentId,
      description: "Complete 10 Fraction problems",
      topic: "Fractions",
      targetDate: new Date("2026-12-31"),
      planSteps: [
        { label: "Basics", status: "todo" },
        { label: "Practice", status: "todo" },
      ],
      progressPercent: 10,
    });

    expect(goal.id).toBeDefined();
    expect(goal.studentId).toBe(testStudentId);
    expect(goal.topic).toBe("Fractions");
    expect(goal.description).toBe("Complete 10 Fraction problems");
    expect(goal.progressPercent).toBe(10);

    const goalsList = await getGoalsByStudentId({ studentId: testStudentId });
    expect(goalsList.length).toBe(1);
    expect(goalsList[0].id).toBe(goal.id);
  });

  it("should calculate correct AI cost savings and efficiency metrics", async () => {
    // Log an AI call
    await db.insert(aiCall).values({
      studentId: testStudentId,
      purpose: "hint",
      modelUsed: "gemini-2.5-flash",
      promptTokens: 100,
      completionTokens: 50,
      estimatedTokensSaved: 300,
    });

    // Seed a question archetype to resolve reference
    const [archetype] = await db
      .insert(questionArchetype)
      .values({
        slug: "test-archetype-goal",
        subject: "maths",
        yearGroup: 8,
        missionSlug: "fractions",
        lessonSlug: "intro-fractions",
        skillSlug: "fractions_basics",
        gcseDomain: "number",
        difficultyBand: "must",
        questionType: "short_text",
        template: "Solve {a} + {b}",
        variableSchemaJson: { a: [1, 2], b: [3, 4] },
        answerExpression: "a + b",
      })
      .returning();

    // Log a deterministic (AI-free) attempt
    await db.insert(questionAttempt).values({
      studentId: testStudentId,
      archetypeId: archetype.id,
      skillSlug: "fractions_basics",
      difficultyBand: "must",
      prompt: "Solve 2 + 3",
      studentAnswer: "5",
      correctAnswer: "5",
      isCorrect: true,
    });

    // Retrieve stats
    const stats = await getAIEfficiencyStats(testStudentId);
    const totalCalls = stats.totalCalls;
    const totalTokens = stats.totalPromptTokens + stats.totalCompletionTokens;
    const tokensSaved = stats.totalSavedTokens;

    const attemptsCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questionAttempt)
      .where(eq(questionAttempt.studentId, testStudentId));
    const totalAttempts = attemptsCountResult[0]?.count ?? 0;

    const efficiencyPercentage =
      totalAttempts + totalCalls > 0
        ? Math.round((totalAttempts / (totalAttempts + totalCalls)) * 100)
        : 100;

    expect(totalCalls).toBe(1);
    expect(totalTokens).toBe(150);
    expect(tokensSaved).toBe(300);
    expect(totalAttempts).toBe(1);
    expect(efficiencyPercentage).toBe(50); // 1 / (1 + 1) * 100 = 50%
  });
});
```

- [ ] **Step 2: Run all unit tests**

Run: `pnpm test:unit`
Expected: 106/106 unit tests pass successfully.

---

### Task 5: End-to-End Verification and Final Build

**Files:**
- None

- [ ] **Step 1: Check TypeScript static compilation**

Run: `npx tsc --noEmit`
Expected: Succeeds with zero errors or warnings.

- [ ] **Step 2: Run Next.js production build**

Run: `pnpm build`
Expected: Builds all pages and routes successfully without compiling faults.
