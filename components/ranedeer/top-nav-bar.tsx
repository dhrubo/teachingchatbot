"use client";

import { Bell, Flame, Settings, Shield, Zap } from "lucide-react";
import Link from "next/link";
import type { EdexcelTier } from "@/lib/db/schema";

type TopNavBarProps = {
  nickname: string;
  tier: EdexcelTier;
  targetGrade: number;
  currentStreak: number;
  streakFreezes: number;
  totalXp: number;
  reminderEnabled: boolean;
};

export function TopNavBar({
  nickname,
  tier,
  targetGrade,
  currentStreak,
  streakFreezes,
  totalXp,
  reminderEnabled,
}: TopNavBarProps) {
  return (
    <header className="sticky top-0 z-30 border-white/10 border-b bg-slate-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link className="group flex items-center gap-2.5" href="/">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-violet-600 text-lg shadow-md">
            🦌
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight group-hover:text-orange-300 sm:text-base">
                Mr. Ranedeer Maths
              </span>
              <span className="rounded-full border border-violet-400/35 bg-violet-500/15 px-2 py-0.5 font-medium text-[11px] text-violet-200">
                Edexcel GCSE 1MA1
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {nickname} ·{" "}
              {tier === "higher" ? "Higher (4–9)" : "Foundation (1–5)"} · Aiming
              Grade {targetGrade}
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/35 bg-orange-500/15 px-3 py-1.5 font-semibold text-orange-200 text-xs transition hover:bg-orange-500/25"
            href="/warmup"
            title="Daily 5-minute spaced-repetition voice warmup"
          >
            <Flame className="size-3.5 text-orange-400" />
            <span>{currentStreak}d Streak</span>
          </Link>

          <span
            className="hidden items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 font-medium text-cyan-200 text-xs sm:inline-flex"
            title="Streak Freezes automatically protect a missed day"
          >
            <Shield className="size-3.5 text-cyan-400" />
            {streakFreezes} Freeze{streakFreezes === 1 ? "" : "s"}
          </span>

          <span className="hidden items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 font-mono text-amber-200 text-xs md:inline-flex">
            <Zap className="size-3.5 text-amber-400" />
            {totalXp} XP
          </span>

          <Link
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-medium text-slate-200 text-xs transition hover:bg-white/10"
            href="/settings"
          >
            {reminderEnabled ? (
              <Bell className="size-3.5 text-emerald-400" />
            ) : (
              <Settings className="size-3.5 text-slate-300" />
            )}
            <span className="hidden sm:inline">/config &amp; Reminders</span>
            <span className="sm:hidden">Config</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
