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
  const { topicList, completedTopics } = useActiveChat();
  const [open, setOpen] = useState(true);

  if (topicList.length === 0) {
    return null;
  }

  const doneCount = topicList.filter((t) => isDone(t, completedTopics)).length;

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
                    <li
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px]",
                        done
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      )}
                      key={topic}
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
