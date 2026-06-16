# Redesign Concept Card Slides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the layout and design of the ConceptCardSlides component to match the Approved Tab 2 UI design.

**Architecture:** We will modify the client-side component `components/chat/concept-card-slides.tsx` using a hybrid of Tailwind classes and Framer Motion layout/state animations.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Framer Motion, shadcn ui (Button).

---

### Task 1: Overhaul ConceptCardSlides styling

**Files:**
- Modify: `components/chat/concept-card-slides.tsx`

- [ ] **Step 1: Apply layout refinements to `components/chat/concept-card-slides.tsx`**

We will replace the return block in `components/chat/concept-card-slides.tsx` with the following redesigned structure:

```tsx
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
```

- [ ] **Step 2: Verify compilation and tests**

Run: `pnpm test:unit` to verify existing tests are passing.
Run: `pnpm build` to verify the production build succeeds without TypeScript or compilation errors.

- [ ] **Step 3: Commit changes**

```bash
git add components/chat/concept-card-slides.tsx
git commit -m "style: redesign concept card slides & navigation controls footer"
```
