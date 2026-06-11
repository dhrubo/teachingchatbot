"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { PlayerStats } from "@/components/brand/player-stats";
import { SaraMascot } from "@/components/brand/sara-mascot";
import { MissionMap } from "@/components/chat/mission-map";
import { TopicPasteBox } from "@/components/chat/topic-paste-box";
import { useActiveChat } from "@/hooks/use-active-chat";
import { useStartTopic } from "@/hooks/use-start-topic";
import { pickGuestMission } from "@/lib/ai/guest-mission";
import { getMissionsByYear, type MissionDefinition } from "@/lib/ai/missions";
import { guestRegex } from "@/lib/constants";
import { cn, fetcher } from "@/lib/utils";

const HOW_IT_WORKS = [
  {
    icon: "📖",
    title: "Learn",
    description: "Short visual lessons — one idea at a time.",
  },
  {
    icon: "✏️",
    title: "Practise",
    description: "Interactive questions with instant feedback.",
  },
  {
    icon: "🎯",
    title: "Challenge",
    description: "Graded challenges to prove your understanding.",
  },
  {
    icon: "🏆",
    title: "Master",
    description: "Unlock the next mission when you're ready.",
  },
];

const TOPIC_EMOJIS: Record<string, string> = {
  "number-skills": "🔢",
  percentages: "💯",
  fractions: "🧮",
  "ratio-proportion": "⚖️",
  "algebra-basics": "🔤",
  "straight-line-graphs": "📈",
  "angles-geometry": "📐",
  probability: "🎲",
  "area-perimeter": "📏",
  "volume-surface-area": "📦",
  "simultaneous-equations": "➗",
  pythagoras: "📏",
  "indices-standard-form": "🔢",
};

export function SaraDashboard() {
  const { xpStreak, topicProgress, completedTopics } = useActiveChat();
  const startTopic = useStartTopic();
  const { data, status } = useSession();
  const isGuest = guestRegex.test(data?.user?.email ?? "");
  const isLoggedIn = status === "authenticated" && !isGuest;

  const [year, setYear] = useState<"8" | "9">("8");

  const { data: apiData } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lessons?year=${year}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const missions = useMemo(() => {
    if (apiData?.missions?.length) {
      return apiData.missions.map(
        (m: {
          slug: string;
          title: string;
          description: string;
          estimatedMinutes: number;
          gcseDomain: string;
        }) => ({
          id: m.slug,
          title: m.title,
          emoji: TOPIC_EMOJIS[m.slug] ?? "📖",
          description: m.description,
          estimatedMinutes: m.estimatedMinutes,
          gcseDomain: m.gcseDomain,
          topics: [m.title],
          prerequisiteMissionIds: [] as string[],
          conceptCards: [] as {
            id: string;
            title: string;
            visual: string;
            example: string;
            explanation: string;
          }[],
        })
      ) as MissionDefinition[];
    }
    return getMissionsByYear(year);
  }, [apiData, year]);

  const guestMission = useMemo(() => pickGuestMission(), []);

  const continueMission = useMemo(() => {
    if (!topicProgress) {
      return null;
    }
    return missions.find((m) => m.topics.includes(topicProgress.topic)) ?? null;
  }, [missions, topicProgress]);

  const todayMission = continueMission ?? guestMission;

  const completedMissionIds = useMemo(
    () =>
      missions
        .filter((m) =>
          completedTopics.some((t: string) => m.topics.includes(t))
        )
        .map((m) => m.id),
    [missions, completedTopics]
  );

  const currentMissionId = useMemo(() => {
    if (!topicProgress) {
      return;
    }
    const match = missions.find((m) => m.topics.includes(topicProgress.topic));
    return match?.id;
  }, [missions, topicProgress]);

  const stats = xpStreak;
  const hasProgressData = stats !== null && stats.xp > 0;

  // Start a topic through the mission orchestrator (concept cards → footer →
  // explicit Start Challenge Mode). NO LLM call, NO auto-challenge.
  function startMission(mission: MissionDefinition) {
    startTopic({ id: mission.id, title: mission.title, emoji: mission.emoji });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <motion.div
        animate={{ opacity: 1 }}
        className="flex flex-col gap-10"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ---- Hero ---- */}
        <section className="relative flex flex-col items-center py-10 text-center gap-4">
          <div className="relative">
            {/* Sparkles floating around the mascot with different delays */}
            <span className="absolute -left-8 -top-4 text-xl animate-float select-none opacity-85" style={{ animationDuration: "3.5s" }}>✨</span>
            <span className="absolute -right-8 -bottom-2 text-lg animate-float select-none opacity-75" style={{ animationDuration: "2.8s", animationDelay: "0.5s" }}>✨</span>
            <span className="absolute -right-6 -top-6 text-sm animate-float select-none opacity-60" style={{ animationDuration: "4s", animationDelay: "1s" }}>✨</span>
            <SaraMascot animated mood="happy" size={104} className="animate-float" />
          </div>
          <div className="max-w-xl">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-violet-500 bg-clip-text text-transparent">
                Learn Maths Without Feeling Stuck
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/90 font-medium">
              SARA is your AI maths coach — tiny visual lessons, one challenge at
              a time, and progress that actually sticks.
            </p>
          </div>
        </section>

        {/* ---- Pick / paste a topic (primary entry point) ---- */}
        <TopicPasteBox />

        {/* ---- PlayerStats (logged-in only) ---- */}
        {isLoggedIn && hasProgressData && stats && (
          <PlayerStats
            badges={stats.badges.length}
            level={Math.floor(stats.xp / 100) + 1}
            streak={stats.streak}
            xp={stats.xp}
          />
        )}

        {/* ---- "What is this?" ---- */}
        <section className="rounded-2xl bg-indigo-950/25 border border-indigo-950/50 hover:border-violet-500/20 backdrop-blur-md hover:translate-y-[-2px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] p-5">
          <h2 className="text-base font-semibold text-foreground bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
            What is SARA?
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-xs">📖</span>
              <span>
                <strong className="text-indigo-200">
                  Short visual lessons
                </strong>{" "}
                — one concept at a time, with diagrams and examples.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs">🎯</span>
              <span>
                <strong className="text-indigo-200">Concept cards</strong> — key
                ideas you can always come back to.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs">⚡</span>
              <span>
                <strong className="text-indigo-200">Challenge mode</strong> —
                answer questions, earn XP, unlock the next topic.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs">📊</span>
              <span>
                <strong className="text-indigo-200">Progress tracking</strong> —
                see how far you&apos;ve come and what&apos;s next.
              </span>
            </li>
          </ul>
        </section>

        {/* ---- Year toggle ---- */}
        <div className="flex items-center justify-center py-2">
          <div className="flex gap-1.5 rounded-full border border-indigo-950/50 bg-indigo-950/20 p-1 backdrop-blur-md shadow-inner">
            <button
              className={cn(
                "rounded-full px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300",
                year === "8"
                  ? "bg-gradient-to-r from-orange-500 to-violet-600 text-white shadow-md shadow-orange-500/20 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-indigo-950/40"
              )}
              onClick={() => setYear("8")}
              type="button"
            >
              Year 8
            </button>
            <button
              className={cn(
                "rounded-full px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300",
                year === "9"
                  ? "bg-gradient-to-r from-orange-500 to-violet-600 text-white shadow-md shadow-orange-500/20 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-indigo-950/40"
              )}
              onClick={() => setYear("9")}
              type="button"
            >
              Year 9
            </button>
          </div>
        </div>

        {/* ---- Today's Mission ---- */}
        {todayMission && (
          <section>
            <h2 className="mb-4 text-sm font-semibold text-foreground/80 tracking-wide uppercase">
              Today&apos;s Mission
            </h2>
            <div className="group relative flex w-full flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-orange-500/20 bg-indigo-950/25 p-5 text-left backdrop-blur-md transition-all duration-300 hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:translate-y-[-2px]">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 text-2xl shadow-inner">
                {todayMission.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-foreground">
                    {todayMission.title}
                  </h3>
                  <span className="shrink-0 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                    DAILY
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {todayMission.description}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                  <span>⏱ ~{todayMission.estimatedMinutes} min</span>
                  <span>•</span>
                  <span>{todayMission.gcseDomain?.replace(/_/g, " ") || "GCSE Maths"}</span>
                </div>
              </div>
              <button
                className="w-full sm:w-auto shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-violet-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:scale-[1.05] hover:shadow-orange-500/40 active:scale-[0.95]"
                onClick={() => startMission(todayMission)}
                type="button"
              >
                {continueMission ? "Continue →" : "Start →"}
              </button>
            </div>
          </section>
        )}

        {/* ---- Mission Map ---- */}
        <section>
          <h2 className="mb-4 text-sm font-semibold text-foreground/80 tracking-wide uppercase">
            Your Learning Journey
          </h2>
          <div className="rounded-2xl bg-indigo-950/15 border border-indigo-950/50 p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
            {/* Background glowing effects inside the card */}
            <div className="absolute -left-16 -top-16 size-32 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
            <div className="absolute -right-16 -bottom-16 size-32 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

            <MissionMap
              completedMissions={completedMissionIds}
              currentMissionId={currentMissionId}
              onSelect={(mission) => startMission(mission)}
              year={year}
            />
          </div>
        </section>

        {/* ---- How It Works ---- */}
        <section>
          <h2 className="mb-4 text-sm font-semibold text-foreground/80 tracking-wide uppercase">
            How It Works
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div
                className="rounded-2xl bg-indigo-950/25 border border-indigo-950/50 hover:border-violet-500/20 backdrop-blur-md hover:translate-y-[-2px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] p-5"
                key={item.title}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-950/40 text-2xl shadow-inner">
                  {item.icon}
                </div>
                <h3 className="mt-3 text-sm font-bold text-indigo-200">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- What You'll Learn ---- */}
        <section>
          <h2 className="mb-1 text-sm font-semibold text-foreground/80 tracking-wide uppercase">
            What You&apos;ll Learn
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Year {year} maths, broken into bite-sized topics. Tap any to start.
          </p>
          <div className="flex flex-col gap-3">
            {missions.map((mission) => {
              const isCompleted = completedMissionIds.includes(mission.id);
              const isCurrent = mission.id === currentMissionId;

              // Compute score and percentage progress
              const score = isCurrent && topicProgress ? topicProgress.score : isCompleted ? 5 : 0;
              const progressPercentage = Math.round((score / 5) * 100);

              return (
                <button
                  className={cn(
                    "group relative flex flex-col gap-3 rounded-2xl border p-4 text-left backdrop-blur-md transition-all duration-300",
                    isCompleted
                      ? "border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : isCurrent
                        ? "border-orange-500/25 bg-orange-500/5 hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                        : "border-indigo-950/40 bg-indigo-950/10 hover:border-indigo-500/30 hover:bg-indigo-950/20 hover:shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                  )}
                  key={mission.id}
                  onClick={() => startMission(mission)}
                  type="button"
                >
                  <div className="flex items-center gap-3 w-full">
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg shadow-inner",
                        isCompleted
                          ? "from-emerald-500/20 to-emerald-500/5 text-emerald-400"
                          : isCurrent
                            ? "from-orange-500/20 to-orange-500/5 text-orange-400"
                            : "from-indigo-500/20 to-indigo-500/5 text-indigo-300"
                      )}
                    >
                      {isCompleted ? "✓" : mission.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-sm font-bold tracking-tight",
                            isCompleted
                              ? "text-emerald-400"
                              : isCurrent
                                ? "text-orange-400"
                                : "text-indigo-200"
                          )}
                        >
                          {mission.title}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-muted-foreground/60 bg-muted/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {mission.estimatedMinutes} min
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed max-w-lg">
                        {mission.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress Indicator for curriculum list */}
                  {(isCompleted || isCurrent) && (
                    <div className="mt-2 w-full pt-2 border-t border-indigo-950/10">
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/75 mb-1.5 uppercase tracking-wider animate-none">
                        <span>{isCompleted ? "Completed" : "Active Progress"}</span>
                        <span>{progressPercentage}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-indigo-950/40 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isCompleted
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : "bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                          )}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="h-8" />
      </motion.div>
    </div>
  );
}