"use client";

import {
  Award,
  CheckCircle2,
  Eye,
  Flame,
  Lock,
  Mic,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TopNavBar } from "@/components/ranedeer/top-nav-bar";
import { EDEXCEL_STRANDS, EDEXCEL_TOPICS } from "@/lib/curriculum/edexcel-1ma1";
import type { EdexcelStrandId } from "@/lib/curriculum/types";
import type { BestQuizScoreSummary } from "@/lib/db/queries/quizzes";
import type {
  AccountRole,
  EdexcelTier,
  ExplanationLens,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type TopicProgressView = {
  masteryScore: number;
  lensesTried: ExplanationLens[];
};

export type EdexcelDashboardProps = {
  learner: {
    nickname: string;
    tier: EdexcelTier;
    targetGrade: number;
    reminderEnabled: boolean;
    currentStreak: number;
    totalXp: number;
  };
  authSession: {
    role: AccountRole;
    displayName: string;
    username: string;
    watcherCode: string | null;
  } | null;
  progressBySlug: Record<string, TopicProgressView>;
  quizScoresBySlug: Record<string, BestQuizScoreSummary>;
};

export function EdexcelDashboard({
  learner,
  authSession,
  progressBySlug,
  quizScoresBySlug,
}: EdexcelDashboardProps) {
  const [selectedTier, setSelectedTier] = useState<EdexcelTier>(learner.tier);
  const [selectedStrand, setSelectedStrand] = useState<EdexcelStrandId | "all">(
    "all"
  );

  const handleTierToggle = async (nextTier: EdexcelTier) => {
    setSelectedTier(nextTier);
    const defaultGrade = nextTier === "higher" ? 7 : 5;
    try {
      await fetch("/api/learner/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: nextTier,
          targetGrade: defaultGrade,
        }),
      });
    } catch {
      // Keep client filter responsive even if offline
    }
  };

  const visibleTopics = EDEXCEL_TOPICS.filter((topic) => {
    if (selectedTier === "foundation" && topic.tier === "higher") {
      return false;
    }
    if (selectedStrand !== "all" && topic.strand !== selectedStrand) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen pb-20">
      <TopNavBar
        currentStreak={learner.currentStreak}
        nickname={learner.nickname}
        reminderEnabled={learner.reminderEnabled}
        targetGrade={learner.targetGrade}
        tier={selectedTier}
        totalXp={learner.totalXp}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6">
        {/* Clean, Calm Header + Account/Watcher Strip */}
        <section className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-5 md:flex-row md:items-center">
          <div className="space-y-1.5">
            <h1 className="font-extrabold text-2xl text-white tracking-tight sm:text-3xl">
              Pick a Maths Topic to Learn &amp; Quiz
            </h1>
            <p className="text-slate-300 text-sm">
              Step 1: Explore the{" "}
              <strong className="text-orange-300">Guided Voice Tutorial</strong>{" "}
              · Step 2: Prove mastery in a{" "}
              <strong className="text-emerald-300">
                5-Question No-Cheat Quiz
              </strong>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {authSession ? (
              authSession.role === "parent" ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-2 text-xs">
                  <span className="text-cyan-100">
                    Active kid view: <strong>{learner.nickname}</strong>
                  </span>
                  <Link
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/25 px-2.5 py-1 font-bold text-cyan-100 transition hover:bg-cyan-500/35"
                    href="/guardian"
                  >
                    <Eye className="size-3.5" />
                    Watcher Hub
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2 text-xs">
                  <span className="text-emerald-100">
                    <strong>@{authSession.username}</strong>
                  </span>
                  {authSession.watcherCode ? (
                    <Link
                      className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-white transition hover:bg-white/20"
                      href="/guardian"
                      title="Share this 6-digit code with a parent or guardian"
                    >
                      Watcher Code: {authSession.watcherCode}
                    </Link>
                  ) : null}
                </div>
              )
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 px-3.5 py-2 font-bold text-white text-xs shadow-sm transition hover:brightness-110"
                  href="/login?tab=register-student"
                >
                  <UserPlus className="size-3.5" />
                  Student Sign Up / PIN
                </Link>
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3.5 py-2 font-semibold text-cyan-100 text-xs transition hover:bg-cyan-500/25"
                  href="/login?tab=register-parent"
                >
                  <Eye className="size-3.5" />
                  Parent / Watcher Setup
                </Link>
              </div>
            )}

            {learner.currentStreak > 0 ? (
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-400/30 bg-orange-500/10 px-3 py-2 font-semibold text-orange-200 text-xs hover:bg-orange-500/20"
                href="/warmup"
              >
                <Flame className="size-3.5 text-orange-400" />
                Daily Warmup
              </Link>
            ) : null}
          </div>
        </section>

        {/* Simple Filter Bar: Tier + Edexcel Strand */}
        <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex self-start rounded-xl border border-white/10 bg-slate-950/70 p-1">
            <button
              className={cn(
                "rounded-lg px-3.5 py-1.5 font-semibold text-xs transition",
                selectedTier === "foundation"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              )}
              onClick={() => handleTierToggle("foundation")}
              type="button"
            >
              Foundation (Grades 1–5)
            </button>
            <button
              className={cn(
                "rounded-lg px-3.5 py-1.5 font-semibold text-xs transition",
                selectedTier === "higher"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              )}
              onClick={() => handleTierToggle("higher")}
              type="button"
            >
              Higher (Grades 4–9)
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              className={cn(
                "rounded-full border px-3 py-1 font-semibold text-xs transition",
                selectedStrand === "all"
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
              )}
              onClick={() => setSelectedStrand("all")}
              type="button"
            >
              All ({visibleTopics.length})
            </button>
            {EDEXCEL_STRANDS.map((strand) => {
              const shortName = strand.title.replace(/^\d+\.\s*/, "");
              return (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 font-medium text-xs transition",
                    selectedStrand === strand.id
                      ? "border-orange-400/50 bg-orange-500/20 text-orange-100"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
                  )}
                  key={strand.id}
                  onClick={() => setSelectedStrand(strand.id)}
                  type="button"
                >
                  {shortName}
                </button>
              );
            })}
          </div>
        </section>

        {/* Clean Topic Cards Grid: Tutorial -> Anti-Cheat Quiz */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTopics.map((topic) => {
            const prog = progressBySlug[topic.slug];
            const quizScore = quizScoresBySlug[topic.slug];
            const lensesCount = prog?.lensesTried.length ?? 0;
            const strandMeta = EDEXCEL_STRANDS.find(
              (s) => s.id === topic.strand
            );

            return (
              <article
                className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-5 transition hover:border-white/25"
                key={topic.slug}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                      {topic.edexcelCode} · {topic.gradeRange}
                    </span>

                    {quizScore?.passed ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-[11px] text-emerald-200">
                        <CheckCircle2 className="size-3 text-emerald-400" />
                        Passed {quizScore.bestScorePercent}%
                      </span>
                    ) : prog ? (
                      <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 font-medium text-[11px] text-violet-200">
                        {prog.masteryScore}% Mastery
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        {strandMeta?.title.replace(/^\d+\.\s*/, "")}
                      </span>
                    )}
                  </div>

                  <h2 className="font-bold text-base text-white leading-snug">
                    {topic.title}
                  </h2>

                  <p className="line-clamp-2 text-slate-400 text-xs leading-relaxed">
                    {topic.subtitle}
                  </p>
                </div>

                {/* 2-Step Action Row: 1. Tutorial | 2. No-Cheat Quiz */}
                <div className="grid grid-cols-2 gap-2 border-white/10 border-t pt-3.5">
                  <Link
                    className="flex flex-col items-start gap-0.5 rounded-xl border border-orange-400/35 bg-orange-500/15 px-3 py-2 text-left transition hover:bg-orange-500/25"
                    href={`/learn/${topic.slug}`}
                  >
                    <span className="inline-flex items-center gap-1 font-bold text-orange-100 text-xs">
                      <Mic className="size-3.5 text-orange-400" />
                      1. Tutorial
                    </span>
                    <span className="text-[11px] text-orange-200/80">
                      {lensesCount > 0
                        ? `${lensesCount}/5 ways explored`
                        : "Voice + 5 lenses"}
                    </span>
                  </Link>

                  <Link
                    className="flex flex-col items-start gap-0.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-left transition hover:bg-emerald-500/25"
                    href={`/learn/${topic.slug}?mode=quiz`}
                  >
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-100 text-xs">
                      {quizScore ? (
                        <Award className="size-3.5 text-emerald-400" />
                      ) : (
                        <Lock className="size-3.5 text-emerald-400" />
                      )}
                      2. Quiz
                    </span>
                    <span className="text-[11px] text-emerald-200/80">
                      {quizScore
                        ? `Best: ${quizScore.bestScorePercent}%`
                        : "5-Q No-Cheat"}
                    </span>
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        {/* Subtle 1-Line Anti-Cheat Footer Note */}
        <footer className="flex flex-wrap items-center justify-center gap-2 pt-2 text-center text-slate-400 text-xs">
          <ShieldCheck className="size-4 text-emerald-400" />
          <span>
            No-Cheat Learning: Tutorials guide step-by-step without giving
            homework answers, and quizzes generate fresh numbers graded on the
            server with Parent/Guardian Watcher integrity logs.
          </span>
        </footer>
      </main>
    </div>
  );
}
