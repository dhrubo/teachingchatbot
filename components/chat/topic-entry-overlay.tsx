"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ListChecksIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveChat } from "@/hooks/use-active-chat";

// Full-screen start gate shown when a new topic is created. The student reads
// the topic intro, then taps "Start learning" to drop into the topic thread.
// They can also close it and pick a different topic instead.
export function TopicEntryOverlay() {
  const { topicEntry, startTopic, dismissTopicEntry, status, visibleMessages } =
    useActiveChat();

  const busy = status === "submitted" || status === "streaming";

  // The intro text is the most recent assistant message in the (already
  // selected) topic thread, if the tutor has begun teaching.
  const intro =
    visibleMessages
      .filter((m) => m.role === "assistant")
      .at(-1)
      ?.parts.filter(
        (p): p is { type: "text"; text: string } => p.type === "text"
      )
      .map((p) => p.text)
      .join("\n\n") ?? "";

  return (
    <AnimatePresence>
      {topicEntry && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[image:var(--gradient-sunset)] p-4 md:p-8"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative w-full max-w-2xl rounded-2xl border border-white/20 bg-card/95 p-6 shadow-[var(--shadow-float)] backdrop-blur-md md:p-10"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button
              aria-label="Close"
              className="absolute top-4 right-4 rounded-full text-muted-foreground hover:text-foreground"
              disabled={busy}
              onClick={() => dismissTopicEntry(false)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
            <p className="mb-2 font-semibold text-[12px] text-primary uppercase tracking-wide">
              New topic 🚀
            </p>
            <h2 className="mb-4 font-bold text-2xl text-foreground">
              {topicEntry.title}
            </h2>
            {intro && (
              <div className="mb-6 max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">
                {intro}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-[var(--shadow-card)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
                disabled={busy}
                onClick={() => startTopic(topicEntry.topicId)}
                type="button"
              >
                Start learning →
              </Button>
              <Button
                className="rounded-full"
                disabled={busy}
                onClick={() => dismissTopicEntry(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <ListChecksIcon className="size-4" />
                Choose a different topic
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
