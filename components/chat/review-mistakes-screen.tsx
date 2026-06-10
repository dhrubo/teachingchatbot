"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { WrongAnswerRecord } from "./challenge-mode";
import type { LessonAction } from "@/lib/learning-state-machine";

type ReviewMistakesScreenProps = {
  missionTitle: string;
  missionEmoji: string;
  wrongAnswers: WrongAnswerRecord[];
  allowedActions: LessonAction[];
  onAction: (action: LessonAction) => void;
};

type ActionMeta = {
  label: string;
  action: LessonAction;
  variant: "primary" | "outline" | "ghost";
};

export function ReviewMistakesScreen({
  missionTitle,
  missionEmoji,
  wrongAnswers,
  allowedActions,
  onAction,
}: ReviewMistakesScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const meta: ActionMeta[] = allowedActions
    .filter((a) => a !== "explain_answer")
    .map((a) => {
      switch (a) {
        case "retry_similar":
          return { label: "Retry Similar Question", action: a, variant: "primary" as const };
        case "show_example":
          return { label: "Show Another Example", action: a, variant: "outline" as const };
        case "continue_learning":
          return { label: "Continue Learning", action: a, variant: "outline" as const };
        case "choose_topic":
          return { label: "Choose Another Topic", action: a, variant: "ghost" as const };
        default:
          return { label: a.replace(/_/g, " "), action: a, variant: "outline" as const };
      }
    });

  if (wrongAnswers.length === 0) {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center px-6 py-16 text-center"
        exit={{ opacity: 0, y: 20 }}
        initial={{ opacity: 0, y: 20 }}
      >
        <div className="mb-4 text-4xl">🎉</div>
        <h2 className="mb-2 text-xl font-bold text-foreground">
          No Mistakes Recorded Yet
        </h2>
        <p className="mb-8 max-w-xs text-sm text-muted-foreground">
          You haven&apos;t made any mistakes in this session. Great work!
        </p>
        <div className="flex flex-col gap-2">
          <Button
            className="rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
            onClick={() => onAction("choose_topic")}
            size="sm"
          >
            Choose a Topic
          </Button>
          <Button
            className="rounded-full"
            onClick={() => onAction("continue_learning")}
            size="sm"
            variant="outline"
          >
            Start Learning
          </Button>
        </div>
      </motion.div>
    );
  }

  const current = wrongAnswers[currentIndex];
  const isLast = currentIndex >= wrongAnswers.length - 1;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-8">
      <div className="mb-4 text-center">
        <span className="text-2xl">{missionEmoji}</span>
        <h2 className="mt-1 text-lg font-bold text-foreground">
          {missionTitle} · Review Mistakes
        </h2>
        <p className="text-xs text-muted-foreground">
          Question {currentIndex + 1} of {wrongAnswers.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="w-full rounded-2xl border border-border/50 bg-card p-5"
          exit={{ opacity: 0, x: -20 }}
          initial={{ opacity: 0, x: 20 }}
          key={currentIndex}
          transition={{ duration: 0.2 }}
        >
          {/* Question */}
          <div className="mb-3 rounded-xl border border-border/30 bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Question
            </p>
            <p className="mt-1 text-sm text-foreground">{current.prompt}</p>
          </div>

          {/* Your answer */}
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              Your answer
            </span>
            <span className="text-sm text-destructive line-through">
              {current.studentAnswer}
            </span>
          </div>

          {/* Correct answer */}
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
              Correct answer
            </span>
            <span className="text-sm font-semibold text-green-500">
              {current.correctAnswer}
            </span>
          </div>

          {/* Worked solution */}
          <div className="mb-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
              Worked Solution
            </p>
            {current.explanation ? (
              <p className="text-sm leading-relaxed text-foreground/80">
                {current.explanation}
              </p>
            ) : (
              <p className="text-sm text-foreground/60">
                {current.correctAnswer} is the correct answer.
              </p>
            )}
          </div>

          {/* Misconception hint */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
              Tip
            </p>
            <p className="text-sm text-foreground/80">
              Double-check your working step by step. You may have made a small
              slip in the method.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation between mistakes */}
      <div className="mt-4 flex w-full items-center justify-between">
        <Button
          className="rounded-full"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          size="sm"
          variant="ghost"
        >
          ← Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {wrongAnswers.length}
        </span>
        {isLast ? (
          <div />
        ) : (
          <Button
            className="rounded-full"
            onClick={() => setCurrentIndex((i) => Math.min(wrongAnswers.length - 1, i + 1))}
            size="sm"
            variant="ghost"
          >
            Next →
          </Button>
        )}
      </div>

      {/* CTAs */}
      <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
        {meta.map((m) => (
          <Button
            className={
              m.variant === "primary"
                ? "rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
                : "rounded-full"
            }
            key={m.action}
            onClick={() => onAction(m.action)}
            size="sm"
            variant={m.variant === "primary" ? "default" : m.variant}
          >
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
