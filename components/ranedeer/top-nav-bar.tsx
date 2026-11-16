"use client";

import {
  Bell,
  Eye,
  Flame,
  LogIn,
  LogOut,
  Settings,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { AccountRole, EdexcelTier } from "@/lib/db/schema";

type AuthMeResponse = {
  session: {
    accountId: string;
    role: AccountRole;
    displayName: string;
    username: string;
    watcherCode?: string | null;
    watchedKidsCount?: number;
  } | null;
};

const fetcher = async (url: string): Promise<AuthMeResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    return { session: null };
  }
  return (await res.json()) as AuthMeResponse;
};

type TopNavBarProps = {
  nickname: string;
  tier: EdexcelTier;
  targetGrade: number;
  currentStreak: number;
  streakFreezes?: number;
  totalXp?: number;
  reminderEnabled: boolean;
};

export function TopNavBar({
  nickname,
  tier,
  targetGrade,
  currentStreak,
  reminderEnabled,
}: TopNavBarProps) {
  const router = useRouter();
  const { data, mutate } = useSWR<AuthMeResponse>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
  });

  const session = data?.session ?? null;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await mutate({ session: null }, false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-white/10 border-b bg-slate-950/80 backdrop-blur-xl">
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
              <span className="hidden rounded-full border border-violet-400/35 bg-violet-500/15 px-2 py-0.5 font-medium text-[11px] text-violet-200 sm:inline-block">
                Edexcel GCSE
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {nickname} ·{" "}
              {tier === "higher" ? "Higher (4–9)" : "Foundation (1–5)"} · Grade{" "}
              {targetGrade}
            </div>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/35 bg-orange-500/15 px-3 py-1.5 font-semibold text-orange-200 text-xs transition hover:bg-orange-500/25"
            href="/warmup"
            title="Daily 5-minute voice warmup"
          >
            <Flame className="size-3.5 text-orange-400" />
            <span>{currentStreak}d</span>
          </Link>

          <Link
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-200 text-xs transition hover:bg-cyan-500/20"
            href="/guardian"
          >
            <Eye className="size-3.5 text-cyan-400" />
            <span>
              {session?.role === "parent"
                ? "Watcher Hub"
                : session?.role === "student"
                  ? "Watcher Code"
                  : "Parent Watcher"}
            </span>
          </Link>

          <Link
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 font-medium text-slate-200 text-xs transition hover:bg-white/10"
            href="/settings"
            title="Learner settings & daily reminders"
          >
            {reminderEnabled ? (
              <Bell className="size-3.5 text-emerald-400" />
            ) : (
              <Settings className="size-3.5 text-slate-300" />
            )}
            <span className="hidden md:inline">Settings</span>
          </Link>

          {session ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden items-center gap-1 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 font-medium text-emerald-200 text-xs sm:inline-flex">
                <UserCheck className="size-3.5 text-emerald-400" />
                {session.displayName}
              </span>
              <button
                className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 font-medium text-slate-300 text-xs transition hover:bg-white/10 hover:text-white"
                onClick={handleLogout}
                title="Sign out"
                type="button"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 px-3 py-1.5 font-bold text-white text-xs shadow-sm transition hover:brightness-110"
              href="/login"
            >
              <LogIn className="size-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
