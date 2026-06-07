"use client";

import { CheckIcon, CircleDotIcon, CircleIcon } from "lucide-react";
import type { TopicSummary } from "@/lib/topic-threads";
import { cn } from "@/lib/utils";

type TopicListItemProps = {
  topic: TopicSummary;
  active: boolean;
  onSelect: (id: string) => void;
};

// A single row in the "Your topics" menu. Shows done / in-progress /
// not-started state and highlights the currently open topic.
export function TopicListItem({ topic, active, onSelect }: TopicListItemProps) {
  const done = topic.status === "done";
  const inProgress = topic.status === "in-progress";

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[14px] transition-all",
        active
          ? "border-primary/50 bg-primary/10 text-foreground"
          : done
            ? "border-transparent text-muted-foreground hover:bg-accent/40"
            : "border-border/50 text-foreground hover:border-primary/50 hover:bg-primary/5"
      )}
      onClick={() => onSelect(topic.id)}
      type="button"
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          done
            ? "border-green-500 bg-green-500 text-white"
            : inProgress
              ? "border-primary text-primary"
              : "border-border text-muted-foreground"
        )}
      >
        {done ? (
          <CheckIcon className="size-3.5" />
        ) : inProgress ? (
          <CircleDotIcon className="size-3" />
        ) : (
          <CircleIcon className="size-3" />
        )}
      </span>
      <span className={cn("flex-1 truncate", done && "line-through")}>
        {topic.title}
      </span>
      {topic.challengeTotal > 0 && (
        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 text-[11px] font-medium text-primary">
          {topic.challengeDone}/{topic.challengeTotal}
        </span>
      )}
    </button>
  );
}
