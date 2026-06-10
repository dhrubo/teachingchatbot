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
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <span className="text-4xl">🚧</span>
        <p className="max-w-sm text-base text-foreground">
          Challenges for <strong>{missionTitle}</strong> are coming soon. You
          can still review the concept cards for this topic.
        </p>
        <Button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
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
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <p className="max-w-sm text-base text-foreground">{limitReached}</p>
        <Button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
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
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <p>Loading Challenge...</p>
      </motion.div>
    );
  }

  const question = currentQuestion;
  const isLast = questionNumber >= TOTAL_QUESTIONS;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          <span className="text-foreground">{missionTitle}</span> · Question{" "}
          {questionNumber} of {TOTAL_QUESTIONS}
        </span>
        <span className="text-xs text-muted-foreground">
          Score: {score}/{questionNumber - 1 + (feedback ? 1 : 0)}
        </span>
        <Button
          className="rounded-full text-muted-foreground hover:text-foreground"
          onClick={onExit}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="h-1 w-full bg-border/30">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
          style={{
            width: `${((questionNumber - 1) / TOTAL_QUESTIONS) * 100}%`,
          }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: 12 }}
              key={`${currentQuestion.archetypeSlug}-${questionNumber}`}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6 rounded-2xl border border-border/60 bg-card p-5 text-center">
                <p className="text-lg font-semibold text-foreground">
                  {question.prompt}
                </p>
              </div>

              {question.options && question.options.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {question.options.map((option) => (
                    <Button
                      className="justify-start rounded-xl"
                      disabled={!!feedback}
                      key={option}
                      onClick={() => handleAnswer(option)}
                      size="sm"
                      variant="outline"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <input
                    className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
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
                  {!feedback && (
                    <Button
                      className="self-center rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
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
                <div
                  className={cn(
                    "mt-4 rounded-xl border p-4 text-center",
                    feedback === "correct"
                      ? "border-green-500/60 bg-green-500/10"
                      : "border-destructive/60 bg-destructive/10"
                  )}
                >
                  {feedback === "correct" ? (
                    <p className="font-semibold text-green-400">🎉 Correct!</p>
                  ) : (
                    <div>
                      <p className="mb-1 font-semibold text-destructive">
                        ❌ Not quite
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Correct answer:{" "}
                        <span className="font-medium text-green-400">
                          {question.correctAnswer}
                        </span>
                      </p>
                    </div>
                  )}
                  <Button
                    className="mt-3 rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
                    onClick={handleNext}
                    size="sm"
                  >
                    {isLast ? "See results →" : "Next →"}
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-2 text-center">
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={onHelp}
          type="button"
        >
          Ask Tutor 💬
        </button>
      </div>
    </motion.div>
  );
}
