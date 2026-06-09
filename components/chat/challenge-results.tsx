"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ChallengeResults } from "./challenge-mode";

type ChallengeResultsScreenProps = {
  results: ChallengeResults;
  missionTitle: string;
  onContinue: () => void;
  onReview?: () => void;
};

function starRating(score: number, total: number): string {
  const filled = Math.round((score / total) * 5);
  return (
    "⭐".repeat(Math.max(0, filled)) + "☆".repeat(Math.max(0, 5 - filled))
  );
}

export function ChallengeResultsScreen({
  results,
  missionTitle,
  onContinue,
  onReview,
}: ChallengeResultsScreenProps) {
  const pct =
    results.total > 0
      ? Math.round((results.correct / results.total) * 100)
      : 0;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
    >
      <div className="mb-4 text-5xl">🏆</div>
      <h2 className="mb-1 text-2xl font-bold text-foreground">
        Mission Complete!
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {missionTitle} • Challenge Mode
      </p>
      <div className="mb-4 text-3xl tracking-widest">
        {starRating(results.correct, results.total)}
      </div>
      <p className="mb-1 text-lg text-foreground">
        Score: <strong>{results.correct} / {results.total}</strong>
      </p>
      <p className="mb-6 text-xs text-muted-foreground">
        Correct: {results.correct} • Wrong: {results.wrong} • Accuracy: {pct}%
      </p>
      <div className="flex gap-3">
        {onReview && results.wrong > 0 && (
          <Button
            className="rounded-full border border-border/60 bg-card px-5 text-sm text-foreground shadow-sm"
            onClick={onReview}
            variant="outline"
          >
            Review mistakes
          </Button>
        )}
        <Button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
          onClick={onContinue}
        >
          Continue learning →
        </Button>
      </div>
    </motion.div>
  );
}
