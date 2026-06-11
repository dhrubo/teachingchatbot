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
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center text-center bg-indigo-950/45 border border-indigo-500/20 shadow-lg shadow-indigo-950/60 backdrop-blur-md rounded-2xl p-8"
        exit={{ opacity: 0, y: 20 }}
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="mb-2 text-4xl animate-bounce">🏅</div>
        <h2 className="mb-1 text-2xl font-bold text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">
          Challenge Complete!
        </h2>
        <p className="mb-5 text-sm font-medium text-indigo-200/80">
          {missionTitle}
        </p>

        {/* Circular Score Visualizer */}
        <div className="relative mb-6 flex items-center justify-center size-24 rounded-full border-2 border-indigo-500/30 bg-indigo-950/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
          {/* Glow effect */}
          <div className="absolute inset-0 size-full rounded-full bg-gradient-to-tr from-violet-600/10 to-amber-500/10 animate-pulse" />
          
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-violet-500 drop-shadow-sm">
              {pct}%
            </span>
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
              {results.finalScore}/{results.questionCount}
            </span>
          </div>
        </div>

        <div className="mb-5 flex justify-center gap-1.5 text-2xl drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]">
          {starRating(results.finalScore, results.questionCount)}
        </div>

        <p className="mb-6 text-xs text-indigo-300/80">
          Correct: <span className="font-semibold text-emerald-400">{results.finalScore}</span> • Wrong: <span className="font-semibold text-red-400">{wrongCount}</span>
        </p>

        {/* Strong Skills */}
        {strong.length > 0 && (
          <div 
            style={{
              backgroundColor: "oklch(0.45 0.15 145 / 0.1)",
              borderColor: "oklch(0.62 0.19 145 / 0.2)",
              color: "oklch(0.85 0.1 145)",
            }}
            className="mb-4 w-full rounded-2xl border p-4 text-left shadow-[0_0_15px_rgba(34,197,94,0.05)] backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="flex size-5 items-center justify-center rounded-full" style={{ backgroundColor: "oklch(0.62 0.19 145 / 0.2)" }}>
                🔥
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Strong Skills
              </p>
            </div>
            {strong.map((s) => (
              <p className="text-sm font-medium text-indigo-100/90 flex items-center gap-2 pl-1" key={s}>
                <span className="text-emerald-400 font-bold">✓</span> {s}
              </p>
            ))}
          </div>
        )}

        {/* Needs Practice */}
        {weak.length > 0 && (
          <div 
            style={{
              backgroundColor: "oklch(0.45 0.15 55 / 0.1)",
              borderColor: "oklch(0.55 0.18 55 / 0.2)",
              color: "oklch(0.85 0.1 55)",
            }}
            className="mb-6 w-full rounded-2xl border p-4 text-left shadow-[0_0_15px_rgba(245,158,11,0.05)] backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="flex size-5 items-center justify-center rounded-full" style={{ backgroundColor: "oklch(0.55 0.18 55 / 0.2)" }}>
                🧠
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Needs Practice
              </p>
            </div>
            {weak.map((s) => (
              <p className="text-sm font-medium text-indigo-100/90 flex items-center gap-2 pl-1" key={s}>
                <span className="text-amber-400 font-bold">⚠</span> {s}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-stretch gap-3 w-full mt-2">
          {onReview && wrongCount > 0 && (
            <Button
              className="rounded-full border border-indigo-500/20 bg-indigo-950/30 px-6 py-3 text-sm font-bold text-indigo-200 shadow-md backdrop-blur-md hover:bg-indigo-900/40 hover:border-violet-500/30 hover:-translate-y-[1px] active:scale-[0.98] transition-all duration-200"
              onClick={onReview}
              variant="ghost"
            >
              Review Mistakes 🔍
            </Button>
          )}
          <Button
            className="rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-violet-600 hover:from-orange-600 hover:to-violet-700 font-bold text-white shadow-lg shadow-orange-500/20 px-8 py-3 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
            onClick={onContinue}
          >
            Continue Learning 🚀
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
