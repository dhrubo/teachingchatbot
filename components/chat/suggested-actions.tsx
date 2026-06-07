"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useState } from "react";
import { type TopicSuggestion, topicSuggestions } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Suggestion } from "../ai-elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

const YEARS = ["8", "9"] as const;
type Year = (typeof YEARS)[number];

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const [year, setYear] = useState<Year>("8");
  const topics = topicSuggestions[year];

  const send = (topic: TopicSuggestion) => {
    window.history.pushState(
      {},
      "",
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
    );
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: topic.prompt }],
    });
  };

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Year toggle */}
      <div
        aria-label="Choose your year group"
        className="mx-auto inline-flex rounded-full border border-border/50 bg-card/40 p-1"
        role="group"
      >
        {YEARS.map((y) => {
          const active = year === y;
          return (
            <button
              aria-pressed={active}
              className={cn(
                "relative rounded-full px-4 py-1.5 font-medium text-[13px] transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={y}
              onClick={() => setYear(y)}
              type="button"
            >
              {active && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-background shadow-[var(--shadow-card)]"
                  layoutId="year-toggle-pill"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">Year {y}</span>
            </button>
          );
        })}
      </div>

      {/* Topic chips */}
      <div
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
        data-testid="suggested-actions"
      >
        {topics.map((topic, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 12 }}
            key={`${year}-${topic.label}`}
            transition={{
              delay: 0.04 * index,
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Suggestion
              className="flex h-auto w-full flex-col items-start justify-start gap-1.5 whitespace-normal rounded-2xl border border-border/50 bg-card/30 px-3.5 py-3 text-left text-[13px] text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:shadow-[var(--shadow-card)]"
              onClick={() => send(topic)}
              suggestion={topic.prompt}
            >
              <span aria-hidden className="text-lg leading-none">
                {topic.emoji}
              </span>
              <span className="font-medium leading-tight">{topic.label}</span>
            </Suggestion>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  }
);
