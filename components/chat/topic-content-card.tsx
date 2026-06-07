"use client";

import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  EyeIcon,
  LayersIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveChat } from "@/hooks/use-active-chat";

// Gating actions shown after a topic's content (the Accept gate), and the
// recovery actions shown after a wrong answer (the recovery gate). In both
// cases the graded challenge stays hidden until the student taps a button.
export function TopicContentCard() {
  const {
    selectedTopicId,
    topicPhase,
    topicEntry,
    acceptChallenge,
    readNextTopic,
    explainDifferently,
    recoverWith,
    status,
  } = useActiveChat();

  const busy = status === "submitted" || status === "streaming";

  if (!selectedTopicId || topicEntry) {
    return null;
  }

  // Wrong-answer recovery gate: let the student choose how they want help.
  if (topicPhase === "awaiting-recovery") {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-destructive/30 bg-card/80 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.3 }}
      >
        <p className="mb-3 font-medium text-[14px] text-foreground">
          No worries — how would you like to tackle it?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-full"
            disabled={busy}
            onClick={() => recoverWith("See the explanation")}
            size="sm"
            type="button"
            variant="outline"
          >
            <EyeIcon className="size-4" />
            See the explanation
          </Button>
          <Button
            className="rounded-full"
            disabled={busy}
            onClick={() => recoverWith("Break it down further")}
            size="sm"
            type="button"
            variant="outline"
          >
            <LayersIcon className="size-4" />
            Break it down further
          </Button>
          <Button
            className="rounded-full text-muted-foreground hover:text-foreground"
            disabled={busy}
            onClick={() => recoverWith("Explain another way")}
            size="sm"
            type="button"
            variant="ghost"
          >
            <SparklesIcon className="size-4" />
            Explain another way
          </Button>
          <Button
            className="rounded-full bg-[image:var(--gradient-sunset)] px-4 font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
            disabled={busy}
            onClick={() => recoverWith("Try the question again")}
            size="sm"
            type="button"
          >
            <RotateCcwIcon className="size-4" />
            Try the question again
          </Button>
        </div>
      </motion.div>
    );
  }

  // Accept gate: only in the content / awaiting-accept phases.
  if (topicPhase !== "content" && topicPhase !== "awaiting-accept") {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/30 bg-card/80 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm"
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3 }}
    >
      <p className="mb-3 font-medium text-[14px] text-foreground">
        Ready to try it, or want it explained another way?
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
          disabled={busy}
          onClick={acceptChallenge}
          size="sm"
          type="button"
        >
          🎯 Accept the challenge
        </Button>
        <Button
          className="rounded-full"
          disabled={busy}
          onClick={readNextTopic}
          size="sm"
          type="button"
          variant="outline"
        >
          <ArrowRightIcon className="size-4" />
          Read next topic
        </Button>
        <Button
          className="rounded-full text-muted-foreground hover:text-foreground"
          disabled={busy}
          onClick={explainDifferently}
          size="sm"
          type="button"
          variant="ghost"
        >
          <RefreshCwIcon className="size-4" />
          Explain differently
        </Button>
      </div>
    </motion.div>
  );
}
