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
          className="w-full bg-indigo-950/45 border border-indigo-500/20 shadow-lg shadow-indigo-950/60 backdrop-blur-md rounded-2xl p-6"
          exit={{ opacity: 0, x: -20 }}
          initial={{ opacity: 0, x: 20 }}
          key={currentIndex}
          transition={{ duration: 0.2 }}
        >
          {/* Question */}
          <div className="mb-4 rounded-xl border border-indigo-500/10 bg-indigo-950/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300/70">
              Question
            </p>
            <p className="mt-1 text-sm font-medium text-slate-100">{current.prompt}</p>
          </div>

          {/* Your answer */}
          <div className="mb-3 flex items-center justify-between rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent p-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 border border-red-500/30">
                Your Answer
              </span>
              <span className="text-sm font-medium text-red-300 line-through decoration-red-500 decoration-2">
                {current.studentAnswer}
              </span>
            </div>
            <span className="text-lg">❌</span>
          </div>

          {/* Correct answer */}
          <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent p-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                Correct Answer
              </span>
              <span className="text-sm font-bold tracking-wide text-emerald-300">
                {current.correctAnswer}
              </span>
            </div>
            <span className="text-lg">✅</span>
          </div>

          {/* Worked solution */}
          <div className="mb-4 rounded-xl border-l-4 border-l-blue-500 border border-indigo-500/10 bg-indigo-950/20 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-400">
              Worked Solution
            </p>
            {current.explanation ? (
              <p className="text-sm leading-relaxed text-slate-200">
                {current.explanation}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-slate-300">
                <span className="font-semibold text-emerald-400">{current.correctAnswer}</span> is the correct answer.
              </p>
            )}
          </div>

          {/* Misconception hint */}
          <div className="rounded-xl border-l-4 border-l-amber-500 border border-amber-500/10 bg-amber-500/5 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-400">
              💡 Misconception Tip
            </p>
            <p className="text-sm leading-relaxed text-amber-100/90">
              Double-check your working step by step. You may have made a small
              slip in the method.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation between mistakes */}
      <div className="mt-4 flex w-full items-center justify-between">
        <Button
          className="rounded-full px-4 py-2 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-50 text-indigo-200 hover:text-white"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          size="sm"
          variant="ghost"
        >
          ← Previous
        </Button>
        <span className="text-xs font-semibold text-indigo-300">
          {currentIndex + 1} / {wrongAnswers.length}
        </span>
        {isLast ? (
          <div />
        ) : (
          <Button
            className="rounded-full px-4 py-2 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg active:scale-95 text-indigo-200 hover:text-white"
            onClick={() => setCurrentIndex((i) => Math.min(wrongAnswers.length - 1, i + 1))}
            size="sm"
            variant="ghost"
          >
            Next →
          </Button>
        )}
      </div>

      {/* CTAs */}
      <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
        {meta.map((m) => (
          <Button
            className={`w-full rounded-full text-sm font-semibold transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.99] ${
              m.variant === "primary"
                ? "bg-[image:var(--gradient-sunset)] text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/35 border-0"
                : m.variant === "outline"
                ? "border border-indigo-500/30 bg-indigo-950/25 text-indigo-200 shadow-md hover:bg-indigo-900/40 hover:text-white"
                : "text-indigo-300 hover:bg-indigo-950/40 hover:text-white"
            }`}
            key={m.action}
            onClick={() => onAction(m.action)}
            size="lg"
            variant={m.variant === "primary" ? "default" : m.variant === "outline" ? "outline" : "ghost"}
          >
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
