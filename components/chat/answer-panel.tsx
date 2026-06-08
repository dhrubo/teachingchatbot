"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useActiveChat } from "@/hooks/use-active-chat";
import { isAnswerCorrect, isGraded } from "@/lib/active-question";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { ChallengeProgress } from "./challenge-progress";
import { MathText } from "./math-text";
import { ProgressBar } from "./progress-indicator";

export function AnswerPanel() {
  const { activeChallenge, submitAnswer, status } = useActiveChat();
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  // Track the wrong answer locally so we can send it when the student clicks
  // "Next challenge" rather than auto-submitting.
  const [pendingWrongAnswer, setPendingWrongAnswer] = useState<string | null>(null);

  const activeQuestion = activeChallenge;

  // Reset when a new question appears.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on question id
  useEffect(() => {
    setValue("");
    setFeedback(null);
    setWrongChoice(null);
    setPendingWrongAnswer(null);
  }, [activeQuestion?.id]);

  if (!activeQuestion) {
    return null;
  }

  const isBusy = status === "submitted" || status === "streaming";
  const graded = isGraded(activeQuestion);
  const { type, options } = activeQuestion;

  // Grade a graded answer locally. Correct → confirm + continue.
  // Wrong → show the explanation (what they did wrong) and a "Next challenge"
  // button so the student can read, learn, and move on at their own pace.
  const grade = (answer: string) => {
    const correct = isAnswerCorrect(activeQuestion, answer);
    if (correct) {
      setFeedback("correct");
      setWrongChoice(null);
      playSound("success");
      submitAnswer(answer);
    } else {
      setFeedback("wrong");
      setWrongChoice(answer);
      setPendingWrongAnswer(answer);
      playSound("wrong");
    }
  };

  // Tap-to-answer for graded multiple choice: select → immediate grade.
  const handlePick = (opt: string) => {
    if (feedback === "correct" || isBusy) {
      return;
    }
    setValue(opt);
    if (graded) {
      grade(opt);
    }
  };

  // Explicit submit for text / select, or for non-graded prompts.
  const handleSubmit = () => {
    if (!value.trim() || isBusy || feedback === "correct") {
      return;
    }
    if (graded) {
      grade(value);
    } else {
      playSound("pop");
      submitAnswer(value);
    }
  };

  // After a wrong answer, the student chooses one of two paths:
  const handleExplainDifferently = () => {
    if (!pendingWrongAnswer) {
      return;
    }
    setPendingWrongAnswer(null);
    submitAnswer(
      `${pendingWrongAnswer}\n\n[INCORRECT — the right answer is ${activeQuestion.correctAnswer}. The student still feels unsure. Please explain this concept in a completely different way with a fresh example, then ask a new question at an easier level.]`
    );
  };

  const handleNextChallenge = () => {
    if (!pendingWrongAnswer) {
      return;
    }
    setPendingWrongAnswer(null);
    submitAnswer(
      `${pendingWrongAnswer}\n\n[INCORRECT — the right answer is ${activeQuestion.correctAnswer}. The student has read the explanation and is ready to move on. Give a brief tip addressing the mistake they made (be specific, don't just say "good try"), then ask a new question targeting the same concept at a slightly easier level.]`
    );
  };

  const correctAnswer = activeQuestion.correctAnswer;

  // Per-option styling for graded MC after an answer.
  const optionClass = (opt: string) => {
    if (graded && feedback) {
      if (opt === correctAnswer) {
        return "border-green-500 bg-green-500/15 text-foreground";
      }
      if (opt === wrongChoice) {
        return "border-destructive bg-destructive/15 text-foreground";
      }
      return "border-border/40 text-muted-foreground";
    }
    return value === opt
      ? "border-primary bg-primary/10 text-foreground"
      : "border-border/60 hover:border-primary/50 hover:bg-accent/50";
  };

  // Card animation: pop on correct, shake on wrong.
  const animate =
    feedback === "wrong"
      ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 5, 0] }
      : feedback === "correct"
        ? { opacity: 1, y: 0, scale: [1, 1.03, 1] }
        : { opacity: 1, y: 0 };

  return (
    <motion.div
      animate={animate}
      className={cn(
        "mb-2 w-full rounded-2xl border bg-card/80 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm transition-colors",
        feedback === "correct" && "border-green-500/60 bg-green-500/10",
        feedback === "wrong" && "border-destructive/50 bg-destructive/5",
        !feedback && "border-primary/30"
      )}
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <ChallengeProgress />
        <AnimatePresence>
          {feedback && (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex items-center gap-1.5 font-bold text-[15px]",
                feedback === "correct" ? "text-green-600" : "text-destructive"
              )}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              {feedback === "correct" ? (
                <>
                  <span className="text-lg">🎉</span> Nice — that's correct!
                </>
              ) : (
                <>
                  <span className="text-lg">❌</span> Not quite
                </>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {graded && <ProgressBar className="mb-3" />}

      <p className="mb-3 font-semibold text-[17px] leading-snug text-foreground">
        <MathText>{activeQuestion.prompt}</MathText>
      </p>

      {type === "multiple_choice" && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {options.map((opt, i) => (
            <button
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] transition-all active:scale-[0.99]",
                optionClass(opt)
              )}
              disabled={feedback === "correct" || isBusy}
              key={opt}
              onClick={() => handlePick(opt)}
              type="button"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border font-semibold text-[12px]",
                  graded && feedback && opt === correctAnswer
                    ? "border-green-500 bg-green-500 text-white"
                    : graded && feedback && opt === wrongChoice
                      ? "border-destructive bg-destructive text-white"
                      : value === opt
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <MathText>{opt}</MathText>
            </button>
          ))}
        </div>
      )}

      {type === "select" && (
        <select
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-[14px] outline-none focus:border-primary"
          disabled={!!feedback || isBusy}
          onChange={(e) => setValue(e.target.value)}
          value={value}
        >
          <option disabled value="">
            Choose an answer…
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {type === "text" && (
        <input
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-[14px] outline-none focus:border-primary"
          disabled={feedback === "correct" || isBusy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
          placeholder="Type your answer…"
          value={value}
        />
      )}

      {/* Instant inline explanation on a wrong graded answer. */}
      <AnimatePresence>
        {graded && feedback === "wrong" && (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5 p-3.5"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {wrongChoice && (
              <p className="mb-1.5 text-[14px] text-foreground">
                Your answer: <MathText>{wrongChoice}</MathText> ❌
              </p>
            )}
            <p className="mb-1 font-semibold text-[13px] text-green-700">
              ✅ Correct: <MathText>{correctAnswer}</MathText>
            </p>
            {activeQuestion.explanation && (
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                <MathText>{activeQuestion.explanation}</MathText>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action row. Wrong answer shows explanation + two choices: get a
          different explanation, or move on to the next challenge (no retry).
          Text/select/non-graded keep an explicit submit button. */}
      {graded && feedback === "wrong" ? (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            className="rounded-full border border-primary/40 bg-background px-4 font-semibold text-foreground shadow-sm transition-transform hover:scale-[1.03] hover:bg-accent active:scale-[0.98]"
            disabled={isBusy}
            onClick={handleExplainDifferently}
            size="sm"
            type="button"
          >
            Explain differently 🔄
          </Button>
          <Button
            className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98]"
            disabled={isBusy}
            onClick={handleNextChallenge}
            size="sm"
            type="button"
          >
            Ready for next challenge 🚀
          </Button>
        </div>
      ) : (
        (type === "text" || type === "select" || !graded) &&
        feedback !== "correct" && (
          <div className="mt-3 flex justify-end">
            <Button
              className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
              disabled={!value.trim() || isBusy}
              onClick={handleSubmit}
              size="sm"
              type="button"
            >
              {graded ? "Check answer" : "Send"}
            </Button>
          </div>
        )
      )}
    </motion.div>
  );
}
