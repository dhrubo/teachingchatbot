"use client";

import { ListChecksIcon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActiveChat } from "@/hooks/use-active-chat";
import { type TopicSummary, topicSlug } from "@/lib/topic-threads";
import { cn } from "@/lib/utils";
import { TopicListItem } from "./topic-list-item";

// Merge started topic sessions with topics the student pasted but hasn't
// started yet. Started sessions win (keyed by slug) so a pasted topic that's
// since become a thread shows its live status rather than a duplicate
// not-started row. Pasted-only topics get a synthetic not-started summary.
function useMergedTopics(): TopicSummary[] {
  const { topics, topicList } = useActiveChat();
  return useMemo(() => {
    const startedSlugs = new Set(topics.map((t) => t.id));
    const pasted: TopicSummary[] = topicList
      .filter((title) => !startedSlugs.has(topicSlug(title)))
      .map((title) => ({
        id: topicSlug(title),
        title,
        status: "not-started",
        challengeTotal: 0,
        challengeDone: 0,
        startIndex: -1,
      }));
    return [...topics, ...pasted];
  }, [topics, topicList]);
}

// The list of topic threads, in a right-side sheet. A started topic routes
// through requestLeave (the soft close-lock can intercept). A not-yet-started
// topic from the pasted list is kicked off via pickTopic, which asks the tutor
// to begin it.
function TopicsSheetBody({ onClose }: { onClose: () => void }) {
  const { selectedTopicId, requestLeave, pickTopic } = useActiveChat();
  const merged = useMergedTopics();

  if (merged.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-[14px] text-muted-foreground">
        No topics yet — start one and it'll appear here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {merged.map((topic) => (
        <li key={topic.id}>
          <TopicListItem
            active={topic.id === selectedTopicId}
            onSelect={() => {
              // startIndex -1 marks a pasted topic with no thread yet.
              if (topic.startIndex === -1) {
                pickTopic(topic.title);
              } else {
                requestLeave(topic.id);
              }
              onClose();
            }}
            topic={topic}
          />
        </li>
      ))}
    </ul>
  );
}

// Controlled topics sheet — reused by the header button and the in-thread
// "Switch topic" control.
export function TopicsMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-[85%] sm:max-w-sm" side="right">
        <SheetHeader>
          <SheetTitle>Your topics</SheetTitle>
          <SheetDescription>
            Pick a topic to open its lesson and challenges.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto px-4 pb-6">
          <TopicsSheetBody onClose={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Header button: opens the topics sheet, with a done/total count badge.
// Visible as soon as there's anything to pick — either a started session or a
// topic the student pasted into the chat.
export function TopicsMenuButton({ className }: { className?: string }) {
  const merged = useMergedTopics();
  const { topicsMenuOpen, setTopicsMenuOpen } = useActiveChat();

  if (merged.length === 0) {
    return null;
  }

  const doneCount = merged.filter((t) => t.status === "done").length;

  return (
    <>
      <Button
        className={cn(
          "gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 font-semibold text-primary shadow-[var(--shadow-card)] transition-transform hover:scale-[1.03] hover:bg-primary/15 active:scale-[0.98]",
          className
        )}
        onClick={() => setTopicsMenuOpen(true)}
        size="sm"
        variant="ghost"
      >
        <ListChecksIcon className="size-4" />
        <span>Your topics</span>
        <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
          {doneCount}/{merged.length}
        </span>
      </Button>
      <TopicsMenu onOpenChange={setTopicsMenuOpen} open={topicsMenuOpen} />
    </>
  );
}
