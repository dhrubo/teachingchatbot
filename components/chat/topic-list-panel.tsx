"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { useActiveChat } from "@/hooks/use-active-chat";
import { cn } from "@/lib/utils";

// A topic counts as done if the tutor has saved progress for a topic whose
// name loosely matches (case-insensitive substring either way).
function isDone(topic: string, completed: string[]): boolean {
  const t = topic.toLowerCase();
  return completed.some((c) => {
    const cl = c.toLowerCase();
    return cl.includes(t) || t.includes(cl);
  });
}

export function TopicListPanel() {
  const { topicList, completedTopics, sendMessage, status } = useActiveChat();
  // Collapsed by default so it's a thin bar, not a big overlay over the
  // reading area — the user expands it to pick/track topics.
  const [open, setOpen] = useState(false);

  if (topicList.length === 0) {
    return null;
  }

  const isBusy = status === "submitted" || status === "streaming";
  const doneCount = topicList.filter((t) => isDone(t, completedTopics)).length;

  const startTopic = (topic: string) => {
    if (isBusy) {
      return;
    }
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: `Let's start: ${topic}` }],
    });
  };

  return (
    <div className="sticky top-0 z-20 mx-auto w-full max-w-5xl px-3 pt-3">
      <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card/95 shadow-[var(--shadow-float)] backdrop-blur-sm">
        <button
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left"
          onClick={() => setOpen((o) => !o)}
          type="button"
        >
          <span className="flex items-center gap-2.5 font-semibold text-[15px] text-foreground">
            📋 Your topics
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-medium text-primary">
              {doneCount}/{topicList.length} done
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              "size-5 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <ul className="grid max-h-[60vh] grid-cols-1 gap-1.5 overflow-y-auto px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                {topicList.map((topic) => {
                  const done = isDone(topic, completedTopics);
                  return (
                    <li key={topic}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition-all",
                          done
                            ? "border-transparent text-muted-foreground line-through"
                            : "border-border/50 text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[var(--shadow-card)]"
                        )}
                        disabled={isBusy}
                        onClick={() => startTopic(topic)}
                        type="button"
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border",
                            done
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-border"
                          )}
                        >
                          {done && <CheckIcon className="size-3.5" />}
                        </span>
                        {topic}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
