"use client";

import {
  AlertTriangle,
  Award,
  Calculator,
  CheckCircle2,
  HelpCircle,
  Lock,
  Mic,
  MicOff,
  RefreshCw,
  ShieldCheck,
  Volume2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVoiceEngine } from "@/components/voice/use-voice-engine";
import type { PublicQuizQuestion } from "@/lib/quiz/procedural-generator";
import { cn } from "@/lib/utils";

type QuizReviewItem = {
  index: number;
  difficultyLabel: string;
  promptText: string;
  learnerAnswer: string;
  canonicalAnswer: string;
  isCorrect: boolean;
  workedSolution: string;
};

type CompletedSummary = {
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  currentStreak: number;
  integrityFlags: string[];
  tabSwitchCount: number;
  pasteCount: number;
  rapidGuessCount: number;
  hintsUsed: number;
  reviewItems: QuizReviewItem[];
};

type StepFeedback = {
  isCorrect: boolean;
  normalizedAnswer: string;
  canonicalAnswer: string;
  workedSolution: string;
  roundingHint?: string;
  pendingNextQuestion: PublicQuizQuestion;
  nextIndex: number;
};

type AntiCheatQuizProps = {
  topicSlug: string;
  topicTitle: string;
  speechSpeed: string;
  onBackToTutorial: () => void;
  onQuizCompleted?: (update: {
    currentStreak: number;
    xpEarned: number;
  }) => void;
};

export function AntiCheatQuiz({
  topicSlug,
  topicTitle,
  speechSpeed,
  onBackToTutorial,
  onQuizCompleted,
}: AntiCheatQuizProps) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [question, setQuestion] = useState<PublicQuizQuestion | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [hintText, setHintText] = useState<string | null>(null);
  const [clarifyText, setClarifyText] = useState<string | null>(null);
  const [integrityWarning, setIntegrityWarning] = useState<string | null>(null);
  const [stepFeedback, setStepFeedback] = useState<StepFeedback | null>(null);
  const [summary, setSummary] = useState<CompletedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const questionStartedAtRef = useRef<number>(Date.now());
  const pendingTabSwitchesRef = useRef<number>(0);
  const pendingPasteRef = useRef<number>(0);

  const voice = useVoiceEngine({
    speechSpeed,
    autoSpeak: true,
    onTranscript: (spoken) => {
      setAnswerInput(spoken);
    },
  });

  const speakRef = useRef(voice.speak);
  speakRef.current = voice.speak;

  const startFreshQuiz = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setSummary(null);
    setStepFeedback(null);
    setHintText(null);
    setClarifyText(null);
    setIntegrityWarning(null);
    setAnswerInput("");
    pendingTabSwitchesRef.current = 0;
    pendingPasteRef.current = 0;

    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicSlug }),
      });

      if (!res.ok) {
        throw new Error("Could not start quiz session");
      }

      const data = (await res.json()) as {
        attemptId: string;
        totalQuestions: number;
        currentIndex: number;
        question: PublicQuizQuestion;
      };

      setAttemptId(data.attemptId);
      setTotalQuestions(data.totalQuestions);
      setCurrentIndex(data.currentIndex);
      setQuestion(data.question);
      questionStartedAtRef.current = Date.now();
      await speakRef.current(data.question.spokenPrompt);
    } catch {
      setErrorMsg(
        "Couldn't start the quiz right now. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [topicSlug]);

  useEffect(() => {
    startFreshQuiz();
  }, [startFreshQuiz]);

  // Anti-cheat tab-switch detector (active only while answering an ungraded question)
  useEffect(() => {
    const isAnswering =
      Boolean(attemptId) && !loading && !summary && !stepFeedback;
    if (!isAnswering) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pendingTabSwitchesRef.current += 1;
        setIntegrityWarning(
          "Tab switch recorded — stay on this screen during your No-Cheat Quiz so your Parent/Guardian Watcher sees a Clean Effort badge."
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [attemptId, loading, summary, stepFeedback]);

  const handlePasteBlocked = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    pendingPasteRef.current += 1;
    setIntegrityWarning(
      "Paste is disabled in No-Cheat Quiz mode. Work out the calculation and type or speak your answer."
    );
  };

  const handleRequestHint = async () => {
    if (!attemptId || submitting || stepFeedback) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          action: "hint",
          tabSwitchesDelta: pendingTabSwitchesRef.current,
          pasteDelta: pendingPasteRef.current,
        }),
      });
      pendingTabSwitchesRef.current = 0;
      pendingPasteRef.current = 0;

      if (res.ok) {
        const data = (await res.json()) as { hintSpoken: string };
        setHintText(data.hintSpoken);
        await voice.speak(data.hintSpoken);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attemptId || !answerInput.trim() || submitting || stepFeedback) {
      return;
    }

    setSubmitting(true);
    setClarifyText(null);
    const elapsedMs = Math.max(0, Date.now() - questionStartedAtRef.current);

    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          action: "submit",
          answer: answerInput.trim(),
          timeTakenMs: elapsedMs,
          tabSwitchesDelta: pendingTabSwitchesRef.current,
          pasteDelta: pendingPasteRef.current,
        }),
      });
      pendingTabSwitchesRef.current = 0;
      pendingPasteRef.current = 0;

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as {
          cause?: string;
          message?: string;
        } | null;
        setErrorMsg(
          errBody?.cause || errBody?.message || "Could not submit answer."
        );
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
            roundingHint?: string;
            currentIndex: number;
            nextQuestion: PublicQuizQuestion;
          }
        | {
            action: "completed";
            isCorrect: boolean;
            normalizedAnswer: string;
            canonicalAnswer: string;
            workedSolution: string;
            summary: CompletedSummary;
          };

      if (data.action === "clarify") {
        setClarifyText(data.clarificationPrompt);
        await voice.speak(data.clarificationPrompt);
        return;
      }

      if (data.action === "next") {
        setStepFeedback({
          isCorrect: data.isCorrect,
          normalizedAnswer: data.normalizedAnswer,
          canonicalAnswer: data.canonicalAnswer,
          workedSolution: data.workedSolution,
          roundingHint: data.roundingHint,
          pendingNextQuestion: data.nextQuestion,
          nextIndex: data.currentIndex,
        });
        await voice.speak(
          data.isCorrect
            ? "Spot on! Check the worked step, then continue to the next question."
            : `Good try — the exact answer was ${data.canonicalAnswer}. Review the step below before moving on.`
        );
        return;
      }

      setSummary(data.summary);
      onQuizCompleted?.({
        currentStreak: data.summary.currentStreak,
        xpEarned: data.summary.xpEarned,
      });
      await voice.speak(
        `Quiz complete! You scored ${data.summary.scorePercent} percent — ${data.summary.correctCount} out of ${data.summary.totalQuestions} correct.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceToNextQuestion = async () => {
    if (!stepFeedback) {
      return;
    }
    const nextQ = stepFeedback.pendingNextQuestion;
    setCurrentIndex(stepFeedback.nextIndex);
    setQuestion(nextQ);
    setStepFeedback(null);
    setAnswerInput("");
    setHintText(null);
    setClarifyText(null);
    questionStartedAtRef.current = Date.now();
    await voice.speak(nextQ.spokenPrompt);
  };

  if (loading) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center gap-3 rounded-2xl p-10 text-center">
        <RefreshCw className="size-6 animate-spin text-emerald-400" />
        <p className="font-semibold text-slate-200 text-sm">
          Generating 5 randomized No-Cheat GCSE questions for {topicTitle}...
        </p>
      </div>
    );
  }

  if (summary) {
    const cleanEffort = summary.integrityFlags.length === 0;
    return (
      <section className="glass-panel space-y-5 rounded-2xl p-6">
        <div className="flex flex-col justify-between gap-4 border-white/10 border-b pb-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 font-bold text-emerald-200 text-xs">
              <Award className="size-4 text-emerald-400" />
              Quiz Complete · +{summary.xpEarned} XP Earned
            </div>
            <h2 className="font-extrabold text-2xl text-white">
              Score: {summary.scorePercent}% ({summary.correctCount}/
              {summary.totalQuestions})
            </h2>
            <p className="text-slate-300 text-xs">
              {summary.scorePercent >= 80
                ? "Passed with flying colours! Try another topic or challenge yourself with fresh numbers."
                : "Review the worked methods below, revisit the Voice Tutorial if needed, and try a fresh set of numbers!"}
            </p>
          </div>

          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-xs",
              cleanEffort
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                : "border-amber-400/40 bg-amber-500/10 text-amber-100"
            )}
          >
            <div className="flex items-center gap-1.5 font-bold">
              {cleanEffort ? (
                <ShieldCheck className="size-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="size-4 text-amber-400" />
              )}
              <span>
                {cleanEffort
                  ? "Clean Effort Verified ✓"
                  : "Integrity Notes Logged"}
              </span>
            </div>
            <div className="mt-1 text-[11px] opacity-90">
              Tab switches: {summary.tabSwitchCount} · Paste blocked:{" "}
              {summary.pasteCount} · Hints used: {summary.hintsUsed}
            </div>
          </div>
        </div>

        {/* Full 5-Question Worked Review */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-slate-200 text-sm">
            Worked Solutions Review
          </h3>
          {summary.reviewItems.map((item) => (
            <div
              className={cn(
                "rounded-xl border p-3.5 text-xs",
                item.isCorrect
                  ? "border-emerald-400/25 bg-emerald-500/[0.06]"
                  : "border-rose-400/25 bg-rose-500/[0.06]"
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
              <div className="mt-1.5 flex flex-wrap gap-3 text-slate-300">
                <span>
                  Your answer: <strong>{item.learnerAnswer}</strong>
                </span>
                <span>
                  Correct answer:{" "}
                  <strong className="text-emerald-300">
                    {item.canonicalAnswer}
                  </strong>
                </span>
              </div>
              <div className="mt-1 text-slate-400">
                Method: {item.workedSolution}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 font-bold text-white text-xs shadow-md transition hover:brightness-110"
            onClick={startFreshQuiz}
            type="button"
          >
            <RefreshCw className="size-4" />
            Try Fresh Quiz (New Numbers)
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-semibold text-slate-200 text-xs transition hover:bg-white/10"
            onClick={onBackToTutorial}
            type="button"
          >
            Back to Step 1: Voice Tutorial
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-panel space-y-5 rounded-2xl p-5 sm:p-6">
      {/* Top Anti-Cheat Shield Bar + Progress */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-white/10 border-b pb-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 font-bold text-emerald-200">
            <Lock className="size-3.5 text-emerald-400" />
            No-Cheat Quiz Mode
          </span>
          <span className="text-slate-400">
            AI Tutor locked · Fresh server numbers · Paste disabled
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-white">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{
                width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {integrityWarning ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-2.5 text-amber-100 text-xs">
          <AlertTriangle className="size-4 shrink-0 text-amber-400" />
          <span>{integrityWarning}</span>
        </div>
      ) : null}

      {errorMsg ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3.5 py-2.5 text-rose-100 text-xs">
          {errorMsg}
        </div>
      ) : null}

      {question ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-violet-400/35 bg-violet-500/15 px-2.5 py-1 font-bold text-violet-200 text-xs">
                {question.difficultyLabel}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-medium text-xs",
                  question.calculatorAllowed
                    ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                    : "border-orange-400/30 bg-orange-500/10 text-orange-200"
                )}
              >
                <Calculator className="size-3.5" />
                {question.calculatorAllowed
                  ? "Calculator Allowed"
                  : "Non-Calculator"}
              </span>
            </div>

            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-medium text-slate-200 text-xs transition hover:bg-white/10"
              onClick={() => voice.speak(question.spokenPrompt, true)}
              type="button"
            >
              <Volume2 className="size-3.5 text-orange-400" />
              Read Question Aloud
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-5">
            <p className="font-semibold text-base text-white leading-relaxed sm:text-lg">
              {question.promptText}
            </p>
          </div>

          {hintText ? (
            <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3.5 text-amber-100 text-xs">
              <strong>Method Clue:</strong> {hintText}
            </div>
          ) : null}

          {clarifyText ? (
            <div className="rounded-xl border border-violet-400/35 bg-violet-500/10 p-3.5 text-violet-100 text-xs">
              <strong>Clarification:</strong> {clarifyText}
            </div>
          ) : null}

          {stepFeedback ? (
            <div
              className={cn(
                "space-y-3 rounded-2xl border p-4",
                stepFeedback.isCorrect
                  ? "border-emerald-400/40 bg-emerald-500/15"
                  : "border-amber-400/40 bg-amber-500/15"
              )}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                {stepFeedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="size-5 text-emerald-400" />
                    <span>Correct! ({stepFeedback.normalizedAnswer})</span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-5 text-amber-400" />
                    <span>
                      Not quite (you answered {stepFeedback.normalizedAnswer} ·
                      correct answer: {stepFeedback.canonicalAnswer})
                    </span>
                  </>
                )}
              </div>
              {stepFeedback.roundingHint ? (
                <p className="text-amber-200 text-xs">
                  {stepFeedback.roundingHint}
                </p>
              ) : null}
              <p className="text-slate-200 text-xs">
                <strong>Worked method:</strong> {stepFeedback.workedSolution}
              </p>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 font-bold text-slate-950 text-xs transition hover:bg-slate-200"
                onClick={handleAdvanceToNextQuestion}
                type="button"
              >
                Continue to Question {stepFeedback.nextIndex + 1} →
              </button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
              onSubmit={handleSubmitAnswer}
            >
              <div className="relative flex flex-1 items-center">
                {question.unit === "£" ? (
                  <span className="pointer-events-none absolute left-3.5 font-bold text-slate-400 text-sm">
                    £
                  </span>
                ) : null}
                <input
                  autoComplete="off"
                  className={cn(
                    "w-full rounded-xl border border-white/15 bg-slate-900/90 py-3 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none",
                    question.unit === "£" ? "pl-8" : "pl-4"
                  )}
                  disabled={submitting}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onPaste={handlePasteBlocked}
                  placeholder="Type your answer (e.g. 1.06 or 7/12) or tap Speak..."
                  value={answerInput}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-3 font-semibold text-xs transition",
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
                      Stop Mic
                    </>
                  ) : (
                    <>
                      <Mic className="size-4 text-orange-400" />
                      Speak Answer
                    </>
                  )}
                </button>

                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-3 font-medium text-amber-200 text-xs transition hover:bg-amber-500/20 disabled:opacity-50"
                  disabled={submitting || Boolean(hintText)}
                  onClick={handleRequestHint}
                  type="button"
                >
                  <HelpCircle className="size-4 text-amber-400" />
                  Method Clue
                </button>

                <button
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 font-bold text-sm text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
                  disabled={submitting || !answerInput.trim()}
                  type="submit"
                >
                  {submitting ? "Checking..." : "Submit Answer"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
