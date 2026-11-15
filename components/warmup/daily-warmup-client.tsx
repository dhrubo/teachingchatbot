"use client";

import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bell,
  CheckCircle2,
  Flame,
  HelpCircle,
  Trophy,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { TopNavBar } from "@/components/ranedeer/top-nav-bar";
import { useVoiceEngine } from "@/components/voice/use-voice-engine";
import { VoiceOrbBar } from "@/components/voice/voice-orb-bar";
import { LiveMathsBoard } from "@/components/whiteboard/live-maths-board";
import type { TutorTurnResponse } from "@/lib/ai/ranedeer-engine";
import type { EdexcelTopic, TestChallenge } from "@/lib/curriculum/types";
import type { EdexcelTier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export type WarmupCardItem = {
  topicSlug: string;
  edexcelCode: string;
  topicTitle: string;
  stageKey: "test:0" | "test:1";
  challenge: TestChallenge;
};

type DailyWarmupClientProps = {
  learner: {
    nickname: string;
    tier: EdexcelTier;
    targetGrade: number;
    speechSpeed: string;
    currentStreak: number;
    streakFreezes: number;
    totalXp: number;
    reminderEnabled: boolean;
  };
  cards: WarmupCardItem[];
};

export function DailyWarmupClient({ learner, cards }: DailyWarmupClientProps) {
  const [idx, setIdx] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [streak, setStreak] = useState(learner.currentStreak);
  const [freezes, setFreezes] = useState(learner.streakFreezes);
  const [totalXp, setTotalXp] = useState(learner.totalXp);
  const [isBusy, setIsBusy] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [cardResolved, setCardResolved] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  const activeCard = cards[idx];
  const isFinished = idx >= cards.length;

  const submitAnswerRef = useRef<(answer: string) => Promise<void>>(
    async () => undefined
  );

  const voice = useVoiceEngine({
    speechSpeed: learner.speechSpeed,
    autoSpeak: true,
    onTranscript: (spoken) => {
      submitAnswerRef.current(spoken);
    },
  });

  const submitAnswer = useCallback(
    async (rawAnswer: string) => {
      if (!activeCard || isBusy || cardResolved) {
        return;
      }
      setIsBusy(true);

      try {
        const res = await fetch("/api/tutor/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicSlug: activeCard.topicSlug,
            action: "submit_answer",
            stage: activeCard.stageKey,
            learnerMessage: rawAnswer,
          }),
        });

        if (!res.ok) {
          throw new Error("Warmup grading request failed");
        }

        const data = (await res.json()) as {
          turn: TutorTurnResponse;
          streak: {
            currentStreak: number;
            streakFreezes: number;
            totalXp: number;
          };
        };

        setStreak(data.streak.currentStreak);
        setFreezes(data.streak.streakFreezes);
        setTotalXp(data.streak.totalXp);

        const earned = data.turn.answerFeedback?.xpAwarded ?? 5;
        setSessionXp((prev) => prev + earned);

        const isCorrect = Boolean(data.turn.answerFeedback?.isCorrect);
        setFeedback({
          correct: isCorrect,
          message: isCorrect
            ? `Spot on! +${earned} XP — ${activeCard.challenge.workedSolutionSpoken}`
            : data.turn.displayText,
        });

        if (isCorrect) {
          setCardResolved(true);
          setCompletedCount((c) => c + 1);
          await voice.speak(
            `Spot on! ${activeCard.challenge.workedSolutionSpoken}`
          );
        } else {
          setShowHint(true);
          await voice.speak(data.turn.spokenText);
        }
      } catch {
        setFeedback({
          correct: false,
          message:
            "Network hiccup checking your answer — please try once more.",
        });
      } finally {
        setIsBusy(false);
      }
    },
    [activeCard, cardResolved, isBusy, voice]
  );

  submitAnswerRef.current = submitAnswer;

  const advanceToNext = () => {
    voice.stopSpeaking();
    setFeedback(null);
    setShowHint(false);
    setCardResolved(false);
    setIdx((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen pb-36">
      <TopNavBar
        currentStreak={streak}
        nickname={learner.nickname}
        reminderEnabled={learner.reminderEnabled}
        streakFreezes={freezes}
        targetGrade={learner.targetGrade}
        tier={learner.tier}
        totalXp={totalXp}
      />

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pt-6">
        <div className="flex items-center justify-between">
          <Link
            className="inline-flex items-center gap-1.5 text-slate-400 text-xs hover:text-orange-300"
            href="/"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-orange-500/15 px-3 py-1 font-semibold text-orange-200 text-xs">
            <Flame className="size-3.5 text-orange-400" />
            5-Minute Daily Voice Warmup
          </div>
        </div>

        {/* 3-Step Duolingo Progress Bar */}
        <div className="grid grid-cols-3 gap-2">
          {cards.map((card, i) => (
            <div
              className={cn(
                "h-2.5 rounded-full transition-all",
                i < idx || (i === idx && cardResolved)
                  ? "bg-gradient-to-r from-orange-500 to-emerald-400"
                  : i === idx
                    ? "bg-violet-500/60"
                    : "bg-white/10"
              )}
              key={card.topicSlug}
            />
          ))}
        </div>

        {isFinished || !activeCard ? (
          <section className="glass-panel flex flex-col items-center gap-5 rounded-3xl p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-emerald-500 text-white shadow-xl">
              <Trophy className="size-8" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-extrabold text-2xl text-white">
                Daily Warmup Complete!
              </h1>
              <p className="text-slate-300 text-sm">
                Great consistency, {learner.nickname}! You earned{" "}
                <strong className="text-amber-300">+{sessionXp} XP</strong>,
                answered {completedCount}/{cards.length} review checks, and kept
                your{" "}
                <strong className="text-orange-300">{streak}-day streak</strong>{" "}
                alive.
              </p>
            </div>

            <div className="grid w-full max-w-lg gap-2.5 text-left">
              {cards.map((c) => (
                <Link
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs transition hover:border-orange-400/40"
                  href={`/learn/${c.topicSlug}`}
                  key={c.topicSlug}
                >
                  <div>
                    <span className="font-mono text-violet-300">
                      {c.edexcelCode}
                    </span>{" "}
                    <strong className="text-white">{c.topicTitle}</strong>
                  </div>
                  <span className="font-semibold text-orange-300">
                    Explore 5 Lenses →
                  </span>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-violet-600 px-5 py-3 font-bold text-sm text-white"
                href="/"
              >
                Return to Edexcel Map
              </Link>
              {learner.reminderEnabled ? null : (
                <Link
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 font-semibold text-emerald-200 text-sm"
                  href="/settings"
                >
                  <Bell className="size-4" />
                  Turn On Tomorrow&apos;s Reminder
                </Link>
              )}
            </div>
          </section>
        ) : (
          <section className="glass-panel flex flex-col gap-5 rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono text-violet-300 text-xs">
                  Warmup {idx + 1} of {cards.length} · Edexcel 1MA1{" "}
                  {activeCard.edexcelCode}
                </span>
                <h1 className="font-bold text-lg text-white sm:text-xl">
                  {activeCard.topicTitle} ({activeCard.challenge.label})
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-medium text-slate-200 text-xs hover:bg-white/10"
                  onClick={() =>
                    voice.speak(activeCard.challenge.spokenQuestion, true)
                  }
                  type="button"
                >
                  <Volume2 className="size-3.5 text-orange-400" />
                  Read Aloud
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 font-medium text-amber-200 text-xs hover:bg-amber-500/20"
                  onClick={() => {
                    setShowHint(true);
                    voice.speak(activeCard.challenge.hintSpoken, true);
                  }}
                  type="button"
                >
                  <HelpCircle className="size-3.5 text-amber-400" />
                  Hint
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-5">
              <p className="font-semibold text-base text-white leading-relaxed sm:text-lg">
                {activeCard.challenge.questionText}
              </p>
            </div>

            {showHint && !cardResolved ? (
              <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3.5 text-amber-100 text-xs">
                <strong className="text-amber-300">Hint: </strong>
                {activeCard.challenge.hintSpoken}
              </div>
            ) : null}

            {feedback ? (
              <div
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border p-4 text-sm",
                  feedback.correct
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                    : "border-amber-400/40 bg-amber-500/15 text-amber-100"
                )}
              >
                {feedback.correct ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
                ) : (
                  <Award className="mt-0.5 size-5 shrink-0 text-amber-400" />
                )}
                <div className="space-y-1">
                  <p>{feedback.message}</p>
                </div>
              </div>
            ) : null}

            {cardResolved ? (
              <div className="space-y-4">
                <LiveMathsBoard
                  board={activeCard.challenge.workedSolutionBoard}
                  edexcelCode={activeCard.edexcelCode}
                />
                <div className="flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-emerald-500 px-5 py-3 font-bold text-sm text-white shadow-lg"
                    onClick={advanceToNext}
                    type="button"
                  >
                    {idx + 1 < cards.length
                      ? "Next Warmup Question"
                      : "Finish Daily Warmup"}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>
                  Speak your answer into the mic below, or type it in the box.
                </span>
                <button
                  className="text-slate-400 underline hover:text-slate-200"
                  onClick={() => {
                    setCardResolved(true);
                    setFeedback({
                      correct: false,
                      message: `Worked Solution: ${activeCard.challenge.workedSolutionSpoken}`,
                    });
                    voice.speak(activeCard.challenge.workedSolutionSpoken);
                  }}
                  type="button"
                >
                  Show worked solution
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {!isFinished && activeCard && !cardResolved ? (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-4xl px-4 pb-4">
          <VoiceOrbBar
            canReplay={true}
            isBusy={isBusy}
            muted={voice.muted}
            onReplaySpeech={() =>
              voice.speak(activeCard.challenge.spokenQuestion, true)
            }
            onStartListening={voice.startListening}
            onStopListening={voice.stopListening}
            onStopSpeech={voice.stopSpeaking}
            onSubmitText={submitAnswer}
            onToggleMute={() => voice.setMuted((m) => !m)}
            placeholder="Say or type your answer (e.g. '19/20', '£1157.63', '6')..."
            voiceError={voice.voiceError}
            voiceState={voice.voiceState}
            volumeLevel={voice.volumeLevel}
          />
        </div>
      ) : null}
    </div>
  );
}

export function buildWarmupCardsFromTopics(
  topics: readonly EdexcelTopic[],
  masteryMap: ReadonlyMap<string, number>
): WarmupCardItem[] {
  return topics.map((topic) => {
    const score = masteryMap.get(topic.slug) ?? 0;
    const useLevelSix = score >= 55 && topic.testQuestions.length > 1;
    const challenge = useLevelSix
      ? topic.testQuestions[1]
      : topic.testQuestions[0];

    return {
      topicSlug: topic.slug,
      edexcelCode: topic.edexcelCode,
      topicTitle: topic.title,
      stageKey: useLevelSix ? "test:1" : "test:0",
      challenge,
    };
  });
}
