"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { useActiveChat } from "@/hooks/use-active-chat";
import { Button } from "@/components/ui/button";
import { topicSuggestions, guestRegex } from "@/lib/constants";
import { SaraMascot } from "@/components/brand/sara-mascot";
import { PlayerStats } from "@/components/brand/player-stats";
import { MissionCard } from "@/components/brand/mission-card";
import { TopicMap } from "@/components/brand/topic-map";
import { CoachBubble } from "@/components/brand/coach-bubble";

const COACH_MESSAGES = [
  "Start small. Win one concept at a time.",
  "Every right answer builds a stronger brain.",
  "You don't have to be great to start, but you have to start to be great.",
  "Small steps every day = big progress.",
  "Mistakes are proof that you're trying.",
  "Focus on one mission at a time — mastery, not speed.",
  "The best time to start was yesterday. The next best time is now.",
];

const DAILY_COACH =
  COACH_MESSAGES[new Date().getDate() % COACH_MESSAGES.length];

export function SaraDashboard() {
  const {
    sendMessage,
    xpStreak,
    topicProgress,
    topicList,
    completedTopics,
  } = useActiveChat();

  const { data, status } = useSession();
  const isGuest = guestRegex.test(data?.user?.email ?? "");
  const showAuth = status !== "loading" && (!data?.user || isGuest);

  const [year, setYear] = useState<"8" | "9">("8");

  const allTopics = topicSuggestions[year];
  const hasProgressData = xpStreak !== null && xpStreak.xp > 0;

  const topicCards = allTopics.map((t) => {
    const isCompleted = completedTopics.includes(t.label);
    const isActive = topicList.includes(t.label);
    return {
      title: t.label,
      emoji: t.emoji,
      progressPercent: isCompleted ? 100 : isActive ? 50 : 0,
      locked: false,
      onClick: () => sendMessage({ role: "user", parts: [{ type: "text", text: t.prompt }] }),
    };
  });

  return (
    <AnimatePresence>
      <motion.div
        key="sara-dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4C1D95] px-4 py-8"
      >
        {showAuth && (
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <Button
              asChild
              className="rounded-full px-4 text-white/70 hover:text-white"
              size="sm"
              variant="ghost"
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-[image:var(--gradient-sunset)] px-4 font-semibold text-white shadow-[var(--shadow-card)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
              size="sm"
            >
              <Link href="/register">Sign up free ✨</Link>
            </Button>
          </div>
        )}
        <div className="flex w-full max-w-xl flex-col gap-5 pt-12">
          <div className="flex flex-col items-center text-center">
            <SaraMascot size={88} animated mood="happy" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
              Meet SARA, your AI maths coach
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Build confidence with tiny lessons, smart hints, and one challenge
              at a time.
            </p>
          </div>

          <PlayerStats
            xp={hasProgressData ? xpStreak!.xp : 0}
            streak={hasProgressData ? xpStreak!.streak : 0}
            level={hasProgressData ? Math.floor(xpStreak!.xp / 100) + 1 : 1}
            badges={hasProgressData ? xpStreak!.badges.length : 0}
          />

          {topicProgress && topicProgress.score > 0 && (
            <MissionCard
              title={`Today's mission: ${topicProgress.topic}`}
              emoji="🎯"
              description={`Keep building your ${topicProgress.topic} skills`}
              progressPercent={Math.round((topicProgress.score / 5) * 100)}
              onClick={() =>
                sendMessage({
                  role: "user",
                  parts: [
                    {
                      type: "text",
                      text: `Let's continue with ${topicProgress.topic}.`,
                    },
                  ],
                })
              }
            />
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/80">Missions</h2>
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
              <button
                onClick={() => setYear("8")}
                className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                  year === "8"
                    ? "bg-gradient-to-r from-orange-500 to-violet-500 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Year 8
              </button>
              <button
                onClick={() => setYear("9")}
                className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                  year === "9"
                    ? "bg-gradient-to-r from-orange-500 to-violet-500 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Year 9
              </button>
            </div>
          </div>

          <TopicMap topics={topicCards} />

          <CoachBubble message={DAILY_COACH} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
