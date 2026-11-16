"use client";

import {
  CheckCircle2,
  Crown,
  Flame,
  Gamepad2,
  Heart,
  HelpCircle,
  Mic,
  MicOff,
  RefreshCw,
  Sparkles,
  Trophy,
  Volume2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVoiceEngine } from "@/components/voice/use-voice-engine";
import type { BestQuizScoreSummary } from "@/lib/db/queries/quizzes";
import type { ExplanationLens } from "@/lib/db/schema";
import type { PublicGameRound } from "@/lib/quiz/game-generator";
import { cn } from "@/lib/utils";

type TopicProgressSummaryItem = {
  topicSlug: string;
  masteryScore: number;
  questionsAnswered: number;
  questionsCorrect: number;
  lensesTried: ExplanationLens[];
};

type GameReviewItem = {
  index: number;
  difficultyLabel: string;
  promptText: string;
  learnerAnswer: string;
  canonicalAnswer: string;
  isCorrect: boolean;
  workedSolution: string;
};

type RoundFeedback = {
  isCorrect: boolean;
  normalizedAnswer: string;
  canonicalAnswer: string;
  workedSolution: string;
  roundXp: number;
  pendingNextRound?: PublicGameRound;
  nextIndex?: number;
};

type CompletedGameSummary = {
  scorePercent: number;
  correctCount: number;
  totalRounds: number;
  masteryScore: number;
  reviewItems: GameReviewItem[];
};

type TopicGameArenaProps = {
  topicSlug: string;
  speechSpeed: string;
  onClose: () => void;
  onProgressUpdate: (payload: {
    masteryScore: number;
    topicSlug: string;
    totalXp: number;
    currentStreak: number;
    topicProgressList?: TopicProgressSummaryItem[];
    bestQuizScores?: Record<string, BestQuizScoreSummary>;
  }) => void;
};

export function TopicGameArena({
  topicSlug,
  speechSpeed,
  onClose,
  onProgressUpdate,
}: TopicGameArenaProps) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("Maths Quest");
  const [edexcelCode, setEdexcelCode] = useState("1MA1");
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [round, setRound] = useState<PublicGameRound | null>(null);

  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [gameXpEarned, setGameXpEarned] = useState(0);
  const [masteryScore, setMasteryScore] = useState(0);

  const [typedAnswer, setTypedAnswer] = useState("");
  const [hintText, setHintText] = useState<string | null>(null);
  const [clarifyText, setClarifyText] = useState<string | null>(null);
  const [roundFeedback, setRoundFeedback] = useState<RoundFeedback | null>(
    null
  );
  const [completedSummary, setCompletedSummary] =
    useState<CompletedGameSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const roundStartedAtRef = useRef<number>(Date.now());

  const voice = useVoiceEngine({
    speechSpeed,
    autoSpeak: true,
    onTranscript: (spoken) => {
      setTypedAnswer(spoken);
    },
  });

  const speakRef = useRef(voice.speak);
  speakRef.current = voice.speak;

  const launchGame = useCallback(async () => {
    setLoading(true);
    setCompletedSummary(null);
    setRoundFeedback(null);
    setHintText(null);
    setClarifyText(null);
    setTypedAnswer("");
    setHearts(3);
    setCombo(0);
    setGameXpEarned(0);

    try {
      const res = await fetch("/api/chat/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicSlug }),
      });
      if (!res.ok) {
        throw new Error("Could not start game");
      }

      const data = (await res.json()) as {
        attemptId: string;
        topicTitle: string;
        edexcelCode: string;
        startingMastery: number;
        totalRounds: number;
        currentIndex: number;
        round: PublicGameRound;
      };

      setAttemptId(data.attemptId);
      setTopicTitle(data.topicTitle);
      setEdexcelCode(data.edexcelCode);
      setMasteryScore(data.startingMastery);
      setTotalRounds(data.totalRounds);
      setCurrentIndex(data.currentIndex);
      setRound(data.round);
      roundStartedAtRef.current = Date.now();
      await speakRef.current(data.round.spokenPrompt);
    } finally {
      setLoading(false);
    }
  }, [topicSlug]);

  useEffect(() => {
    launchGame();
  }, [launchGame]);

  const submitAnswerValue = async (answerValue: string) => {
    if (!attemptId || !answerValue.trim() || submitting || roundFeedback) {
      return;
    }

    setSubmitting(true);
    setClarifyText(null);
    const elapsedMs = Math.max(0, Date.now() - roundStartedAtRef.current);

    try {
      const res = await fetch("/api/chat/game/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          action: "submit",
          answer: answerValue.trim(),
          comboBefore: combo,
          timeTakenMs: elapsedMs,
        }),
      });

      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as
        | { action: "clarify"; clarificationPrompt: string }
        | {
            action: "next";
            isCorrect: boolean;
            normalizedAnswer: string;
            canonicalAnswer: string;
            workedSolution: string;
            roundXp: number;
            combo: number;
            masteryScore: number;
            totalXp: number;
            currentStreak: number;
            currentIndex: number;
            nextRound: PublicGameRound;
          }
        | {
            action: "completed";
            isCorrect: boolean;
            normalizedAnswer: string;
            canonicalAnswer: string;
            workedSolution: string;
            roundXp: number;
            combo: number;
            masteryScore: number;
            totalXp: number;
            currentStreak: number;
            topicProgressList: TopicProgressSummaryItem[];
            bestQuizScores: Record<string, BestQuizScoreSummary>;
            summary: CompletedGameSummary;
          };

      if (data.action === "clarify") {
        setClarifyText(data.clarificationPrompt);
        await voice.speak(data.clarificationPrompt);
        return;
      }

      setCombo(data.combo);
      setGameXpEarned((prev) => prev + data.roundXp);
      setMasteryScore(data.masteryScore);

      if (!data.isCorrect) {
        setHearts((h) => Math.max(0, h - 1));
      } else if (data.combo >= 2) {
        setHearts((h) => Math.min(3, h + 1));
      }

      if (data.action === "next") {
        onProgressUpdate({
          topicSlug,
          masteryScore: data.masteryScore,
          totalXp: data.totalXp,
          currentStreak: data.currentStreak,
        });

        setRoundFeedback({
          isCorrect: data.isCorrect,
          normalizedAnswer: data.normalizedAnswer,
          canonicalAnswer: data.canonicalAnswer,
          workedSolution: data.workedSolution,
          roundXp: data.roundXp,
          pendingNextRound: data.nextRound,
          nextIndex: data.currentIndex,
        });
        return;
      }

      onProgressUpdate({
        topicSlug,
        masteryScore: data.masteryScore,
        totalXp: data.totalXp,
        currentStreak: data.currentStreak,
        topicProgressList: data.topicProgressList,
        bestQuizScores: data.bestQuizScores,
      });
      setCompletedSummary(data.summary);
      await voice.speak(
        `Quest complete! You scored ${data.summary.scorePercent} percent and pushed your ${topicTitle} mastery to ${data.masteryScore} percent!`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestHint = async () => {
    if (!attemptId || submitting || roundFeedback) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/chat/game/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, action: "hint" }),
      });
      if (res.ok) {
        const data = (await res.json()) as { hintSpoken: string };
        setHintText(data.hintSpoken);
        await voice.speak(data.hintSpoken);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextRound = async () => {
    if (!roundFeedback?.pendingNextRound) {
      return;
    }
    const nextR = roundFeedback.pendingNextRound;
    setCurrentIndex(roundFeedback.nextIndex ?? currentIndex + 1);
    setRound(nextR);
    setRoundFeedback(null);
    setTypedAnswer("");
    setHintText(null);
    setClarifyText(null);
    roundStartedAtRef.current = Date.now();
    await voice.speak(nextR.spokenPrompt);
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-emerald-400/40 bg-slate-950/90 p-8 text-center shadow-xl">
        <RefreshCw className="mx-auto size-7 animate-spin text-emerald-400" />
        <p className="mt-3 font-bold text-sm text-white">
          Building your 5-Round Maths Quest...
        </p>
      </section>
    );
  }

  if (completedSummary) {
    return (
      <section className="space-y-5 rounded-2xl border border-emerald-400/40 bg-slate-950/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-white/10 border-b pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 font-bold text-amber-200 text-xs">
              <Trophy className="size-4 text-amber-400" />
              Quest Complete · +{gameXpEarned} XP Earned!
            </div>
            <h3 className="font-extrabold text-white text-xl">
              {topicTitle}: {completedSummary.scorePercent}% (
              {completedSummary.correctCount}/{completedSummary.totalRounds})
            </h3>
            <p className="text-emerald-300 text-xs">
              Topic Mastery is now{" "}
              <strong>{completedSummary.masteryScore}%</strong> — saved to your
              progress profile!
            </p>
          </div>

          <button
            className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
            onClick={onClose}
            title="Close Game Arena"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2">
          {completedSummary.reviewItems.map((item) => (
            <div
              className={cn(
                "rounded-xl border p-3 text-xs",
                item.isCorrect
                  ? "border-emerald-400/25 bg-emerald-500/[0.07]"
                  : "border-rose-400/25 bg-rose-500/[0.07]"
              )}
              key={item.index}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-white">
                  {item.difficultyLabel}: {item.promptText}
                </span>
                {item.isCorrect ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="size-4 shrink-0 text-rose-400" />
                )}
              </div>
              <div className="mt-1 text-slate-300">
                You: <strong>{item.learnerAnswer}</strong> · Answer:{" "}
                <strong className="text-emerald-300">
                  {item.canonicalAnswer}
                </strong>
              </div>
              <div className="mt-0.5 text-slate-400">{item.workedSolution}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 font-bold text-white text-xs shadow-md transition hover:brightness-110"
            onClick={launchGame}
            type="button"
          >
            <RefreshCw className="size-4" />
            Play Again (Fresh Numbers)
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-semibold text-slate-200 text-xs transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            Back to Chat
          </button>
        </div>
      </section>
    );
  }

  const isBoss = round?.roundType === "boss_solve";

  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border p-5 shadow-xl",
        isBoss
          ? "border-amber-400/50 bg-gradient-to-br from-slate-950 via-amber-950/20 to-slate-950"
          : "border-emerald-400/40 bg-slate-950/90"
      )}
    >
      {/* Arcade HUD: Topic, Hearts, Combo Multiplier, Live XP & Mastery */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-white/10 border-b pb-3.5">
        <div className="flex items-center gap-2">
          <Gamepad2 className="size-5 text-emerald-400" />
          <div>
            <div className="font-bold text-sm text-white">
              {topicTitle}{" "}
              <span className="font-mono text-slate-400 text-xs">
                ({edexcelCode})
              </span>
            </div>
            <div className="text-[11px] text-emerald-300">
              Mastery: <strong>{masteryScore}%</strong> · Round{" "}
              {currentIndex + 1} of {totalRounds}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* 3 Hearts */}
          <div className="flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1">
            {[0, 1, 2].map((idx) => (
              <Heart
                className={cn(
                  "size-3.5 transition",
                  idx < hearts
                    ? "fill-rose-500 text-rose-500"
                    : "text-slate-600"
                )}
                key={idx}
              />
            ))}
          </div>

          {/* Combo Streak */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-bold",
              combo >= 2
                ? "border-orange-400/50 bg-orange-500/20 text-orange-100"
                : "border-white/10 bg-white/5 text-slate-300"
            )}
          >
            <Flame className="size-3.5 text-orange-400" />x
            {Math.min(4, Math.max(1, combo))} Combo
          </span>

          {/* Session XP */}
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 font-bold font-mono text-amber-200">
            <Zap className="size-3.5 text-amber-400" />+{gameXpEarned} XP
          </span>

          <button
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white"
            onClick={onClose}
            title="Exit game"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {round ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-bold text-xs",
                isBoss
                  ? "border-amber-400/50 bg-amber-500/20 text-amber-100"
                  : "border-violet-400/35 bg-violet-500/15 text-violet-200"
              )}
            >
              {isBoss ? (
                <Crown className="size-3.5 text-amber-400" />
              ) : (
                <Sparkles className="size-3.5 text-violet-300" />
              )}
              {round.difficultyLabel}
            </span>

            <button
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-slate-200 text-xs hover:bg-white/10"
              onClick={() => voice.speak(round.spokenPrompt, true)}
              type="button"
            >
              <Volume2 className="size-3.5 text-orange-400" />
              Read Aloud
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-semibold text-base text-white leading-relaxed">
              {round.promptText}
            </p>

            {round.workingLines && round.workingLines.length > 0 ? (
              <div className="mt-3 space-y-1.5 rounded-xl border border-emerald-400/25 bg-slate-950/80 p-3 font-mono text-emerald-200 text-xs">
                {round.workingLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            ) : null}
          </div>

          {hintText ? (
            <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-amber-100 text-xs">
              <strong>Hint Shield:</strong> {hintText}
            </div>
          ) : null}

          {clarifyText ? (
            <div className="rounded-xl border border-violet-400/35 bg-violet-500/10 p-3 text-violet-100 text-xs">
              <strong>Clarification:</strong> {clarifyText}
            </div>
          ) : null}

          {roundFeedback ? (
            <div
              className={cn(
                "space-y-3 rounded-xl border p-4",
                roundFeedback.isCorrect
                  ? "border-emerald-400/40 bg-emerald-500/15"
                  : "border-amber-400/40 bg-amber-500/15"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-bold text-sm text-white">
                  {roundFeedback.isCorrect ? (
                    <>
                      <CheckCircle2 className="size-5 text-emerald-400" />
                      Spot on! +{roundFeedback.roundXp} XP
                    </>
                  ) : (
                    <>
                      <XCircle className="size-5 text-amber-400" />
                      Answer: {roundFeedback.canonicalAnswer} (+
                      {roundFeedback.roundXp} XP effort)
                    </>
                  )}
                </span>
              </div>
              <p className="text-slate-200 text-xs">
                <strong>Working:</strong> {roundFeedback.workedSolution}
              </p>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 font-bold text-slate-950 text-xs transition hover:bg-slate-200"
                onClick={handleNextRound}
                type="button"
              >
                Next Round →
              </button>
            </div>
          ) : round.choices && round.choices.length > 0 ? (
            <div className="space-y-3">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {round.choices.map((choice) => (
                  <button
                    className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-left font-mono font-semibold text-sm text-white transition hover:border-emerald-400/60 hover:bg-emerald-500/15 disabled:opacity-50"
                    disabled={submitting}
                    key={choice}
                    onClick={() => submitAnswerValue(choice)}
                    type="button"
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 font-medium text-amber-200 text-xs hover:bg-amber-500/20 disabled:opacity-50"
                disabled={submitting || Boolean(hintText)}
                onClick={handleRequestHint}
                type="button"
              >
                <HelpCircle className="size-3.5 text-amber-400" />
                Use Hint Shield
              </button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-2.5 sm:flex-row sm:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                submitAnswerValue(typedAnswer);
              }}
            >
              <input
                autoComplete="off"
                className="flex-1 rounded-xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                disabled={submitting}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder="Work it out & type or speak your answer..."
                value={typedAnswer}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-3 font-semibold text-xs transition",
                    voice.voiceState === "listening"
                      ? "border-rose-400 bg-rose-500/25 text-rose-100"
                      : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                  )}
                  onClick={
                    voice.voiceState === "listening"
                      ? voice.stopListening
                      : voice.startListening
                  }
                  type="button"
                >
                  {voice.voiceState === "listening" ? (
                    <>
                      <MicOff className="size-4 text-rose-400" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="size-4 text-orange-400" />
                      Speak
                    </>
                  )}
                </button>

                <button
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 font-medium text-amber-200 text-xs hover:bg-amber-500/20 disabled:opacity-50"
                  disabled={submitting || Boolean(hintText)}
                  onClick={handleRequestHint}
                  type="button"
                >
                  <HelpCircle className="size-4 text-amber-400" />
                  Hint
                </button>

                <button
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 font-bold text-sm text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
                  disabled={submitting || !typedAnswer.trim()}
                  type="submit"
                >
                  {submitting ? "Checking..." : "Check"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
