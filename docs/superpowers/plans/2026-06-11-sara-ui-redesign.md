# SARA UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign SARA's site layout, homepage journey, concept cards, and screen states to feel like a premium, polished glassmorphic learning product.

**Architecture:** Transition SARA from a generic chat/thread-style structure to a centralized, centered product layout. Homepage renders a gamified vertical path of lesson nodes (Duolingo-style). Active missions run within a centered, translucent glassmorphic workspace layout. Fullscreen challenge mode and mistake review are treated as first-class, distraction-free screens.

**Tech Stack:** Next.js (App Router), React 19, Tailwind CSS v4, Framer Motion, Lucide icons, KaTeX.

---

### Task 1: Redesign Shell Layout & Translucent Panels

**Files:**
- Modify: `components/chat/shell.tsx`

- [ ] **Step 1: Update ChatShell to center active screens and add glassmorphism backgrounds**

Modify the left panel and learning view in `components/chat/shell.tsx` to use deep dark-mode borders and a centered, glassmorphic layout.

```tsx
// Find the left-hand panel rendering section around line 140:
<div
  className={cn(
    "relative flex min-w-0 flex-col bg-slate-950/80 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] border-r border-indigo-950/40",
    isArtifactVisible ? "w-[40%]" : "w-full"
  )}
>
```

Update loading, cards, gate, and results containers to use deep glass styling:
```tsx
// Inside Concept Cards branch (around line 171)
<div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-[#090915]/95 pt-8 backdrop-blur-md">
  <div className="w-full max-w-2xl px-4">
```

- [ ] **Step 2: Run build to verify type safety**

Run: `pnpm build`
Expected: Successful build with no TS errors.

- [ ] **Step 3: Commit**

```bash
git add components/chat/shell.tsx
git commit -m "style: apply centered glassmorphism layouts to chat shell"
```

---

### Task 2: Redesign Top Navigation & Year Switcher

**Files:**
- Modify: `components/chat/chat-header.tsx`

- [ ] **Step 1: Redesign header for SARA branding and layout actions**

Modify `components/chat/chat-header.tsx` to style the Year 8 / 9 switch, Logo behavior, and Topic Picker button.

```tsx
// Update the header container (around line 68):
<header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-indigo-950/40 bg-[#090915]/80 px-4 backdrop-blur-md">
```

- [ ] **Step 2: Verify linting of modified header**

Run: `npx tsc --noEmit`
Expected: Clean output.

- [ ] **Step 3: Commit**

```bash
git add components/chat/chat-header.tsx
git commit -m "style: polish top nav header and branding integration"
```

---

### Task 3: Redesign Homepage into a Duolingo-style Vertical Path

**Files:**
- Modify: `components/chat/sara-dashboard.tsx`
- Modify: `components/chat/mission-map.tsx`

- [ ] **Step 1: Replace traditional map with an interactive vertical path of mission nodes**

In `components/chat/mission-map.tsx` or `components/chat/sara-dashboard.tsx`, render the available missions as a vertical snake path. Active missions pulse with amber glows, completed show checks, locked are disabled and dark.

Example Node Layout:
```tsx
const isCompleted = completedMissions.includes(mission.id);
const isActive = currentMissionId === mission.id || (!currentMissionId && index === 0);
const isLocked = !isCompleted && !isActive;

return (
  <div className="flex flex-col items-center my-4" key={mission.id}>
    <button
      className={cn(
        "size-14 rounded-full flex items-center justify-center text-xl font-bold border-4 transition-all duration-300",
        isCompleted
          ? "bg-emerald-500 border-emerald-800 text-white shadow-lg shadow-emerald-500/20"
          : isActive
            ? "bg-gradient-to-r from-orange-500 to-violet-500 border-orange-300 text-white shadow-xl shadow-orange-500/30 animate-pulse scale-110"
            : "bg-[#1f1f3a] border-indigo-900 text-muted-foreground/60 cursor-not-allowed opacity-50"
      )}
      disabled={isLocked}
      onClick={() => onSelect(mission)}
    >
      {isCompleted ? "✓" : mission.emoji}
    </button>
    <span className={cn("text-xs mt-2 font-medium", isActive ? "text-white font-bold" : "text-muted-foreground")}>
      {mission.title}
    </span>
  </div>
);
```

- [ ] **Step 2: Run tests to verify logic matches**

Run: `pnpm test:unit`
Expected: 104/104 tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/chat/sara-dashboard.tsx components/chat/mission-map.tsx
git commit -m "feat: implement interactive Duolingo-style vertical path on homepage"
```

---

### Task 4: Redesign Concept Cards Presentation & Control Footers

**Files:**
- Modify: `components/chat/concept-card-slides.tsx`

- [ ] **Step 1: Redesign slide panel style and controls**

Modify `components/chat/concept-card-slides.tsx` to render the cards in a gorgeously polished translucent Indigo panel with clean borders, sunset action buttons, and large math visual boxes.

```tsx
// Inside ConceptCardSlides component
<motion.div
  className="rounded-2xl border border-violet-500/25 bg-indigo-950/40 p-8 shadow-xl shadow-violet-500/5 backdrop-blur-md"
  key={card.id}
>
  <span className="text-[10px] font-bold tracking-widest text-orange-400 uppercase bg-orange-500/10 px-3 py-1 rounded-full">
    Concept {index + 1} of {cards.length}
  </span>
  <h3 className="mt-4 text-xl font-extrabold text-white">{card.title}</h3>
  <div className="my-5 rounded-xl border border-indigo-500/20 bg-indigo-950/80 p-5 text-center font-mono text-xl font-bold text-violet-400">
    {card.visual}
  </div>
  {card.example && (
    <div className="mb-4 rounded-lg border-l-4 border-orange-500 bg-white/5 px-4 py-3 text-sm text-slate-300">
      <strong className="text-white">Example: </strong>{card.example}
    </div>
  )}
  <p className="text-sm leading-relaxed text-slate-300">{card.explanation}</p>
</motion.div>
```

- [ ] **Step 2: Verify type safety and component builds**

Run: `npx tsc --noEmit`
Expected: Build passes with no type errors.

- [ ] **Step 3: Commit**

```bash
git add components/chat/concept-card-slides.tsx
git commit -m "style: overhaul concept cards carousel UI and sunset button controls"
```

---

### Task 5: Redesign Challenge Mode & Results Screens

**Files:**
- Modify: `components/chat/challenge-mode.tsx`
- Modify: `components/chat/challenge-results.tsx`

- [ ] **Step 1: Enhance visual feedbacks inside ChallengeMode**

Modify the buttons and progress display in `components/chat/challenge-mode.tsx` to glow or scale on correct answer selection, and gently shake or highlight on wrong selections. Show dynamic, large progress indicators.

- [ ] **Step 2: Update Results screen to celebrate and display strengths and weaknesses**

Apply sunset gradients, badge celebrations, and a list of "Strong Skills" and "Needs Practice" categories inside `components/chat/challenge-results.tsx`.

- [ ] **Step 3: Run the tests**

Run: `pnpm test:unit`
Expected: 104/104 tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/chat/challenge-mode.tsx components/chat/challenge-results.tsx
git commit -m "style: redesign Challenge Mode elements and results celebration views"
```

---

### Task 6: Redesign Review Mistakes Screen

**Files:**
- Modify: `components/chat/review-mistakes-screen.tsx`

- [ ] **Step 1: Redesign mistakes layout as premium mistake card decks**

Update `components/chat/review-mistakes-screen.tsx` to render each mistake on a beautifully formatted card showing the question, the student's crossed-out mistake, the correct simplified math formula, and direct action CTAs (Retry Similar, Explain Differently).

- [ ] **Step 2: Run complete project-wide compilation checks**

Run: `pnpm build`
Expected: Next.js compilation succeeds with no type, linter, or syntax errors.

- [ ] **Step 3: Commit**

```bash
git add components/chat/review-mistakes-screen.tsx
git commit -m "style: refine review mistakes dashboard to premium card decks"
```
