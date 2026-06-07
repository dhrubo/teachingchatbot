"use client";

import { BookOpenIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useActiveChat } from "@/hooks/use-active-chat";
import { TopicsMenu } from "./topics-menu";

// Thin sticky strip telling the student which topic thread they're in, with
// controls to switch topic or leave (the latter routed through the soft lock).
export function ActiveTopicBar() {
  const { topics, selectedTopicId, requestLeave } = useActiveChat();
  const [menuOpen, setMenuOpen] = useState(false);

  const topic = topics.find((t) => t.id === selectedTopicId);
  if (!topic) {
    return null;
  }

  return (
    <div className="sticky top-0 z-20 mx-auto w-full max-w-5xl px-3 pt-3">
      <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-card/95 px-4 py-2.5 shadow-[var(--shadow-float)] backdrop-blur-sm">
        <BookOpenIcon className="size-4 shrink-0 text-primary" />
        <span className="flex-1 truncate font-semibold text-[14px] text-foreground">
          {topic.title}
        </span>
        {topic.challengeTotal > 0 && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {topic.challengeDone}/{topic.challengeTotal} challenges
          </span>
        )}
        <Button
          className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => setMenuOpen(true)}
          size="sm"
          type="button"
          variant="ghost"
        >
          Switch topic
        </Button>
        <Button
          aria-label="Leave topic"
          className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => requestLeave(null)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
      <TopicsMenu onOpenChange={setMenuOpen} open={menuOpen} />
    </div>
  );
}
