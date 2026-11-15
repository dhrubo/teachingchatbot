"use client";

import {
  ArrowRight,
  Bell,
  Calculator,
  CheckCircle2,
  Compass,
  Flame,
  Mic,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TopNavBar } from "@/components/ranedeer/top-nav-bar";
import type { AiSetupStatus } from "@/lib/ai/providers";
import { EDEXCEL_STRANDS, EDEXCEL_TOPICS } from "@/lib/curriculum/edexcel-1ma1";
import {
  ALL_LENSES,
  type EdexcelStrandId,
  LENS_META,
} from "@/lib/curriculum/types";
import type {
  DailyPracticeLogRecord,
  EdexcelTier,
  ExplanationLens,
  ToneStyle,
  TopicProgressRecord,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export type SerializedLearnerSummary = {
  nickname: string;
  tier: EdexcelTier;
  targetGrade: number;
  preferredLens: ExplanationLens;
  toneStyle: ToneStyle;
  speechSpeed: string;
  dailyGoalMinutes: number;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  timezone: string;
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  totalXp: number;
};

export type DayStripItem = {
  dateStr: string;
  dayLabel: string;
  practiced: boolean;
  usedFreeze: boolean;
  isToday: boolean;
};

type EdexcelDashboardProps = {
  learner: SerializedLearnerSummary;
  progressBySlug: Record<
    string,
    Pick<
      TopicProgressRecord,
      "masteryScore" | "lensesTried" | "questionsAnswered" | "questionsCorrect"
    >
  >;
  sevenDayStrip: DayStripItem[];
  todayLog: DailyPracticeLogRecord | null;
  setup: AiSetupStatus;
};

export function EdexcelDashboard({
  learner: initialLearner,
  progressBySlug,
  sevenDayStrip,
  todayLog,
  setup,
}: EdexcelDashboardProps) {
  const [tierFilter, setTierFilter] = useState<"all" | EdexcelTier>(
    initialLearner.tier
  );
  const [strandFilter, setStrandFilter] = useState<"all" | EdexcelStrandId>(
    "all"
  );

  const minutesToday = todayLog?.minutesPracticed ?? 0;
  const goalPct = Math.min(
    100,
    Math.round(
      (minutesToday / Math.max(1, initialLearner.dailyGoalMinutes)) * 100
    )
  );

  const featuredTopics = useMemo(
    () => EDEXCEL_TOPICS.filter((t) => t.featured).slice(0, 4),
    []
  );

  const filteredTopics = useMemo(() => {
    return EDEXCEL_TOPICS.filter((topic) => {
      if (tierFilter === "foundation" && topic.tier === "higher") {
        return false;
      }
      if (strandFilter !== "all" && topic.strand !== strandFilter) {
        return false;
      }
      return true;
    });
  }, [strandFilter, tierFilter]);

  return (
    <div className="min-h-screen pb-16">
      <TopNavBar
        currentStreak={initialLearner.currentStreak}
        nickname={initialLearner.nickname}
        reminderEnabled={initialLearner.reminderEnabled}
        streakFreezes={initialLearner.streakFreezes}
        targetGrade={initialLearner.targetGrade}
        tier={initialLearner.tier}
        totalXp={initialLearner.totalXp}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-6">
        {/* Hero Grid: Daily Duolingo Streak + Mr. Ranedeer Voice Overview */}
        <section className="grid gap-5 lg:grid-cols-12">
          <div className="glass-panel flex flex-col justify-between gap-5 rounded-3xl p-6 lg:col-span-7">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-orange-500/15 px-3 py-1 font-semibold text-orange-200 text-xs">
                <Mic className="size-3.5 text-orange-400" />
                Voice-First Pearson Edexcel GCSE (1MA1) Tutor
              </div>
              <h1 className="font-extrabold text-2xl text-white tracking-tight sm:text-3xl">
                Understand tricky GCSE Maths{" "}
                <span className="bg-gradient-to-r from-orange-400 to-violet-400 bg-clip-text text-transparent">
                  five different ways.
                </span>
              </h1>
              <p className="max-w-2xl text-slate-300 text-sm leading-relaxed">
                Built on Mr. Ranedeer&apos;s adaptive pedagogy: speak naturally,
                watch live fraction walls &amp; compound-interest timelines draw
                themselves, and say{" "}
                <strong className="text-orange-200">
                  &ldquo;Explain it another way&rdquo;
                </strong>{" "}
                whenever a method doesn&apos;t click yet.
              </p>
            </div>

            {/* 7-Day Duolingo Streak & Daily Goal Strip */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="size-5 text-orange-400" />
                  <span className="font-bold text-sm text-white">
                    {initialLearner.currentStreak}-Day Practice Streak
                  </span>
                  <span className="text-slate-400 text-xs">
                    (Best: {initialLearner.longestStreak}d)
                  </span>
                </div>
                <div className="font-mono text-slate-300 text-xs">
                  Today: {minutesToday}/{initialLearner.dailyGoalMinutes} min (
                  {goalPct}%)
                </div>
              </div>

              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${goalPct}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2">
                {sevenDayStrip.map((day) => (
                  <div
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border py-2 text-xs",
                      day.practiced
                        ? "border-orange-400/40 bg-orange-500/15 text-orange-100"
                        : day.usedFreeze
                          ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                          : day.isToday
                            ? "border-violet-400/40 bg-white/5 text-white"
                            : "border-white/5 bg-white/[0.02] text-slate-500"
                    )}
                    key={day.dateStr}
                  >
                    <span className="font-medium text-[11px]">
                      {day.dayLabel}
                    </span>
                    {day.practiced ? (
                      <CheckCircle2 className="size-4 text-orange-400" />
                    ) : day.usedFreeze ? (
                      <Shield className="size-4 text-cyan-400" />
                    ) : (
                      <span className="size-4 rounded-full border border-white/15" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-violet-600 px-5 py-3 font-bold text-sm text-white shadow-lg transition hover:brightness-110"
                href="/warmup"
              >
                <Flame className="size-4" />
                Start 5-Min Daily Voice Warmup
                <ArrowRight className="size-4" />
              </Link>

              <Link
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-slate-200 text-sm transition hover:bg-white/10"
                href="/settings"
              >
                <Bell className="size-4 text-emerald-400" />
                {initialLearner.reminderEnabled
                  ? `Daily Reminder On (${String(initialLearner.reminderHour).padStart(2, "0")}:${String(initialLearner.reminderMinute).padStart(2, "0")})`
                  : "Enable Daily Practice Reminders"}
              </Link>
            </div>
          </div>

          {/* Right Card: Mr. Ranedeer /config Profile & Free AI Status */}
          <div className="glass-panel flex flex-col justify-between gap-4 rounded-3xl p-6 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-mono text-violet-300 text-xs">
                  <SlidersHorizontal className="size-3.5" />
                  Mr. Ranedeer /config
                </span>
                <Link
                  className="font-medium text-orange-300 text-xs hover:underline"
                  href="/settings"
                >
                  Edit Profile →
                </Link>
              </div>

              <h2 className="mt-2 font-bold text-lg text-white">
                Personalised for {initialLearner.nickname}
              </h2>

              <dl className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <dt className="text-slate-400">Edexcel Paper Tier</dt>
                  <dd className="mt-1 font-semibold text-white">
                    {initialLearner.tier === "higher"
                      ? "Higher (Grades 4–9)"
                      : "Foundation (Grades 1–5)"}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <dt className="text-slate-400">Default Lens</dt>
                  <dd className="mt-1 font-semibold text-orange-200">
                    {LENS_META[initialLearner.preferredLens].label}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <dt className="text-slate-400">Tutor Tone &amp; Speed</dt>
                  <dd className="mt-1 font-semibold text-white capitalize">
                    {initialLearner.toneStyle} · {initialLearner.speechSpeed}x
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <dt className="text-slate-400">Target Grade</dt>
                  <dd className="mt-1 font-semibold text-emerald-300">
                    Grade {initialLearner.targetGrade} (1MA1)
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  Free Voice &amp; AI Engine
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium text-[11px]",
                    setup.anyLlmConfigured
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-200"
                  )}
                >
                  {setup.anyLlmConfigured ? "Live AI Ready" : "Zero-Key Mode"}
                </span>
              </div>
              <p className="mt-1.5 text-slate-400 leading-relaxed">
                {setup.activePrimaryProvider} · British Neural TTS active.
                {setup.anyLlmConfigured
                  ? ""
                  : " All 5 curated lenses, visual diagrams, and 3/10→9/10 tests work offline right now; add a free Groq or Google Gemini key in .env.local for open voice Q&A."}
              </p>
            </div>
          </div>
        </section>

        {/* Spotlight: Multi-Representation Deep Dives (Compound Interest, Fractions, etc.) */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 font-semibold text-orange-300 text-xs uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                Multi-Lens Deep Dives
              </div>
              <h2 className="font-bold text-white text-xl">
                Master Compound Interest, Fractions &amp; Core GCSE Topics in 5
                Ways
              </h2>
            </div>
            <p className="text-slate-400 text-xs">
              Visual Diagram · Real-World Story · Why It Works · Edexcel Exam
              Steps · Socratic Check
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {featuredTopics.map((topic) => {
              const prog = progressBySlug[topic.slug];
              const tried = prog?.lensesTried ?? [];
              const mastery = prog?.masteryScore ?? 0;

              return (
                <Link
                  className="glass-panel group flex flex-col justify-between gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-orange-400/40"
                  href={`/learn/${topic.slug}`}
                  key={topic.slug}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-orange-400/35 bg-orange-500/15 px-2 py-0.5 font-bold font-mono text-orange-200 text-xs">
                          1MA1 · {topic.edexcelCode}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {topic.gradeRange}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-300">
                        <Calculator className="size-3" />
                        {topic.calculator === "non-calc"
                          ? "Paper 1 Non-Calc"
                          : topic.calculator === "calc"
                            ? "Paper 2/3 Calc"
                            : "Calc & Non-Calc"}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-white group-hover:text-orange-300">
                      {topic.title}
                    </h3>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {topic.subtitle}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* 5 Explanation Lenses Indicator */}
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_LENSES.map((lens) => {
                        const seen = tried.includes(lens);
                        return (
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 font-medium text-[11px]",
                              seen
                                ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-200"
                                : "border-white/10 bg-white/[0.03] text-slate-400"
                            )}
                            key={lens}
                          >
                            {seen ? "✓ " : ""}
                            {LENS_META[lens].shortLabel}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex-1">
                        <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                          <span>{tried.length}/5 ways explored</span>
                          <span>{mastery}% mastery</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-violet-400"
                            style={{ width: `${Math.max(mastery, 4)}%` }}
                          />
                        </div>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 font-semibold text-white text-xs transition group-hover:bg-orange-500">
                        Speak &amp; Learn
                        <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Full Pearson Edexcel 6-Strand Curriculum Explorer */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Compass className="size-5 text-violet-400" />
              <h2 className="font-bold text-lg text-white sm:text-xl">
                Pearson Edexcel GCSE (1MA1) Curriculum Map
              </h2>
            </div>

            {/* Tier Switcher */}
            <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/70 p-1 text-xs">
              {(
                [
                  { id: "foundation", label: "Foundation (1–5)" },
                  { id: "higher", label: "Higher (4–9)" },
                  { id: "all", label: "All Topics" },
                ] as const
              ).map((opt) => (
                <button
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-medium transition",
                    tierFilter === opt.id
                      ? "bg-violet-600 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                  key={opt.id}
                  onClick={() => setTierFilter(opt.id)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Strand Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              className={cn(
                "rounded-full border px-3 py-1.5 font-medium text-xs transition",
                strandFilter === "all"
                  ? "border-orange-400/50 bg-orange-500/20 text-orange-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              )}
              onClick={() => setStrandFilter("all")}
              type="button"
            >
              All 6 Strands ({EDEXCEL_TOPICS.length})
            </button>
            {EDEXCEL_STRANDS.map((strand) => (
              <button
                className={cn(
                  "rounded-full border px-3 py-1.5 font-medium text-xs transition",
                  strandFilter === strand.id
                    ? "border-orange-400/50 bg-orange-500/20 text-orange-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                )}
                key={strand.id}
                onClick={() => setStrandFilter(strand.id)}
                type="button"
              >
                {strand.title}
              </button>
            ))}
          </div>

          {/* Topic Grid */}
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTopics.map((topic) => {
              const prog = progressBySlug[topic.slug];
              const mastery = prog?.masteryScore ?? 0;
              const lensesCount = prog?.lensesTried.length ?? 0;

              return (
                <Link
                  className="glass-panel group flex flex-col justify-between gap-3 rounded-2xl p-4 transition hover:border-violet-400/45"
                  href={`/learn/${topic.slug}`}
                  key={topic.slug}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-violet-300">
                        {topic.edexcelCode} · {topic.gradeRange}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-medium text-[10px] uppercase",
                          topic.tier === "higher"
                            ? "bg-violet-500/20 text-violet-200"
                            : topic.tier === "crossover"
                              ? "bg-cyan-500/20 text-cyan-200"
                              : "bg-emerald-500/20 text-emerald-200"
                        )}
                      >
                        {topic.tier}
                      </span>
                    </div>

                    <h3 className="mt-2 font-bold text-base text-white group-hover:text-orange-300">
                      {topic.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-slate-400 text-xs">
                      {topic.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-white/10 border-t pt-2.5 text-[11px] text-slate-400">
                    <span>
                      {lensesCount}/5 lenses · {mastery}% mastery
                    </span>
                    <span className="font-semibold text-orange-300 group-hover:translate-x-0.5">
                      Start →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
