"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "@/components/chat/toast";

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
  reviewsDueCount?: number;
  confidenceStats?: { skillSlug: string; confidence: number; updatedAt: string }[];
  revisionQueueItems?: { id: string; skillSlug: string; nextReviewDate: string; intervalDays: number }[];
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

  // Misconception analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const runMisconceptionAnalysis = useCallback(async () => {
    if (!data?.student?.id) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch("/api/learning-science/misconception-analysis", { method: "POST" });
      if (!res.ok) throw new Error("Analysis failed");
      const result = await res.json();
      setAnalysisResult(result.message || "Analysis complete");
      // Refresh dashboard data
      mutate(`/api/dashboard${activeStudentId ? `?studentId=${activeStudentId}` : ""}`);
    } catch {
      setAnalysisResult("Analysis failed — try again later");
    } finally {
      setAnalyzing(false);
    }
  }, [data?.student?.id, activeStudentId]);

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

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

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
          onClick={handleBack}
          type="button"
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
                type="button"
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

          {/* Learning Science: Retention & Revision */}
          <div className="rounded-3xl border border-emerald-500/15 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">🧠 Learning Retention</h2>
            <p className="text-xs text-muted-foreground mb-4">Spaced repetition health, confidence, and reviews due.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/10 p-4">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Reviews Due</span>
                <p className="text-2xl font-black text-emerald-300 mt-2">{data.reviewsDueCount ?? 0}</p>
                <p className="text-[9px] text-muted-foreground mt-1">skills need practice</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-muted/25 p-4">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Confidence</span>
                <p className="text-2xl font-black text-foreground mt-2">
                  {data.confidenceStats?.length
                    ? (data.confidenceStats.reduce((s: number, c: any) => s + c.confidence, 0) / data.confidenceStats.length).toFixed(1)
                    : "—"}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">/ 5 scale</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-muted/25 p-4">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Entries</span>
                <p className="text-2xl font-black text-foreground mt-2">{data.confidenceStats?.length ?? 0}</p>
                <p className="text-[9px] text-muted-foreground mt-1">confidence logs</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-muted/25 p-4">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Queued Items</span>
                <p className="text-2xl font-black text-foreground mt-2">{data.revisionQueueItems?.length ?? 0}</p>
                <p className="text-[9px] text-muted-foreground mt-1">in revision queue</p>
              </div>
            </div>

            {/* Upcoming revision items */}
            {data.revisionQueueItems && data.revisionQueueItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Upcoming Reviews</p>
                {data.revisionQueueItems.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center rounded-xl bg-muted/20 border border-border/20 p-3 text-xs">
                    <span className="font-medium text-foreground">{item.skillSlug.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">
                      due {new Date(item.nextReviewDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} &middot;
                      interval {item.intervalDays}d
                    </span>
                  </div>
                ))}
              </div>
            )}
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
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">Aggregated Student Slips</h2>
                <p className="text-xs text-muted-foreground">Recognized student slips and focus spots.</p>
              </div>
              <button
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                  analyzing
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:scale-[1.02]"
                }`}
                disabled={analyzing}
                onClick={runMisconceptionAnalysis}
                type="button"
              >
                {analyzing ? "Analyzing…" : "🔍 Run Analysis"}
              </button>
            </div>

            {analysisResult && (
              <p className="text-xs text-emerald-400 mb-3 bg-emerald-500/5 rounded-xl px-3 py-2 border border-emerald-500/10">
                {analysisResult}
              </p>
            )}

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
