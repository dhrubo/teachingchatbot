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
    <div className="sticky top-0 z-20 mx-auto w-full max-w-3xl px-3 pt-2">
      <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card/95 shadow-[var(--shadow-card)] backdrop-blur-sm">
        <button
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
          onClick={() => setOpen((o) => !o)}
          type="button"
        >
          <span className="flex items-center gap-2 font-semibold text-[13px] text-foreground">
            📋 Your topics
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {doneCount}/{topicList.length} done
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform",
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
              <ul className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto px-3 pb-3 sm:grid-cols-2">
                {topicList.map((topic) => {
                  const done = isDone(topic, completedTopics);
                  return (
                    <li key={topic}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                          done
                            ? "text-muted-foreground line-through"
                            : "text-foreground hover:bg-primary/10 hover:text-primary"
                        )}
                        disabled={isBusy}
                        onClick={() => startTopic(topic)}
                        type="button"
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-full border",
                            done
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-border"
                          )}
                        >
                          {done && <CheckIcon className="size-3" />}
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
