"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { isAnswerCorrect } from "@/lib/active-question";
import { useActiveChat } from "@/hooks/use-active-chat";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AnswerPanel() {
  const { activeQuestion, submitAnswer, status } = useActiveChat();
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  // Reset when a new question appears.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on question id
  useEffect(() => {
    setValue("");
    setFeedback(null);
  }, [activeQuestion?.id]);

  if (!activeQuestion) {
    return null;
  }

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = () => {
    if (!value.trim() || isBusy || feedback) {
      return;
    }
    const correct = isAnswerCorrect(activeQuestion, value);
    setFeedback(correct ? "correct" : "wrong");
    playSound(correct ? "success" : "wrong");
    // Let the animation play briefly, then send the result to the tutor.
    setTimeout(() => submitAnswer(value), 900);
  };

  const { type, options } = activeQuestion;

  // Single animate target: entrance, plus a shake (wrong) or pop (correct).
  const animate =
    feedback === "wrong"
      ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }
      : feedback === "correct"
        ? { opacity: 1, y: 0, scale: [1, 1.03, 1] }
        : { opacity: 1, y: 0 };

  return (
    <motion.div
      animate={animate}
      className={cn(
        "mb-2 w-full rounded-2xl border bg-card/70 p-3 shadow-[var(--shadow-card)] backdrop-blur-sm transition-colors",
        feedback === "correct" && "border-green-500/60 bg-green-500/10",
        feedback === "wrong" && "border-destructive/50 bg-destructive/10",
        !feedback && "border-primary/30"
      )}
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-primary text-xs uppercase tracking-wide">
          Your answer
        </span>
        <AnimatePresence>
          {feedback && (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "font-semibold text-sm",
                feedback === "correct" ? "text-green-600" : "text-destructive"
              )}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, scale: 0.8 }}
            >
              {feedback === "correct" ? "✅ Correct!" : "❌ Not quite"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {type === "multiple_choice" && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {options.map((opt, i) => (
            <button
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-all",
                value === opt
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 hover:border-primary/50 hover:bg-accent/50"
              )}
              disabled={!!feedback || isBusy}
              key={opt}
              onClick={() => setValue(opt)}
              type="button"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                  value === opt
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}

      {type === "select" && (
        <select
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-[13px] outline-none focus:border-primary"
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
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-[13px] outline-none focus:border-primary"
          disabled={!!feedback || isBusy}
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

      <div className="mt-2 flex justify-end">
        <Button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
          disabled={!value.trim() || !!feedback || isBusy}
          onClick={handleSubmit}
          size="sm"
          type="button"
        >
          Check answer
        </Button>
      </div>
    </motion.div>
  );
}
