"use client";

import { motion } from "framer-motion";
import { useActiveChat } from "@/hooks/use-active-chat";
import { cn } from "@/lib/utils";

// Converts the saved 0–5 mastery score to a percentage.
function scoreToPercent(score: number): number {
  return Math.round((Math.min(Math.max(score, 0), 5) / 5) * 100);
}

// Compact pill for the header: streak · XP · latest badge · tally · %.
export function ProgressPill() {
  const { answeredCount, topicProgress, xpStreak } = useActiveChat();

  const hasAnything =
    answeredCount > 0 || topicProgress || (xpStreak && xpStreak.xp > 0);
  if (!hasAnything) {
    return null;
  }

  const percent = topicProgress ? scoreToPercent(topicProgress.score) : 0;
  const latestBadge = xpStreak?.badges.at(-1);

  return (
    <div className="hidden items-center gap-2 rounded-full border border-border/50 bg-card/50 px-3 py-1 text-[12px] sm:flex">
      {xpStreak && xpStreak.streak > 0 && (
        <span className="font-semibold text-foreground">
          🔥 {xpStreak.streak}
        </span>
      )}
      {xpStreak && xpStreak.xp > 0 && (
        <span className="font-medium text-primary">{xpStreak.xp} XP</span>
      )}
      {latestBadge && (
        <span className="max-w-[120px] truncate text-muted-foreground">
          🏅 {latestBadge}
        </span>
      )}
      {answeredCount > 0 && (
        <>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground">
            {answeredCount} answered
          </span>
        </>
      )}
      {topicProgress && (
        <>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground">{percent}%</span>
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
            <motion.span
              animate={{ width: `${percent}%` }}
              className="block h-full rounded-full bg-[image:var(--gradient-sunset)]"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        </>
      )}
    </div>
  );
}

// Fuller bar shown above the answer panel during a question.
export function ProgressBar({ className }: { className?: string }) {
  const { answeredCount, topicProgress } = useActiveChat();

  if (!topicProgress && answeredCount === 0) {
    return null;
  }

  const percent = topicProgress ? scoreToPercent(topicProgress.score) : 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="font-medium text-foreground">
          {topicProgress?.topic ?? "Progress"}
          <span className="ml-1.5 text-muted-foreground">
            — {percent}% complete
          </span>
        </span>
        <span className="text-muted-foreground">
          {answeredCount} answered
        </span>
      </div>
      <span className="block h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.span
          animate={{ width: `${percent}%` }}
          className="block h-full rounded-full bg-[image:var(--gradient-sunset)]"
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </span>
    </div>
  );
}
