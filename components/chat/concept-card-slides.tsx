"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConceptCard } from "@/lib/ai/missions";
import { cn } from "@/lib/utils";

type ConceptCardSlidesProps = {
  cards: ConceptCard[];
  onComplete: () => void;
  // Fired once per distinct card the student actually reaches — feeds the
  // MIN_CONCEPT_CARDS_BEFORE_CHALLENGE gate.
  onCardSeen?: () => void;
  onBack?: () => void;
  onHelp?: () => void;
};

export function ConceptCardSlides({
  cards,
  onComplete,
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
                ? "w-6 bg-gradient-to-r from-primary to-primary/60"
                : i < index
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-muted-foreground/20"
            )}
            key={dot.id}
          />
        ))}
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
          exit={{ opacity: 0, x: -20 }}
          initial={{ opacity: 0, x: 20 }}
          key={card.id}
          transition={{ duration: 0.25 }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {card.title}
          </p>
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center font-mono text-lg font-semibold text-primary">
            {card.visual}
          </div>
          {card.example && (
            <div className="mb-3 rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm text-foreground/80">
              <span className="font-medium text-muted-foreground">
                Example:{" "}
              </span>
              {card.example}
            </div>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {card.explanation}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          className="rounded-full text-sm text-muted-foreground"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          size="sm"
          variant="ghost"
        >
          ← Back
        </Button>

        {onHelp && (
          <Button
            className="rounded-full text-sm text-muted-foreground"
            onClick={onHelp}
            size="sm"
            variant="ghost"
          >
            Ask Tutor 💬
          </Button>
        )}

        {isLast ? (
          <Button
            className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white shadow-lg"
            onClick={onComplete}
            size="sm"
          >
            Ready for Challenge →
          </Button>
        ) : (
          <Button
            className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white shadow-lg"
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
