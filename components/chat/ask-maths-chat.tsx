"use client";

import {
  ArrowLeft,
  Award,
  BookOpen,
  Flame,
  Gamepad2,
  MessageSquarePlus,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  Volume2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TopicGameArena } from "@/components/chat/topic-game-arena";
import { TopNavBar } from "@/components/ranedeer/top-nav-bar";
import { useVoiceEngine } from "@/components/voice/use-voice-engine";
import { KatexMath } from "@/components/whiteboard/katex-math";
import { EDEXCEL_TOPICS, getTopicBySlug } from "@/lib/curriculum/edexcel-1ma1";
import type { BestQuizScoreSummary } from "@/lib/db/queries/quizzes";
import type {
  EdexcelTier,
  ExplanationLens,
  StoredTutorTurn,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type TopicProgressSummaryItem = {
  topicSlug: string;
  masteryScore: number;
  questionsAnswered: number;
  questionsCorrect: number;
  lensesTried: ExplanationLens[];
};

const STARTER_QUESTIONS = [
  "How do I work out £1,200 invested at 5% compound interest for 3 years?",
  "Explain how to divide 3/4 by 2/5 step by step",
  "In a 20% off sale a coat costs £64 — what was the original price?",
  "Share £140 in the ratio 2 : 5",
  "Solve 4x − 7 = 21 and show the working",
  "Find the nth term of 5, 9, 13, 17",
] as const;

type AskMathsChatProps = {
  initialLearner: {
    nickname: string;
    tier: EdexcelTier;
    targetGrade: number;
    speechSpeed: string;
    currentStreak: number;
    totalXp: number;
    reminderEnabled: boolean;
  };
  initialTurns: StoredTutorTurn[];
  initialProgressList: TopicProgressSummaryItem[];
  initialBestQuizScores: Record<string, BestQuizScoreSummary>;
  initialQuery?: string;
};

export function AskMathsChat({
  initialLearner,
  initialTurns,
  initialProgressList,
  initialBestQuizScores,
  initialQuery,
}: AskMathsChatProps) {
  const [turns, setTurns] = useState<StoredTutorTurn[]>(initialTurns);
  const [progressList, setProgressList] =
    useState<TopicProgressSummaryItem[]>(initialProgressList);
  const [bestScores, setBestScores] = useState<
    Record<string, BestQuizScoreSummary>
  >(initialBestQuizScores);
  const [streak, setStreak] = useState(initialLearner.currentStreak);
  const [totalXp, setTotalXp] = useState(initialLearner.totalXp);

  const [questionInput, setQuestionInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [activeGameTopicSlug, setActiveGameTopicSlug] = useState<string | null>(
    null
  );

  const autoAskedRef = useRef(false);
  const askQuestionRef = useRef<
    (params: {
      question: string;
      explicitTopicSlug?: string;
      alternateLens?: boolean;
    }) => Promise<void>
  >(async () => undefined);

  const voice = useVoiceEngine({
    speechSpeed: initialLearner.speechSpeed,
    autoSpeak: true,
    onTranscript: (spoken) => {
      askQuestionRef.current({ question: spoken });
    },
  });

  const speakRef = useRef(voice.speak);
  speakRef.current = voice.speak;

  const submitQuestion = useCallback(
    async ({
      question,
      explicitTopicSlug,
      alternateLens,
    }: {
      question: string;
      explicitTopicSlug?: string;
      alternateLens?: boolean;
    }) => {
      const trimmed = question.trim();
      if (!trimmed || isAsking) {
        return;
      }

      setIsAsking(true);
      setQuestionInput("");

      const optimisticId = `temp-${Date.now()}`;
      setTurns((prev) => [
        ...prev,
        {
          id: optimisticId,
          role: "learner",
          text: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const res = await fetch("/api/chat/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            explicitTopicSlug,
            alternateLens,
          }),
        });

        if (!res.ok) {
          throw new Error("Could not answer question");
        }

        const data = (await res.json()) as {
          studentTurn: StoredTutorTurn;
          tutorTurn: StoredTutorTurn;
          topicProgressList: TopicProgressSummaryItem[];
          learnerStats: { currentStreak: number; totalXp: number };
        };

        setTurns((prev) => [
          ...prev.filter((t) => t.id !== optimisticId),
          data.studentTurn,
          data.tutorTurn,
        ]);
        setProgressList(data.topicProgressList);
        setStreak(data.learnerStats.currentStreak);
        setTotalXp(data.learnerStats.totalXp);

        if (data.tutorTurn.spokenText) {
          await speakRef.current(data.tutorTurn.spokenText);
        }
      } catch {
        setTurns((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "tutor",
            text: "Sorry, I hit a quick connection snag. Please try asking your question again!",
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsAsking(false);
      }
    },
    [isAsking]
  );

  askQuestionRef.current = submitQuestion;

  useEffect(() => {
    if (initialQuery && !autoAskedRef.current) {
      autoAskedRef.current = true;
      submitQuestion({ question: initialQuery });
    }
  }, [initialQuery, submitQuestion]);

  const handleClearChat = async () => {
    await fetch("/api/chat/ask", { method: "DELETE" });
    setTurns([]);
    setActiveGameTopicSlug(null);
  };

  const masteryBySlug = new Map(
    progressList.map((p) => [p.topicSlug, p.masteryScore])
  );

  return (
    <div className="min-h-screen pb-28">
      <TopNavBar
        currentStreak={streak}
        nickname={initialLearner.nickname}
        reminderEnabled={initialLearner.reminderEnabled}
        targetGrade={initialLearner.targetGrade}
        tier={initialLearner.tier}
        totalXp={totalXp}
      />

      <main className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 lg:grid-cols-12">
        {/* Left / Main Chat + Working Game Column */}
        <div className="flex flex-col gap-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                className="inline-flex items-center gap-1.5 text-slate-400 text-xs hover:text-orange-300"
                href="/"
              >
                <ArrowLeft className="size-3.5" />
                Back to Topics
              </Link>
              <h1 className="mt-1 font-extrabold text-2xl text-white sm:text-3xl">
                Ask &amp; Play Maths Chat
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                Ask any GCSE Maths question — I&apos;ll spot the Edexcel topic,
                explain the worked answer step-by-step, and build a 5-round game
                so you master it!
              </p>
            </div>

            {turns.length > 0 ? (
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-medium text-slate-300 text-xs transition hover:bg-white/10 hover:text-white"
                onClick={handleClearChat}
                type="button"
              >
                <Trash2 className="size-3.5" />
                New Chat
              </button>
            ) : null}
          </div>

          {/* Inline Active Game Arena */}
          {activeGameTopicSlug ? (
            <TopicGameArena
              onClose={() => setActiveGameTopicSlug(null)}
              onProgressUpdate={(payload) => {
                setTotalXp(payload.totalXp);
                setStreak(payload.currentStreak);
                if (payload.topicProgressList) {
                  setProgressList(payload.topicProgressList);
                } else {
                  setProgressList((prev) => {
                    const exists = prev.some(
                      (p) => p.topicSlug === payload.topicSlug
                    );
                    if (exists) {
                      return prev.map((p) =>
                        p.topicSlug === payload.topicSlug
                          ? { ...p, masteryScore: payload.masteryScore }
                          : p
                      );
                    }
                    return [
                      {
                        topicSlug: payload.topicSlug,
                        masteryScore: payload.masteryScore,
                        questionsAnswered: 1,
                        questionsCorrect: 1,
                        lensesTried: ["exam"],
                      },
                      ...prev,
                    ];
                  });
                }
                if (payload.bestQuizScores) {
                  setBestScores(payload.bestQuizScores);
                }
              }}
              speechSpeed={initialLearner.speechSpeed}
              topicSlug={activeGameTopicSlug}
            />
          ) : null}

          {/* Starter Prompts when Chat is Empty */}
          {turns.length === 0 && !activeGameTopicSlug ? (
            <section className="glass-panel space-y-4 rounded-2xl p-5">
              <div className="flex items-center gap-2 font-bold text-orange-200 text-sm">
                <MessageSquarePlus className="size-4 text-orange-400" />
                Try asking a maths question (or tap one below):
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {STARTER_QUESTIONS.map((sample) => (
                  <button
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left text-slate-200 text-xs transition hover:border-orange-400/50 hover:bg-orange-500/10"
                    disabled={isAsking}
                    key={sample}
                    onClick={() => submitQuestion({ question: sample })}
                    type="button"
                  >
                    &ldquo;{sample}&rdquo;
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {/* Conversation Stream */}
          <div className="space-y-4">
            {turns.map((turn, idx) => {
              if (turn.role === "learner") {
                return (
                  <div className="flex justify-end" key={turn.id}>
                    <div className="max-w-xl rounded-2xl border border-violet-400/35 bg-violet-600/25 px-4 py-3 text-sm text-white">
                      {turn.text}
                    </div>
                  </div>
                );
              }

              const topicSlug = turn.detectedTopicSlug;
              const topicMastery = topicSlug
                ? (masteryBySlug.get(topicSlug) ?? 10)
                : null;
              const prevStudentQuestion =
                idx > 0 && turns[idx - 1]?.role === "learner"
                  ? turns[idx - 1]?.text
                  : "";

              return (
                <article
                  className="glass-panel space-y-4 rounded-2xl p-5"
                  key={turn.id}
                >
                  {/* Detected Topic Banner */}
                  {topicSlug && turn.detectedTopicTitle ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-white/10 border-b pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 font-bold text-orange-200 text-xs">
                          <Sparkles className="size-3.5 text-orange-400" />
                          Topic: {turn.detectedTopicTitle}
                        </span>
                        {turn.detectedEdexcelCode ? (
                          <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                            Edexcel {turn.detectedEdexcelCode}
                          </span>
                        ) : null}
                        {topicMastery !== null ? (
                          <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-[11px] text-emerald-200">
                            Mastery: {topicMastery}%
                          </span>
                        ) : null}
                      </div>

                      <Link
                        className="inline-flex items-center gap-1 text-slate-300 text-xs hover:text-orange-300"
                        href={`/learn/${topicSlug}`}
                      >
                        <BookOpen className="size-3.5" />
                        Full 5-Lens Tutorial →
                      </Link>
                    </div>
                  ) : null}

                  {/* Clear Written Explanation */}
                  <p className="text-slate-100 text-sm leading-relaxed">
                    {turn.text}
                  </p>

                  {/* Worked Step-by-Step KaTeX Board */}
                  {turn.boardSteps && turn.boardSteps.length > 0 ? (
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/75 p-4">
                      <div className="font-bold text-slate-300 text-xs uppercase tracking-wide">
                        Step-by-Step Working
                      </div>
                      {turn.boardSteps.map((step, stepIdx) => (
                        <div
                          className="flex flex-col justify-between gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 sm:flex-row sm:items-center"
                          key={`${turn.id}-step-${String(stepIdx)}`}
                        >
                          <div>
                            <div className="font-semibold text-white text-xs sm:text-sm">
                              {step.label}
                            </div>
                            {step.note ? (
                              <div className="text-[11px] text-slate-400">
                                {step.note}
                              </div>
                            ) : null}
                          </div>
                          <div className="overflow-x-auto text-sm text-white">
                            <KatexMath latex={step.latex} />
                          </div>
                        </div>
                      ))}

                      {turn.examTip ? (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-amber-100 text-xs">
                          <Award className="mt-0.5 size-4 shrink-0 text-amber-400" />
                          <span>
                            <strong>Exam Tip:</strong> {turn.examTip}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Action Strip: Play 5-Round Game + Explain Another Way + Read Aloud */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {topicSlug ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 font-bold text-white text-xs shadow-md transition hover:brightness-110"
                        onClick={() => {
                          voice.stopSpeaking();
                          setActiveGameTopicSlug(topicSlug);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        type="button"
                      >
                        <Gamepad2 className="size-4" />
                        Play 5-Round Game on {turn.detectedTopicTitle}
                      </button>
                    ) : null}

                    {prevStudentQuestion && topicSlug ? (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-semibold text-slate-200 text-xs transition hover:bg-white/10 disabled:opacity-50"
                        disabled={isAsking}
                        onClick={() =>
                          submitQuestion({
                            question: prevStudentQuestion,
                            explicitTopicSlug: topicSlug,
                            alternateLens: true,
                          })
                        }
                        type="button"
                      >
                        <RefreshCw className="size-3.5 text-violet-400" />
                        Explain Another Way
                      </button>
                    ) : null}

                    {turn.spokenText ? (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-medium text-slate-200 text-xs transition hover:bg-white/10"
                        onClick={() =>
                          voice.speak(turn.spokenText ?? turn.text, true)
                        }
                        type="button"
                      >
                        <Volume2 className="size-3.5 text-orange-400" />
                        Read Aloud
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {isAsking ? (
              <div className="glass-panel flex items-center gap-3 rounded-2xl p-4 text-slate-300 text-xs">
                <RefreshCw className="size-4 animate-spin text-orange-400" />
                <span>
                  Working out the Edexcel topic and building your step-by-step
                  explanation...
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Live Progress & Topic Mastery Tracker */}
        <aside className="space-y-4 lg:col-span-4">
          <section className="glass-panel space-y-4 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-base text-white">
                <Trophy className="size-4 text-amber-400" />
                Your Mastery Progress
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-0.5 font-bold font-mono text-amber-200 text-xs">
                <Zap className="size-3 text-amber-400" />
                {totalXp} XP
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-slate-400">Daily Streak</div>
                <div className="mt-1 flex items-center gap-1 font-extrabold text-lg text-orange-300">
                  <Flame className="size-4 text-orange-400" />
                  {streak} day{streak === 1 ? "" : "s"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-slate-400">Topics Started</div>
                <div className="mt-1 font-extrabold text-emerald-300 text-lg">
                  {progressList.length} / {EDEXCEL_TOPICS.length}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="font-semibold text-slate-300 text-xs">
                Practiced Topics (Tap Play to Level Up)
              </div>

              {progressList.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-slate-400 text-xs">
                  Ask your first maths question on the left — every topic you
                  ask about and play games on is tracked automatically here!
                </p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {progressList.map((prog) => {
                    const meta = getTopicBySlug(prog.topicSlug);
                    if (!meta) {
                      return null;
                    }
                    const best = bestScores[prog.topicSlug];
                    return (
                      <div
                        className="space-y-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs"
                        key={prog.topicSlug}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white">
                            {meta.title}
                          </span>
                          <span className="font-bold text-emerald-300">
                            {prog.masteryScore}%
                          </span>
                        </div>

                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all"
                            style={{
                              width: `${Math.max(6, prog.masteryScore)}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {best
                              ? `Best Game: ${best.bestScorePercent}%`
                              : `${prog.questionsCorrect}/${prog.questionsAnswered} Qs right`}
                          </span>
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-200 transition hover:bg-emerald-500/25"
                            onClick={() => {
                              voice.stopSpeaking();
                              setActiveGameTopicSlug(prog.topicSlug);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            type="button"
                          >
                            <Gamepad2 className="size-3" />
                            Play Game
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>

      {/* Sticky Bottom Question Input + Voice Mic Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-white/10 border-t bg-slate-950/90 backdrop-blur-xl">
        <form
          className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            submitQuestion({ question: questionInput });
          }}
        >
          <button
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-3 font-semibold text-xs transition",
              voice.voiceState === "listening"
                ? "border-rose-400 bg-rose-500/25 text-rose-100"
                : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
            )}
            onClick={
              voice.voiceState === "listening"
                ? voice.stopListening
                : voice.startListening
            }
            title="Ask by voice"
            type="button"
          >
            {voice.voiceState === "listening" ? (
              <>
                <MicOff className="size-4 text-rose-400" />
                <span className="hidden sm:inline">Stop Mic</span>
              </>
            ) : (
              <>
                <Mic className="size-4 text-orange-400" />
                <span className="hidden sm:inline">Voice Ask</span>
              </>
            )}
          </button>

          <label className="sr-only" htmlFor="ask-maths-input">
            Ask any GCSE Maths question
          </label>
          <input
            className="flex-1 rounded-xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none"
            disabled={isAsking}
            id="ask-maths-input"
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ask any maths question (e.g. 'How do I solve 3x + 5 = 20?' or 'Explain histograms')..."
            value={questionInput}
          />

          <button
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 px-4 py-3 font-bold text-sm text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
            disabled={isAsking || !questionInput.trim()}
            type="submit"
          >
            <Send className="size-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
