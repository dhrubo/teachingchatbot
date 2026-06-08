"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useActiveChat } from "@/hooks/use-active-chat";
import { isAnswerCorrect, isGraded } from "@/lib/active-question";
import {
  type AnswerAttempt,
  detectAnswerPatterns,
} from "@/lib/answer-patterns";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { ChallengeProgress } from "./challenge-progress";
import { MathText } from "./math-text";
import { ProgressBar } from "./progress-indicator";

export function AnswerPanel() {
  const {
    activeChallenge,
    submitAnswer,
    status,
    bundleActive,
    challengeIndex,
    currentConcept,
  } = useActiveChat();
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  // Track the wrong answer locally so we can send it when the student clicks
  // "Next challenge" rather than auto-submitting.
  const [pendingWrongAnswer, setPendingWrongAnswer] = useState<string | null>(null);
  // Deterministic readiness gate: shown before the first challenge in a bundle.
  const [gateDismissed, setGateDismissed] = useState(false);
  // How many times the student has asked to have THIS concept re-explained.
  // On the 3rd attempt we escalate the reteach to an explicit visual diagram.
  const [explainAttempts, setExplainAttempts] = useState(0);
  // Recent answer attempts on the current concept, used for deterministic
  // pattern detection (no LLM call). Resets when the concept changes.
  const [attempts, setAttempts] = useState<AnswerAttempt[]>([]);

  // After this many confused attempts on the same concept, demand a visual.
  const VISUAL_ESCALATION_AT = 3;

  const activeQuestion = activeChallenge;

  // Per-QUESTION UI reset (a new challenge id swaps the controls).
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on question id
  useEffect(() => {
    setValue("");
    setFeedback(null);
    setWrongChoice(null);
    setPendingWrongAnswer(null);
  }, [activeQuestion?.id]);

  // Per-CONCEPT reset (only when the topic genuinely changes). The attempt
  // history and reteach counter must survive a reteach — which swaps in a new
  // bundle with new question ids but is still the SAME concept.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on concept
  useEffect(() => {
    setExplainAttempts(0);
    setAttempts([]);
    // Each new lesson/topic gets its own readiness gate before its first
    // challenge — otherwise dismissing one lesson's gate would skip every
    // later lesson's gate.
    setGateDismissed(false);
  }, [currentConcept]);

  // The pattern (if any) detected from this concept's attempts so far. Pure,
  // deterministic — shown to the student and fed into reteach turns.
  const detectedPattern = detectAnswerPatterns(attempts);

  if (!activeQuestion) {
    return null;
  }

  // Deterministic readiness gate for bundle challenges:
  // show a "I'm ready" prompt before the first bundle challenge.
  const showBundleGate =
    bundleActive && challengeIndex === 0 && !gateDismissed;

  const isBusy = status === "submitted" || status === "streaming";
  const graded = isGraded(activeQuestion);
  const { type, options } = activeQuestion;

  // Grade a graded answer locally. Correct → confirm + continue.
  // Wrong → show the explanation (what they did wrong) and a "Next challenge"
  // button so the student can read, learn, and move on at their own pace.
  const grade = (answer: string) => {
    const correct = isAnswerCorrect(activeQuestion, answer);
    // Record the attempt for deterministic pattern detection (no LLM call).
    setAttempts((prev) => [
      ...prev,
      {
        concept: currentConcept,
        prompt: activeQuestion.prompt,
        correctAnswer: activeQuestion.correctAnswer,
        chosen: answer,
        wasCorrect: correct,
      },
    ]);
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

  // Directive appended to a reteach once the student has been confused enough
  // times on the same concept — forces a worked VISUAL explanation rather than
  // yet another prose retry.
  const visualReteachDirective = (correctAnswer: string) =>
    `[INCORRECT — the right answer is ${correctAnswer}. The student has now asked for help ${VISUAL_ESCALATION_AT} times and is still stuck. Stop using prose. Explain this concept VISUALLY: draw a step-by-step diagram in text — use a fraction bar, area model, number line, grouped boxes or labelled arrows as appropriate — laid out across multiple lines so the structure is obvious. Keep words to a minimum, let the picture carry the explanation, then ask one very easy question.]`;

  // After a wrong answer, the student chooses one of two paths:
  const handleExplainDifferently = () => {
    if (!pendingWrongAnswer) {
      return;
    }
    const nextAttempt = explainAttempts + 1;
    setExplainAttempts(nextAttempt);
    setPendingWrongAnswer(null);
    const directive =
      nextAttempt >= VISUAL_ESCALATION_AT
        ? visualReteachDirective(activeQuestion.correctAnswer)
        : `[INCORRECT — the right answer is ${activeQuestion.correctAnswer}. The student still feels unsure. Please explain this concept in a completely different way with a fresh example, then ask a new question at an easier level.]`;
    // Feed any detected error pattern to the tutor so it targets the actual
    // misconception. No extra LLM call — this rides on the reteach turn.
    const observation = detectedPattern
      ? `\n\n[${detectedPattern.tutorObservation}]`
      : "";
    submitAnswer(`${pendingWrongAnswer}\n\n${directive}${observation}`);
  };

  // "Next challenge" — advance locally for bundles (no LLM call), or send to
  // the LLM for individual (non-bundle) questions.
  const handleNextChallenge = () => {
    if (!pendingWrongAnswer) {
      return;
    }
    setPendingWrongAnswer(null);
    // submitAnswer checks for active bundle and advances locally if one exists
    submitAnswer(pendingWrongAnswer);
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

  if (showBundleGate) {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 w-full rounded-2xl border border-primary/30 bg-card/80 p-5 shadow-[var(--shadow-card)]"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35 }}
      >
        <p className="mb-1 font-bold text-[17px] text-foreground">
          Ready for a challenge? 🎯
        </p>
        <p className="mb-4 text-[14px] leading-relaxed text-muted-foreground">
          Time to test your understanding! These are quick questions to lock in
          what you&apos;ve just learned.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98]"
            onClick={() => setGateDismissed(true)}
            size="sm"
            type="button"
          >
            I{"\u2019"}m ready 🚀
          </Button>
          <Button
            className="rounded-full border border-primary/40 bg-background px-4 font-semibold text-foreground shadow-sm transition-transform hover:scale-[1.03] hover:bg-accent active:scale-[0.98]"
            onClick={() => {
              const nextAttempt = explainAttempts + 1;
              setExplainAttempts(nextAttempt);
              submitAnswer(
                nextAttempt >= VISUAL_ESCALATION_AT
                  ? visualReteachDirective(activeQuestion.correctAnswer)
                  : `[INCORRECT — The student wants a different explanation of ${activeQuestion.correctAnswer}. Please explain this concept in a completely different way with a fresh example, then ask a new easier question.]`
              );
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Explain more 🔄
          </Button>
        </div>
      </motion.div>
    );
  }

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
                feedback === "correct" ? "text-green-400" : "text-destructive"
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
            <p className="mb-1 font-semibold text-[13px] text-green-400">
              ✅ Correct: <MathText>{correctAnswer}</MathText>
            </p>
            {activeQuestion.explanation && (
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                <MathText>{activeQuestion.explanation}</MathText>
              </p>
            )}
            {/* Deterministic pattern note — surfaced to the student when a
                recurring mistake is detected (no LLM call). */}
            {detectedPattern && (
              <p className="mt-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[13px] font-medium leading-relaxed text-primary">
                {detectedPattern.studentNote}
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
