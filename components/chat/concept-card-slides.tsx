"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConceptCard } from "@/lib/ai/missions";
import { cn } from "@/lib/utils";

type ConceptCardSlidesProps = {
  cards: ConceptCard[];
  onComplete: () => void;
  onChooseAnother?: () => void;
  onCardSeen?: () => void;
  onBack?: () => void;
  onHelp?: () => void;
  onSkipToQuiz?: () => void;
};

/** Build a quick recall prompt from a concept card's content. */
function recallPrompt(card: ConceptCard): string {
  const prompts = [
    `Without looking back, what was the key idea in "${card.title}"?`,
    `Can you explain "${card.title}" in your own words?`,
    `In one sentence, what does "${card.title}" mean?`,
  ];
  return prompts[Math.abs(card.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % prompts.length];
}

export function ConceptCardSlides({
  cards,
  onComplete,
  onChooseAnother,
  onCardSeen,
  onHelp,
  onSkipToQuiz,
}: ConceptCardSlidesProps) {
  const [index, setIndex] = useState(0);
  const [showRecall, setShowRecall] = useState(false);
  const card = cards[index];
  const isLast = index >= cards.length - 1;

  const seenRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (cards.length > 0 && !seenRef.current.has(index)) {
      seenRef.current.add(index);
      onCardSeen?.();
    }
  }, [index, cards.length, onCardSeen]);

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      // Show mini recall checkpoint before advancing to next card
      setShowRecall(true);
    }
  };

  const handleRecallDone = () => {
    setShowRecall(false);
    setIndex((i) => i + 1);
  };

  if (!card) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Progress dots */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {cards.map((dot, i) => (
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === index
                  ? "w-6 bg-[image:var(--gradient-sunset)]"
                  : i < index
                    ? "w-2 bg-orange-500/40"
                    : "w-2 bg-indigo-500/20"
              )}
              key={dot.id}
            />
          ))}
        </div>
        {onSkipToQuiz && (
          <Button
            className="rounded-full border border-orange-500/30 text-orange-400 bg-orange-500/5 hover:bg-orange-500/15 hover:border-orange-500/50 hover:shadow-[0_0_12px_rgba(249,115,22,0.25)] text-xs font-semibold px-3 py-1 h-auto transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            onClick={onSkipToQuiz}
            size="sm"
            variant="outline"
          >
            Skip to Quiz ⚡
          </Button>
        )}
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        {!showRecall ? (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="bg-indigo-950/45 border border-indigo-500/20 shadow-lg shadow-indigo-950/60 backdrop-blur-md rounded-2xl p-6"
            exit={{ opacity: 0, x: -20 }}
            initial={{ opacity: 0, x: 20 }}
            key={card.id}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Concept {index + 1} of {cards.length}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {card.title}
              </span>
            </div>

            <div className="mb-4 rounded-xl border border-indigo-500/10 bg-indigo-950/80 p-5 text-center font-mono text-xl font-bold text-violet-400">
              {card.visual}
            </div>

            {card.example && (
              <div className="mb-3 rounded-r-lg border-l-4 border-orange-500 bg-white/5 px-4 py-3 text-sm text-slate-300 leading-relaxed">
                <span className="font-bold text-orange-400 mr-1.5">
                  Example:
                </span>
                {card.example}
              </div>
            )}

            <p className="text-sm leading-relaxed text-slate-300">
              {card.explanation}
            </p>
          </motion.div>
        ) : (
          /* Mini recall checkpoint */
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-950/60 border border-emerald-500/20 shadow-lg shadow-emerald-950/40 backdrop-blur-md rounded-2xl p-6 text-center"
            exit={{ opacity: 0, y: -12 }}
            initial={{ opacity: 0, y: 12 }}
            key={`recall-${card.id}`}
            transition={{ duration: 0.2 }}
          >
            <span className="text-2xl mb-2 block">🧠</span>
            <h4 className="text-sm font-bold text-emerald-400 mb-3 tracking-wide uppercase">
              Quick recall check
            </h4>
            <p className="text-base text-indigo-100 font-medium leading-relaxed mb-5">
              {recallPrompt(card)}
            </p>
            <p className="text-xs text-indigo-300/60 mb-4">
              No grading — just thinking it through helps you remember.
            </p>
            <Button
              className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              onClick={handleRecallDone}
              size="sm"
            >
              Got it ✓
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation (hidden during recall) */}
      {!showRecall && (
        <div className="flex items-center justify-between">
          <Button
            className="rounded-full text-sm text-muted-foreground transition-all duration-200 hover:scale-[1.03] hover:translate-y-[-1px] active:scale-[0.98]"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            size="sm"
            variant="ghost"
          >
            ← Back
          </Button>

          {isLast && onChooseAnother ? (
            <Button
              className="rounded-full text-sm text-muted-foreground transition-all duration-200 hover:scale-[1.03] hover:translate-y-[-1px] active:scale-[0.98]"
              onClick={onChooseAnother}
              size="sm"
              variant="ghost"
            >
              Choose another topic
            </Button>
          ) : (
            onHelp && (
              <Button
                className="rounded-full text-sm text-muted-foreground transition-all duration-200 hover:scale-[1.03] hover:translate-y-[-1px] active:scale-[0.98]"
                onClick={onHelp}
                size="sm"
                variant="ghost"
              >
                Ask Tutor 💬
              </Button>
            )
          )}

          {isLast ? (
            <Button
              className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.03] hover:translate-y-[-1px] hover:shadow-[0_0_15px_-3px_rgba(244,63,94,0.3)] active:scale-[0.98]"
              onClick={onComplete}
              size="sm"
            >
              Continue →
            </Button>
          ) : (
            <Button
              className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.03] hover:translate-y-[-1px] hover:shadow-[0_0_15px_-3px_rgba(244,63,94,0.3)] active:scale-[0.98]"
              onClick={handleNext}
              size="sm"
            >
              Next →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
