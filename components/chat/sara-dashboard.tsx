"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { PlayerStats } from "@/components/brand/player-stats";
import { MissionMap } from "@/components/chat/mission-map";
import { TopicPasteBox } from "@/components/chat/topic-paste-box";
import { useActiveChat } from "@/hooks/use-active-chat";
import { useStartTopic } from "@/hooks/use-start-topic";
import { useMission } from "@/components/chat/mission-orchestrator";
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

const SUBJECT_EMOJIS: Record<string, string> = {
  maths: "📐",
  science: "🧪",
  geography: "🌍",
  english: "📖",
};

const SUBJECT_TITLES: Record<string, string> = {
  maths: "Maths",
  science: "Science",
  geography: "Geography",
  english: "English",
};

function subjectTitle(slug: string): string {
  return SUBJECT_TITLES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function SaraDashboard() {
  const { xpStreak, topicProgress, completedTopics } = useActiveChat();
  const startTopic = useStartTopic();
  const { fastTrackChallenge } = useMission();
  const { data, status } = useSession();
  const isGuest = guestRegex.test(data?.user?.email ?? "");
  const isLoggedIn = status === "authenticated" && !isGuest;

  const [year, setYear] = useState<"8" | "9">("8");
  const [subject, setSubject] = useState<string>("maths");

  const { data: apiData, error: apiError } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lessons?year=${year}&subject=${subject}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const { data: subjectsData } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lessons?subjects=true`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const subjects: { slug: string; title: string; yearGroups: number[] }[] =
    useMemo(() => subjectsData?.subjects ?? [], [subjectsData]);

  const yearNum = Number(year);
  const activeSubjectYearGroups = useMemo(
    () => subjects.find((s) => s.slug === subject)?.yearGroups ?? [8],
    [subjects, subject]
  );

  // Reset year to first available if current year isn't available for this subject
  useEffect(() => {
    if (activeSubjectYearGroups.length > 0 && !activeSubjectYearGroups.includes(yearNum)) {
      setYear(String(activeSubjectYearGroups[0]) as "8" | "9");
    }
  }, [subject, activeSubjectYearGroups, yearNum]);

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

  // Retrieval practice data (logged-in users only)
  const { data: retrievalData } = useSWR(
    isLoggedIn
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/retrieval-practice`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

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

  async function startMissionDirectQuiz(mission: any) {
    await startTopic({ id: mission.id, title: mission.title, emoji: mission.emoji });
    fastTrackChallenge();
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
            "Welcome back! Ready to explore something new today?"
          </p>
        </section>

        {/* ---- Hero Row ---- */}
        <section className="text-center py-4">
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl leading-tight">
            Your GCSE{" "}
            <span className="bg-gradient-to-r from-orange-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent font-black">
              Tutor & Quiz Master
            </span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/90 font-medium max-w-lg mx-auto">
            SARA adapts to your syllabus — every subject, one lesson at a time.
          </p>
        </section>

        {/* ---- Today's Retrieval Practice (logged-in only) ---- */}
        {isLoggedIn && retrievalData?.dueCount > 0 && (
          <section className="rounded-2xl border border-emerald-500/15 bg-emerald-950/10 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <div>
                  <p className="text-sm font-bold text-emerald-300">
                    Today's Retrieval Practice
                  </p>
                  <p className="text-xs text-emerald-400/60">
                    {retrievalData.dueCount} skills due for review
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {retrievalData.retrievalPractice?.slice(0, 3).map(
                  (item: { skillSlug: string; masteryScore: number }) => (
                    <span
                      className="rounded-full bg-emerald-950/50 border border-emerald-500/20 px-3 py-1 text-[11px] font-medium text-emerald-300"
                      key={item.skillSlug}
                    >
                      {item.skillSlug.replace(/_/g, " ")}
                    </span>
                  )
                )}
              </div>
            </div>
          </section>
        )}

        {/* ---- Full-width Search Box ---- */}
        <section className="w-full">
          <TopicPasteBox />
        </section>

        {/* ---- What is SARA? (full width, underneath search) ---- */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center backdrop-blur-md">
          <h2 className="text-sm font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
            What is SARA?
          </h2>
          <div className="mt-3 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground">
            <span>📖 Short visual lessons</span>
            <span>🎯 Concept cards</span>
            <span>⚡ Quiz challenges</span>
            <span>📊 Progress tracking</span>
          </div>
        </section>

        {/* ---- PlayerStats (logged-in only) ---- */}
        {isLoggedIn && hasProgressData && stats && (
          <PlayerStats
            badges={stats.badges.length}
            level={Math.floor(stats.xp / 100) + 1}
            streak={stats.streak}
            xp={stats.xp}
          />
        )}

        {/* ---- Dynamic Subject Tabs ---- */}
        <section>
          {/* Subject tab bar — horizontal on desktop, scrollable pills on mobile */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar md:overflow-x-visible md:border-b md:border-white/5">
            {subjects.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No subjects available yet</p>
            )}
            {subjects.map((s) => (
              <button
                key={s.slug}
                className={cn(
                  "whitespace-nowrap rounded-full md:rounded-none md:rounded-t-lg px-4 py-2 text-xs font-bold transition-all duration-200 shrink-0",
                  subject === s.slug
                    ? "bg-orange-500/15 text-orange-400 md:bg-transparent md:text-orange-400 md:border-b-2 md:border-orange-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 md:hover:bg-transparent"
                )}
                onClick={() => setSubject(s.slug)}
                type="button"
              >
                <span className="mr-1.5">{SUBJECT_EMOJIS[s.slug] ?? "📖"}</span>
                GCSE {s.title}
              </button>
            ))}
          </div>

          {/* Year toggle — only shows years available for this subject */}
          {activeSubjectYearGroups.length > 1 && (
            <div className="flex gap-1.5 mt-3 mb-4">
              {activeSubjectYearGroups.map((y) => (
                <button
                  key={y}
                  className={cn(
                    "rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                    Number(year) === y
                      ? "bg-gradient-to-r from-orange-500 to-violet-600 text-white shadow-md shadow-orange-500/20"
                      : "text-muted-foreground hover:text-foreground border border-white/5 hover:bg-white/5"
                  )}
                  onClick={() => setYear(String(y) as "8" | "9")}
                  type="button"
                >
                  Year {y}
                </button>
              ))}
            </div>
          )}

          {/* Topic grid with Quiz buttons */}
          {missions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {missions.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/10 hover:bg-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{m.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate">
                        {m.gcseDomain?.replace(/_/g, " ") || "GCSE"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-[10px] font-extrabold text-white shadow-lg shadow-violet-500/15 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
                      onClick={() => startMissionDirectQuiz(m)}
                      type="button"
                    >
                      Quiz ⚡
                    </button>
                    <button
                      className="rounded-full bg-gradient-to-r from-orange-500 to-violet-600 px-3 py-1.5 text-[10px] font-extrabold text-white shadow-lg shadow-orange-500/15 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
                      onClick={() => startMission(m)}
                      type="button"
                    >
                      Start →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : apiError ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Couldn&apos;t load topics. Make sure you&apos;re connected to the internet.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">
              No topics available for {subjectTitle(subject)} Year {year} yet.
            </p>
          )}
        </section>

        {/* ---- Active Content ---- */}
        <>
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
                      <span>{todayMission.gcseDomain?.replace(/_/g, " ") || "GCSE"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 shrink-0">
                    <button
                      className="w-full sm:w-auto rounded-full border border-orange-500/30 bg-orange-500/10 px-5 py-2.5 text-xs font-extrabold text-orange-400 hover:text-white hover:bg-orange-500/20 hover:border-orange-500/50 shadow-md shadow-orange-500/5 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_15px_rgba(249,115,22,0.25)] active:scale-[0.95]"
                      onClick={() => startMissionDirectQuiz(todayMission)}
                      type="button"
                    >
                      ⚡ Fast-Track Quiz
                    </button>
                    <button
                      className="w-full sm:w-auto rounded-full bg-gradient-to-r from-orange-500 to-violet-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:scale-[1.05] hover:shadow-orange-500/40 active:scale-[0.95]"
                      onClick={() => startMission(todayMission)}
                      type="button"
                    >
                      {continueMission ? "Continue →" : "Start →"}
                    </button>
                  </div>
                </div>
              </section>
            )}

            <div className="my-2 h-px bg-white/5" />

            {/* ---- Fast-Track Challenge Mode Banner ---- */}
            {todayMission && (
              <div className="mb-6 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 to-indigo-950/40 p-6 text-left relative overflow-hidden shadow-[0_0_30px_rgba(124,58,237,0.15)] backdrop-blur-md transition-all duration-300 hover:border-violet-500/50 hover:shadow-[0_0_40px_rgba(124,58,237,0.3)] hover:-translate-y-0.5">
                <div className="absolute -right-10 -bottom-10 size-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                      🏆 Challenge Mode: Year {year} {subjectTitle(subject)}
                    </h3>
                    <p className="mt-2 text-xs text-violet-200/80 leading-relaxed max-w-xl font-medium">
                      Skip the cards and test your secure understanding with a 5-question adaptive quiz immediately! 🚀
                    </p>
                  </div>
                  <button
                    className="w-full sm:w-auto shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-300 hover:scale-[1.05] active:scale-[0.95]"
                    onClick={() => startMissionDirectQuiz(todayMission)}
                    type="button"
                  >
                    Take Quiz Now ⚡
                  </button>
                </div>
              </div>
            )}

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
          </>

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

        <div className="h-8" />
      </motion.div>
    </div>
  );
}
