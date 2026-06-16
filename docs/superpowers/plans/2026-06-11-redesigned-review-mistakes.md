# Redesigned Review Mistakes Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign and polish the SARA Review Mistakes dashboard and mistake cards with a premium glassmorphic interface, custom gradient/accent panels, smooth tactile navigation, and beautifully styled CTAs.

**Architecture:** Apply highly polished Tailwind CSS styles and glassmorphism directly to `components/chat/review-mistakes-screen.tsx`, ensuring smooth Framer Motion transitions, responsive layouts, off-white readability, and robust tactile interactions.

**Tech Stack:** React, Next.js (App Router), Tailwind CSS, Lucide Icons, Framer Motion, Radix UI (shadcn/ui).

---

### Task 1: Redesign ReviewMistakesScreen Component

**Files:**
- Modify: `components/chat/review-mistakes-screen.tsx`
- Test: Build check (`pnpm build`) and component verification.

- [ ] **Step 1: Apply glassmorphism to the base card**
  - Update the wrapper `<motion.div>` class around the active mistake (line 103) to use premium glassmorphic classes: `bg-indigo-950/45 border border-indigo-500/20 shadow-lg shadow-indigo-950/60 backdrop-blur-md rounded-2xl p-6`.

- [ ] **Step 2: Update the Question Container style**
  - Revamp the question wrapper with a translucent background, subtle border, and high-quality slate text: `border border-indigo-500/10 bg-indigo-950/30 p-4 rounded-xl mb-4`.
  - Use `text-indigo-300/70` for the label and `text-slate-100` for the prompt text to ensure high legibility against dark backgrounds.

- [ ] **Step 3: Revamp the "Your Answer" (wrong) and "Correct Answer" (right) layouts**
  - Stylize the wrong answer card with a red warning badge, custom red gradient background (`bg-gradient-to-r from-red-500/10 to-transparent`), border (`border-red-500/20`), line-through red decoration (`line-through decoration-red-500 decoration-2 text-red-300`), and a trailing ❌ icon.
  - Stylize the correct answer card with an emerald green badge, gradient background (`bg-gradient-to-r from-emerald-500/10 to-transparent`), border (`border-emerald-500/20`), bold green/emerald text (`text-emerald-300 font-bold`), and a trailing ✅ icon.

- [ ] **Step 4: Rework the Worked Solution panel**
  - Change to a custom blue/indigo-themed layout with a solid left border accent (`border-l-4 border-l-blue-500 border border-indigo-500/10 bg-indigo-950/20 p-4 rounded-xl mb-4`).
  - Style the explanation text to be off-white (`text-slate-200` or `text-slate-300`) for premium legibility.

- [ ] **Step 5: Revamp the Misconception Tip card**
  - Style as a warm amber-coral tip callout with a custom left border (`border-l-4 border-l-amber-500 border border-amber-500/10 bg-amber-500/5 p-4 rounded-xl`).
  - Color the description to be soft warm text (`text-amber-100/90`).

- [ ] **Step 6: Style the Mistakes Navigation controls**
  - Make Next and Previous buttons feel highly tactile: add smooth pointer-lifts on hover, shadows, and subtle active scaling (`transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg active:scale-95 text-indigo-200 hover:text-white`).

- [ ] **Step 7: Restyle Bottom CTAs**
  - Within the `meta.map(...)` rendering, structure buttons as large rounded pills (`rounded-full h-12 px-6 text-sm`) with smooth hover translations (`hover:translate-y-[-1px]`) and premium shadows (e.g., `shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/35` for primary).

- [ ] **Step 8: Verify build and component compilation**
  - Run `pnpm build` or type checks to verify no linter, TypeScript, or syntax errors were introduced.
