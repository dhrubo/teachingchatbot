"use client";

import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type ChallengeConsentState,
  canShowChallengeQuestion,
  logSuppressedQuestion,
} from "@/lib/challenge-gate";
import { gradeAnswer } from "@/lib/questions/grade-answer";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

type AdaptiveQuestion = {
  archetypeId: string;
  archetypeSlug: string;
  skillSlug: string;
  difficultyBand: "must" | "should" | "could" | "gcse_bridge";
  questionType: string;
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  rules: Record<string, unknown>;
  hint: string | null;
  explanation: string | null;
};

export type WrongAnswerRecord = {
  questionNumber: number;
  prompt: string;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string | null;
  skillSlug: string;
  difficultyBand: string;
};

export type ChallengeResults = {
  finalScore: number;
  questionCount: number;
  wrongAnswers: WrongAnswerRecord[];
};

type ChallengeModeProps = {
  consentState: ChallengeConsentState;
  missionSlug: string;
  missionTitle: string;
  onComplete: (results: ChallengeResults) => void;
  onExit: () => void;
  onHelp: () => void;
};

const TOTAL_QUESTIONS = 5;

export function ChallengeMode({
  consentState,
  missionSlug,
  missionTitle,
  onComplete,
  onExit,
  onHelp,
}: ChallengeModeProps) {
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentQuestion, setCurrentQuestion] =
    useState<AdaptiveQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [limitReached, setLimitReached] = useState<string | null>(null);
  const [noQuestions, setNoQuestions] = useState(false);

  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [textInput, setTextInput] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const wrongRef = useRef<WrongAnswerRecord[]>([]);

  const gateOpen = canShowChallengeQuestion(consentState);

  const fetchNextQuestion = useCallback(async () => {
    if (!gateOpen) {
      logSuppressedQuestion("ChallengeMode.fetchNextQuestion");
      return;
    }
    setIsLoading(true);
    setCurrentQuestion(null);
    try {
      const response = await fetch("/api/adaptive-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "next-question", missionSlug }),
      });
      const data = await response.json();
      if (data.limitReached) {
        setLimitReached(data.message as string);
        return;
      }
      // 404 = this topic has no questions authored yet → friendly notice
      // (not a broken loading spinner).
      if (response.status === 404 || (response.ok && !data.question)) {
        setNoQuestions(true);
        return;
      }
      if (!response.ok || !data.question) {
        throw new Error(data.error ?? "Failed to fetch question");
      }
      setCurrentQuestion(data.question as AdaptiveQuestion);
    } catch (error) {
      console.error(error);
      setNoQuestions(true);
    } finally {
      setIsLoading(false);
    }
  }, [gateOpen, missionSlug]);

  const submitAnswer = async (question: AdaptiveQuestion, answer: string) => {
    try {
      await fetch("/api/adaptive-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-answer",
          archetypeId: question.archetypeId,
          skillSlug: question.skillSlug,
          difficultyBand: question.difficultyBand,
          prompt: question.prompt,
          studentAnswer: answer,
          correctAnswer: question.correctAnswer,
          rules: question.rules,
        }),
      });
    } catch (error) {
      console.error("Failed to submit answer", error);
    }
  };

  useEffect(() => {
    fetchNextQuestion();
  }, [fetchNextQuestion]);

  const handleAnswer = (answer: string) => {
    if (feedback || !currentQuestion) {
      return;
    }
    setSelectedAnswer(answer);
    const isCorrect = gradeAnswer({
      studentAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      rules: currentQuestion.rules,
    });

    if (isCorrect) {
      playSound("success");
    } else {
      playSound("wrong");
      wrongRef.current.push({
        questionNumber,
        prompt: currentQuestion.prompt,
        studentAnswer: answer,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        skillSlug: currentQuestion.skillSlug,
        difficultyBand: currentQuestion.difficultyBand,
      });
    }

    setFeedback(isCorrect ? "correct" : "wrong");
    submitAnswer(currentQuestion, answer);
  };

  const handleNext = () => {
    if (!currentQuestion) {
      return;
    }
    const isCorrect = feedback === "correct";
    const newScore = score + (isCorrect ? 1 : 0);

    if (questionNumber >= TOTAL_QUESTIONS) {
      onComplete({
        finalScore: newScore,
        questionCount: TOTAL_QUESTIONS,
        wrongAnswers: wrongRef.current,
      });
    } else {
      setQuestionNumber((n) => n + 1);
      setScore(newScore);
      setFeedback(null);
      setSelectedAnswer(null);
      setTextInput("");
      fetchNextQuestion();
    }
  };

  if (!gateOpen) {
    return null;
  }

  if (noQuestions) {
    return (
      <motion.div
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#090915] text-white px-6 text-center"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <span className="text-4xl drop-shadow-[0_0_10px_rgba(251,191,36,0.2)]">🚧</span>
        <p className="max-w-sm text-base text-indigo-200">
          Challenges for <strong className="text-white">{missionTitle}</strong> are coming soon. You
          can still review the concept cards for this topic.
        </p>
        <Button
          className="rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-violet-600 hover:from-orange-600 hover:to-violet-700 font-semibold text-white shadow-lg shadow-orange-500/20 px-6 py-2.5 transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98]"
          onClick={onExit}
          size="sm"
        >
          Choose another topic
        </Button>
      </motion.div>
    );
  }

  if (limitReached) {
    return (
      <motion.div
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#090915] text-white px-6 text-center"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <span className="text-4xl">🛑</span>
        <p className="max-w-sm text-base text-indigo-200">{limitReached}</p>
        <Button
          className="rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-violet-600 hover:from-orange-600 hover:to-violet-700 font-semibold text-white shadow-lg shadow-orange-500/20 px-6 py-2.5 transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98]"
          onClick={onExit}
          size="sm"
        >
          Keep learning
        </Button>
      </motion.div>
    );
  }

  if (isLoading || !currentQuestion) {
    return (
      <motion.div
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090915] text-indigo-200"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-400" />
          <p className="text-sm font-medium tracking-wide">Loading Challenge...</p>
        </div>
      </motion.div>
    );
  }

  const question = currentQuestion;
  const isLast = questionNumber >= TOTAL_QUESTIONS;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#090915] text-white"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between border-b border-indigo-950/40 px-4 py-3 bg-[#090915]/60 backdrop-blur-md">
        <span className="text-xs font-semibold text-indigo-200/80 [text-shadow:0_0_8px_rgba(129,140,248,0.2)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400 font-bold tracking-wide">{missionTitle}</span> · Question{" "}
          {questionNumber} of {TOTAL_QUESTIONS}
        </span>
        <span className="text-xs font-semibold text-indigo-200/80 [text-shadow:0_0_8px_rgba(129,140,248,0.2)]">
          Score: {score}/{questionNumber - 1 + (feedback ? 1 : 0)}
        </span>
        <Button
          className="rounded-full text-indigo-300 hover:text-indigo-100 hover:bg-indigo-950/40 border border-indigo-500/10"
          onClick={onExit}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="h-1.5 w-full bg-indigo-950/50">
        <div
          className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-violet-600 shadow-[0_0_10px_rgba(249,115,22,0.4)] transition-all duration-500"
          style={{
            width: `${((questionNumber - 1) / TOTAL_QUESTIONS) * 100}%`,
          }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: 12 }}
              key={`${currentQuestion.archetypeSlug}-${questionNumber}`}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6 bg-indigo-950/30 border border-indigo-950/60 shadow-lg shadow-indigo-950/50 backdrop-blur-md rounded-2xl p-6 text-center">
                <p className="text-lg font-semibold text-indigo-100 leading-relaxed">
                  {question.prompt}
                </p>
              </div>

              {question.options && question.options.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {question.options.map((option, index) => {
                    const isChosen = selectedAnswer === option;
                    const buttonClass = cn(
                      "justify-start rounded-xl text-left font-medium w-full px-5 py-4 text-base transition-all duration-200",
                      // Normal tactile glass state
                      "bg-indigo-950/20 border border-indigo-500/15 text-indigo-100 hover:bg-indigo-900/30 hover:border-violet-500/40 hover:-translate-y-[1px] active:scale-[0.98] focus-visible:ring-1 focus-visible:ring-violet-500",
                      // When feedback is active
                      feedback && !isChosen && "opacity-40 hover:translate-y-0 active:scale-100 border-indigo-500/10",
                      // Correct chosen
                      feedback === "correct" && isChosen && "border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse text-green-300",
                      // Wrong chosen
                      feedback === "wrong" && isChosen && "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)] text-red-300"
                    );

                    return (
                      <motion.div
                        animate={feedback === "wrong" && isChosen ? { x: [0, -8, 8, -8, 8, -4, 4, 0] } : {}}
                        className="w-full"
                        key={option}
                        transition={{ duration: 0.5 }}
                      >
                        <Button
                          className={buttonClass}
                          disabled={!!feedback}
                          onClick={() => handleAnswer(option)}
                          size="lg"
                          variant="ghost"
                        >
                          <span className="mr-3 flex size-6 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-950/40 text-xs font-semibold text-indigo-300">
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <motion.div
                    animate={feedback === "wrong" ? { x: [0, -8, 8, -8, 8, -4, 4, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <input
                      className={cn(
                        "w-full rounded-xl border px-4 py-3.5 text-base outline-none transition-all duration-200",
                        "bg-indigo-950/20 border-indigo-500/20 text-indigo-100 placeholder-indigo-300/40 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 shadow-inner",
                        feedback === "correct" && "border-green-500 bg-green-500/10 text-green-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
                        feedback === "wrong" && "border-red-500 bg-red-500/10 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                      )}
                      disabled={!!feedback}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && textInput.trim()) {
                          handleAnswer(textInput.trim());
                        }
                      }}
                      placeholder="Type your answer..."
                      value={textInput}
                    />
                  </motion.div>
                  {!feedback && (
                    <Button
                      className="self-center rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-violet-600 hover:from-orange-600 hover:to-violet-700 font-semibold text-white shadow-lg shadow-orange-500/20 px-8 py-2.5 transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98]"
                      disabled={!textInput.trim()}
                      onClick={() => handleAnswer(textInput.trim())}
                      size="sm"
                    >
                      Check answer
                    </Button>
                  )}
                </div>
              )}

              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "mt-6 rounded-2xl border p-5 text-center backdrop-blur-md shadow-lg",
                    feedback === "correct"
                      ? "border-green-500/30 bg-green-500/10 text-green-200 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : "border-red-500/30 bg-red-500/10 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                  )}
                >
                  {feedback === "correct" ? (
                    <p className="text-lg font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">🎉 Outstanding Job!</p>
                  ) : (
                    <div>
                      <p className="mb-1 text-lg font-bold text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                        🔍 Let's learn from this!
                      </p>
                      <p className="text-sm text-indigo-200/80">
                        The correct answer is:{" "}
                        <span className="font-semibold text-green-400 underline decoration-green-400/30 decoration-2 underline-offset-2">
                          {question.correctAnswer}
                        </span>
                      </p>
                    </div>
                  )}
                  <Button
                    className="mt-4 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-violet-600 hover:from-orange-600 hover:to-violet-700 font-semibold text-white shadow-lg shadow-orange-500/20 px-8 py-2.5 transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98]"
                    onClick={handleNext}
                    size="sm"
                  >
                    {isLast ? "See results →" : "Next →"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="border-t border-indigo-950/40 px-4 py-3 text-center bg-[#090915]/40 backdrop-blur-md">
        <button
          className="text-xs font-semibold text-indigo-300/70 hover:text-indigo-200 transition-colors bg-indigo-950/20 border border-indigo-500/10 rounded-full px-4 py-1.5 hover:border-violet-500/30 hover:bg-indigo-900/10 active:scale-[0.98]"
          onClick={onHelp}
          type="button"
        >
          Ask Tutor 💬
        </button>
      </div>
    </motion.div>
  );
}
