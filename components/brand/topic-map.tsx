"use client";

import { cn } from "@/lib/utils";

interface TopicCard {
  title: string;
  emoji: string;
  progressPercent: number;
  locked: boolean;
  onClick: () => void;
}

interface TopicMapProps {
  topics: TopicCard[];
}

export function TopicMap({ topics }: TopicMapProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {topics.map((topic) => (
        <button
          className={cn(
            "flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-lg transition-all duration-200",
            !topic.locked &&
              "hover:scale-[1.03] hover:bg-white/[0.07] active:scale-[0.98]",
            topic.locked && "cursor-not-allowed opacity-40"
          )}
          disabled={topic.locked}
          key={topic.title}
          onClick={topic.locked ? undefined : topic.onClick}
        >
          <span className="text-xl leading-none">{topic.emoji}</span>
          <h4 className="mt-1.5 text-xs font-semibold text-white/90">
            {topic.title}
          </h4>
          {topic.locked ? (
            <span className="mt-1 text-[9px] text-white/40">🔒 Locked</span>
          ) : (
            <>
              {topic.progressPercent > 0 ? (
                <>
                  <span className="mt-0.5 text-[9px] text-white/50">
                    {topic.progressPercent}% done
                  </span>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-violet-500"
                      style={{
                        width: `${Math.min(topic.progressPercent, 100)}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <span className="mt-1 text-[9px] text-white/40">Ready</span>
              )}
            </>
          )}
        </button>
      ))}
    </div>
  );
}
