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

  function startMission(mission: MissionDefinition) {
    startTopic({ id: mission.id, title: mission.title, emoji: mission.emoji });
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <motion.div
        animate={{ opacity: 1 }}
        className="flex flex-col gap-8"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ---- AI Coach Bubble ---- */}
        <section className="rounded-2xl border border-violet-500/15 bg-violet-950/15 p-4 text-center backdrop-blur-md">
          <p className="text-xs font-medium italic text-violet-200">
            "Welcome back! Let's explore fractions or solve some equations today."
          </p>
        </section>

        {/* ---- Hero Row ---- */}
        <section className="relative flex flex-col md:flex-row items-center justify-between py-6 gap-6">
          <div className="flex-1 text-left">
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl leading-tight">
              Learn Maths{" "}
              <span className="glowing-sunset font-black block mt-1">
                Without Feeling Stuck
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/90 font-medium max-w-md">
              SARA is your AI maths coach — tiny visual lessons, one challenge at
              a time, and progress that actually sticks.
            </p>
          </div>
          <div className="shrink-0">
            <SaraMascot animated mood="happy" size={130} />
          </div>
        </section>

        {/* ---- Card Selection Grid ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Paste-A-Topic */}
          <div className="sara-glass-panel hover-sara-glass-panel rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                What do you want to learn?
              </h2>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Pick a topic from <strong className="text-foreground">Choose a Topic</strong> at the top — or paste your school syllabus topics below to auto-match.
              </p>
            </div>
            <div className="mt-4">
              <TopicPasteBox />
            </div>
          </div>

          {/* Column 2: What is SARA? & Level toggler */}
          <div className="sara-glass-panel hover-sara-glass-panel rounded-2xl p-6 flex flex-col justify-between gap-6">
            <div>
              <h2 className="text-base font-bold text-foreground bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                What is SARA?
              </h2>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span>📖</span>
                  <span>Short visual lessons — one concept at a time</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🎯</span>
                  <span>Concept cards — reference whenever you need</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>⚡</span>
                  <span>Challenge mode — gamified lessons with local grading</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📊</span>
                  <span>Progress tracking — GCSE alignment and analytics</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-start border-t border-white/5 pt-4">
              <div className="flex gap-1 rounded-full border border-white/5 bg-white/5 p-1 backdrop-blur-md">
                <button
                  className={cn(
                    "rounded-full px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                    year === "8"
                      ? "bg-gradient-to-r from-orange-500 to-violet-600 text-white shadow-md shadow-orange-500/20 scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  onClick={() => setYear("8")}
                  type="button"
                >
                  Year 8
                </button>
                <button
                  className={cn(
                    "rounded-full px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                    year === "9"
                      ? "bg-gradient-to-r from-orange-500 to-violet-600 text-white shadow-md shadow-orange-500/20 scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  onClick={() => setYear("9")}
                  type="button"
                >
                  Year 9
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ---- PlayerStats (logged-in only) ---- */}
        {isLoggedIn && hasProgressData && stats && (
          <PlayerStats
            badges={stats.badges.length}
            level={Math.floor(stats.xp / 100) + 1}
            streak={stats.streak}
            xp={stats.xp}
          />
        )}

        {/* ---- Today's Mission ---- */}
        {todayMission && (
          <section>
            <h2 className="mb-4 text-xs font-extrabold text-foreground/40 tracking-wider uppercase">
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

        <div className="my-2 h-px bg-white/5" />

        {/* ---- Mission Map ---- */}
        <section>
          <h2 className="mb-4 text-xs font-extrabold text-foreground/40 tracking-wider uppercase">
            YOUR LEARNING JOURNEY
          </h2>
          <div className="sara-glass-panel rounded-2xl p-6 relative overflow-hidden">
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
          <h2 className="mb-4 text-xs font-extrabold text-foreground/40 tracking-wider uppercase">
            How It Works
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div
                className="rounded-2xl border border-white/5 bg-white/5 hover:border-white/10 backdrop-blur-md hover:translate-y-[-2px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] p-5"
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

        {/* ---- What You'll Learn (curriculum missions list) ---- */}
        <section>
          <h2 className="mb-1 text-xs font-extrabold text-foreground/40 tracking-wider uppercase">
            What You&apos;ll Learn
          </h2>
          <p className="mb-4 text-[11px] text-muted-foreground">
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
                    "group relative flex flex-col gap-3 rounded-2xl border p-4 text-left backdrop-blur-md transition-all duration-300 sara-glass-panel",
                    isCompleted
                      ? "border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : isCurrent
                        ? "border-orange-500/25 bg-orange-500/5 hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                        : "border-white/5 bg-white/5 hover:border-white/10 hover:shadow-[0_0_15px_rgba(99,102,241,0.05)]"
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
                    <div className="mt-2 w-full pt-2 border-t border-white/5">
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
