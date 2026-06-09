"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAnswerCorrect } from "@/lib/active-question";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import type { ActiveQuestion } from "@/lib/active-question";

export type ChallengeResults = {
  total: number;
  correct: number;
  wrong: number;
  answers: { questionId: string; correct: boolean; chosen: string }[];
};

type ChallengeModeProps = {
  questions: ActiveQuestion[];
  missionTitle: string;
  onComplete: (results: ChallengeResults) => void;
  onExit: () => void;
  onHelp: () => void;
};

export function ChallengeMode({
  questions,
  missionTitle,
  onComplete,
  onExit,
  onHelp,
}: ChallengeModeProps) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<ChallengeResults["answers"]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [selected, setSelected] = useState("");
  const [textInput, setTextInput] = useState("");

  const question = questions[index];
  const isLast = index >= questions.length - 1;

  const handleAnswer = (answer: string) => {
    if (feedback || !question) return;
    const correct = isAnswerCorrect(question, answer);
    if (correct) playSound("success");
    else playSound("wrong");
    setFeedback(correct ? "correct" : "wrong");
    setSelected(answer);
  };

  const handleNext = () => {
    if (!question) return;
    const correct = feedback === "correct";
    const newAnswers = [
      ...answers,
      { questionId: question.id, correct, chosen: selected },
    ];
    const newScore = score + (correct ? 1 : 0);

    if (isLast) {
      onComplete({
        total: questions.length,
        correct: newScore,
        wrong: questions.length - newScore,
        answers: newAnswers,
      });
    } else {
      setIndex((i) => i + 1);
      setScore(newScore);
      setAnswers(newAnswers);
      setFeedback(null);
      setSelected("");
      setTextInput("");
    }
  };

  if (!question) return null;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          Question {index + 1} of {questions.length}
        </span>
        <span className="text-xs text-muted-foreground">
          Score: {score}/{index + (feedback ? 1 : 0)}
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

      {/* Progress bar */}
      <div className="h-1 w-full bg-border/30">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
          style={{
            width: `${(index / Math.max(questions.length, 1)) * 100}%`,
          }}
        />
      </div>

      {/* Question area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6 rounded-2xl border border-border/60 bg-card p-5 text-center">
                <p className="text-lg font-semibold text-foreground">
                  {question.prompt}
                </p>
              </div>

              {/* Multiple choice */}
              {(question as any).type === "multiple_choice" && (
                <div className="grid grid-cols-2 gap-3">
                {((question as any).options ?? []).map((opt: string) => (
                    <button
                      key={opt}
                      className={cn(
                        "rounded-xl border px-4 py-4 text-center text-sm font-medium transition-all",
                        feedback === "correct" &&
                          opt === (question as any).correctAnswer
                          ? "border-green-500 bg-green-500/15 text-foreground"
                          : feedback === "wrong" && opt === selected
                            ? "border-destructive bg-destructive/15 text-foreground"
                            : selected === opt
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border/60 text-foreground hover:border-primary/50 hover:bg-accent/50",
                        feedback && "pointer-events-none"
                      )}
                      disabled={!!feedback}
                      onClick={() => handleAnswer(opt)}
                      type="button"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Short text */}
              {(question as any).type === "text" && (
                <div className="flex flex-col gap-3">
                  <input
                    className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                    disabled={!!feedback}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && textInput.trim())
                        handleAnswer(textInput.trim());
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

              {/* Feedback display */}
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
                          {(question as any).correctAnswer}
                        </span>
                      </p>
                      {(question as any).explanation && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {(question as any).explanation}
                        </p>
                      )}
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

      {/* Help button */}
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
