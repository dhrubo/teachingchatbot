"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConceptCard } from "@/lib/ai/missions";
import { cn } from "@/lib/utils";

type ConceptCardSlidesProps = {
  cards: ConceptCard[];
  // Reached the end of this card batch → show the lesson footer choices.
  onComplete: () => void;
  // Leave the lesson and pick a different topic.
  onChooseAnother?: () => void;
  // Fired once per distinct card the student actually reaches — feeds the
  // MIN_CONCEPT_CARDS_BEFORE_CHALLENGE gate.
  onCardSeen?: () => void;
  onBack?: () => void;
  onHelp?: () => void;
};

export function ConceptCardSlides({
  cards,
  onComplete,
  onChooseAnother,
  onCardSeen,
  onHelp,
}: ConceptCardSlidesProps) {
  const [index, setIndex] = useState(0);
  const card = cards[index];
  const isLast = index >= cards.length - 1;

  // Report each newly-reached card exactly once.
  const seenRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (cards.length > 0 && !seenRef.current.has(index)) {
      seenRef.current.add(index);
      onCardSeen?.();
    }
  }, [index, cards.length, onCardSeen]);

  if (!card) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
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

      {/* Card */}
      <AnimatePresence mode="wait">
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
      </AnimatePresence>

      {/* Navigation */}
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
            onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}
            size="sm"
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}
