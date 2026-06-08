"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useActiveChat } from "@/hooks/use-active-chat";
import { type TopicSummary, topicSlug } from "@/lib/topic-threads";
import { cn } from "@/lib/utils";

// IDLE_SELECT_TOPIC (state 1) + TOPIC_SELECTED_TRANSITION (state 2).
//
// A full-screen, centered topic chooser shown when the student has topics to
// pick from but hasn't entered one yet. Big card-style buttons, minimal
// distraction. Tapping a card briefly scales it up while the others fade, then
// hands off to the learning flow (pickTopic → start gate / thread).
function useMergedTopics(): TopicSummary[] {
  const { topics, topicList } = useActiveChat();
  return useMemo(() => {
    const started = new Set(topics.map((t) => t.id));
    const pasted: TopicSummary[] = topicList
      .filter((title) => !started.has(topicSlug(title)))
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

export function TopicSelectScreen() {
  const { selectedTopicId, topicEntry, pickTopic, status, isLoading } =
    useActiveChat();
  const merged = useMergedTopics();
  const [picked, setPicked] = useState<string | null>(null);

  const busy = status === "submitted" || status === "streaming";

  // Only the idle state: topics exist, none open, no start gate up, not loading.
  const show =
    merged.length > 0 && !selectedTopicId && !topicEntry && !isLoading;

  const handlePick = (topic: TopicSummary) => {
    if (busy || picked) {
      return;
    }
    setPicked(topic.id);
    // Let the scale/fade play briefly, then start the topic.
    setTimeout(() => {
      pickTopic(topic.title);
      setPicked(null);
    }, 260);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-30 overflow-y-auto overscroll-contain bg-background"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          {/* min-h-full + my-auto centres the block only when it fits; once the
              list is taller than the viewport it top-aligns and scrolls, so the
              heading and first rows are always reachable. */}
          <div className="flex min-h-full w-full flex-col px-4 py-6 sm:px-6">
            <div className="mx-auto my-auto w-full max-w-4xl">
              <motion.h2
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 text-center font-bold text-xl text-foreground sm:text-2xl md:text-3xl"
                initial={{ opacity: 0, y: 12 }}
              >
                Pick what you want to learn 👇
              </motion.h2>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {merged.map((topic, i) => {
                  const isPicked = picked === topic.id;
                  const otherPicked = picked !== null && !isPicked;
                  const done = topic.status === "done";
                  return (
                    <motion.button
                      animate={{
                        opacity: otherPicked ? 0 : 1,
                        scale: isPicked ? 1.06 : 1,
                        y: 0,
                      }}
                      className={cn(
                        "flex min-h-[60px] items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-semibold text-[15px] shadow-[var(--shadow-card)] transition-colors sm:text-[16px]",
                        done
                          ? "border-green-500/40 bg-green-500/5 text-muted-foreground"
                          : "border-primary/30 bg-card hover:border-primary hover:bg-primary/5"
                      )}
                      disabled={busy || picked !== null}
                      initial={{ opacity: 0, y: 14 }}
                      key={topic.id}
                      onClick={() => handlePick(topic)}
                      transition={{
                        delay: picked ? 0 : Math.min(i * 0.02, 0.3),
                        duration: 0.2,
                      }}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-[14px]",
                          done
                            ? "bg-green-500 text-white"
                            : "bg-[image:var(--gradient-sunset)] text-white"
                        )}
                      >
                        {done ? "✓" : String.fromCharCode(65 + (i % 26))}
                      </span>
                      <span className={cn("flex-1", done && "line-through")}>
                        {topic.title}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
