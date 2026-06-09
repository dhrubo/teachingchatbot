"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { PlayerStats } from "@/components/brand/player-stats";
import { SaraMascot } from "@/components/brand/sara-mascot";
import { MissionMap } from "@/components/chat/mission-map";
import { useActiveChat } from "@/hooks/use-active-chat";
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
  const { sendMessage, xpStreak, topicProgress, topicList, completedTopics } =
    useActiveChat();
  const { data, status } = useSession();
  const isGuest = guestRegex.test(data?.user?.email ?? "");
  const isLoading = status === "loading";
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
    if (!topicProgress) return null;
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
    if (!topicProgress) return undefined;
    const match = missions.find((m) => m.topics.includes(topicProgress.topic));
    return match?.id;
  }, [missions, topicProgress]);

  const hasProgressData = xpStreak !== null && xpStreak.xp > 0;

  function startMission(mission: MissionDefinition) {
    sendMessage({
      role: "user",
      parts: [
        {
          type: "text",
          text: `I want to learn about ${mission.title}. Start me off easy.`,
        },
      ],
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <motion.div
        animate={{ opacity: 1 }}
        className="flex flex-col gap-8"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ---- Hero ---- */}
        <section className="relative flex flex-col items-center pt-8 text-center">
          <SaraMascot animated mood="happy" size={96} />
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Learn Maths Without Feeling Stuck
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            SARA is your AI maths coach — tiny visual lessons, one challenge at
            a time, and progress that actually sticks.
          </p>
        </section>

        {/* ---- PlayerStats (logged-in only) ---- */}
        {isLoggedIn && hasProgressData && (
          <PlayerStats
            badges={xpStreak!.badges.length}
            level={Math.floor(xpStreak!.xp / 100) + 1}
            streak={xpStreak!.streak}
            xp={xpStreak!.xp}
          />
        )}

        {/* ---- "What is this?" ---- */}
        <section className="rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-sm">
          <h2 className="text-base font-semibold text-foreground">
            What is this?
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">📖</span>
              <span>
                <strong className="text-foreground">
                  Short visual lessons
                </strong>{" "}
                — one concept at a time, with diagrams and examples.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">🎯</span>
              <span>
                <strong className="text-foreground">Concept cards</strong> — key
                ideas you can always come back to.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚡</span>
              <span>
                <strong className="text-foreground">Challenge mode</strong> —
                answer questions, earn XP, unlock the next topic.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">📊</span>
              <span>
                <strong className="text-foreground">Progress tracking</strong> —
                see how far you've come and what's next.
              </span>
            </li>
          </ul>
        </section>

        {/* ---- Year toggle ---- */}
        <div className="flex items-center justify-center">
          <div className="flex gap-1 rounded-full border border-border/40 bg-muted/30 p-0.5">
            <button
              className={cn(
                "rounded-full px-4 py-1 text-sm font-medium transition-colors",
                year === "8"
                  ? "bg-gradient-to-r from-orange-500 to-violet-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setYear("8")}
            >
              Year 8
            </button>
            <button
              className={cn(
                "rounded-full px-4 py-1 text-sm font-medium transition-colors",
                year === "9"
                  ? "bg-gradient-to-r from-orange-500 to-violet-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setYear("9")}
            >
              Year 9
            </button>
          </div>
        </div>

        {/* ---- Today's Mission ---- */}
        {todayMission && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground/80">
              Today&apos;s Mission
            </h2>
            <div className="group flex w-full items-center gap-3 rounded-2xl border border-orange-500/15 bg-card/40 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:bg-card/60">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 text-xl">
                {todayMission.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {todayMission.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {todayMission.description}
                </p>
                <span className="mt-1 inline-block text-[10px] text-muted-foreground/60">
                  ⏱ ~{todayMission.estimatedMinutes} min
                </span>
              </div>
              <button
                className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-violet-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/20 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
                onClick={() => startMission(todayMission)}
              >
                {continueMission ? "Continue →" : "Start →"}
              </button>
            </div>
          </section>
        )}

        {/* ---- Mission Map ---- */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground/80">
            Your Learning Journey
          </h2>
          <div className="rounded-2xl border border-border/40 bg-card/20 p-4 backdrop-blur-sm">
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
          <h2 className="mb-3 text-sm font-semibold text-foreground/80">
            How It Works
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {HOW_IT_WORKS.map((item) => (
              <div
                className="rounded-2xl border border-border/40 bg-card/30 p-4 backdrop-blur-sm"
                key={item.title}
              >
                <span className="text-2xl">{item.icon}</span>
                <h3 className="mt-2 text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- What You'll Learn ---- */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground/80">
            What You&apos;ll Learn
          </h2>
          <div className="flex flex-col gap-2">
            {missions.map((mission) => {
              const isCompleted = completedMissionIds.includes(mission.id);
              const isCurrent = mission.id === currentMissionId;
              return (
                <button
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-card/20 p-3 text-left backdrop-blur-sm transition-all duration-200",
                    isCompleted
                      ? "border-green-500/30 hover:border-green-500/60"
                      : isCurrent
                        ? "border-orange-500/30 bg-card/40 hover:border-orange-500/60"
                        : "border-border/30 hover:border-border/60 hover:bg-card/40"
                  )}
                  key={mission.id}
                  onClick={() => startMission(mission)}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/15 to-violet-500/15 text-base",
                      isCompleted && "from-green-500/20 to-green-500/10"
                    )}
                  >
                    {isCompleted ? "✓" : mission.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isCompleted
                          ? "text-green-400"
                          : isCurrent
                            ? "text-orange-300"
                            : "text-foreground"
                      )}
                    >
                      {mission.title}
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {mission.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground/60">
                    {mission.estimatedMinutes} min
                  </span>
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
