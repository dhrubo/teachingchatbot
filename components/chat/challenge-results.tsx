"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ChallengeResults, WrongAnswerRecord } from "./challenge-mode";

type ChallengeResultsScreenProps = {
  results: ChallengeResults;
  missionTitle: string;
  onContinue: () => void;
  onReview?: () => void;
};

function starRating(score: number, total: number): string {
  const filled = Math.round((score / total) * 5);
  return "⭐".repeat(Math.max(0, filled)) + "☆".repeat(Math.max(0, 5 - filled));
}

function strongSkills(wrong: WrongAnswerRecord[]): string[] {
  // Identify skills the student got right — for now, we infer from absence in wrong list.
  const wrongSlugs = new Set(wrong.map((w) => w.skillSlug));
  return wrongSlugs.size > 0 ? [] : ["Good progress across all skills"];
}

function weakSkills(wrong: WrongAnswerRecord[]): string[] {
  const slugs = [...new Set(wrong.map((w) => w.skillSlug))];
  if (slugs.length === 0) return [];
  return slugs.map((s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
}

export function ChallengeResultsScreen({
  results,
  missionTitle,
  onContinue,
  onReview,
}: ChallengeResultsScreenProps) {
  const pct =
    results.questionCount > 0
      ? Math.round((results.finalScore / results.questionCount) * 100)
      : 0;
  const wrongCount = results.questionCount - results.finalScore;
  const wrong = results.wrongAnswers ?? [];
  const weak = weakSkills(wrong);
  const strong = strongSkills(wrong);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-12 text-center"
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
    >
      <div className="mb-4 text-5xl">🏆</div>
      <h2 className="mb-1 text-2xl font-bold text-foreground">
        Challenge Complete!
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {missionTitle}
      </p>
      <div className="mb-4 text-3xl tracking-widest">
        {starRating(results.finalScore, results.questionCount)}
      </div>
      <p className="mb-1 text-lg text-foreground">
        Score:{" "}
        <strong>
          {results.finalScore} / {results.questionCount}
        </strong>
      </p>
      <p className="mb-6 text-xs text-muted-foreground">
        Correct: {results.finalScore} • Wrong: {wrongCount} • Accuracy: {pct}%
      </p>

      {/* Strong Skills */}
      {strong.length > 0 && (
        <div className="mb-4 w-full rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-left">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-600">
            ✓ Strong Skills
          </p>
          {strong.map((s) => (
            <p className="text-sm text-foreground/80" key={s}>
              ✓ {s}
            </p>
          ))}
        </div>
      )}

      {/* Needs Practice */}
      {weak.length > 0 && (
        <div className="mb-6 w-full rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-left">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
            ⚠ Needs Practice
          </p>
          {weak.map((s) => (
            <p className="text-sm text-foreground/80" key={s}>
              ⚠ {s}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {onReview && wrongCount > 0 && (
          <Button
            className="rounded-full border border-border/60 bg-card px-5 text-sm text-foreground shadow-sm"
            onClick={onReview}
            variant="outline"
          >
            Review Mistakes
          </Button>
        )}
        <Button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
          onClick={onContinue}
        >
          Continue Learning →
        </Button>
      </div>
    </motion.div>
  );
}
