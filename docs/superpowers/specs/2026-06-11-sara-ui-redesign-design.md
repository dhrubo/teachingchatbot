# Design Specification: SARA UI/UX Redesign

SARA is an AI-powered Year 8/9 GCSE maths learning app. This document defines the engineering and design choices to transform SARA's interface into a premium, gamified learning product matching a glassmorphic indigo-sunset theme.

---

## 1. Product & Brand Identity

- **Visual Style:** Deep indigo base (`#090915`, `oklch(0.12 0.05 285)`), translucent glassmorphism panels with soft purple/violet glows, and warm sunset amber/coral buttons (`linear-gradient(from orange-500 to violet-500)`).
- **Core Experience Flow:**
  `Choose Topic` → `Learn with Concept Cards` → `Start Challenge Mode` → `Answer Adaptive Questions` → `Review Mistakes` → `Continue Learning`.
- **Target Aesthetic:** High-polish, dark-mode-first learning adventure. Inspired by Brilliant and Duolingo. Extremely clean, readable math elements using LaTeX/KaTeX.

---

## 2. Core Layout & Shell Redesign (`components/chat/shell.tsx`)

- **Centralized Product Layout:** Transition the main shell from a traditional message-thread sidebar-split view into a centered, focus-oriented layout wrapper.
- **Translucent Glassmorphism Panels:** Apply translucent glass panels (`bg-indigo-950/40 backdrop-blur-md border border-indigo-800/30`) to active learning and dashboard panels.
- **Hiding Message Thread on Active Missions:** When the student is actively viewing cards, participating in Challenge Mode, or reviewing mistakes, suppress the standard AI chat log, rendering the focused lesson or challenge interface instead.

---

## 3. Top Navigation (`components/chat/chat-header.tsx`)

- **Accountability & Actions:**
  - SARA Logo and icon center-left. Clicking it triggers `exitMission()` to reset the mission UI state and navigates back to `/` (preserving chat records, XP, and state in the database).
  - Clear, prominent Year 8 / Year 9 switcher inside a pill-toggle structure.
  - Quick-access "Choose a Topic" button triggers the popover menu of curriculum topics.
  - Sound effect mute toggle (Web Audio API driven) and registration/auth buttons grouped neatly on the right.

---

## 4. Homepage & Journey Path (`components/chat/sara-dashboard.tsx`)

- **Interactive Duolingo-style Vertical Path:**
  - Convert the homepage from standard grids into a vertical trail of learning milestone nodes representing Year 8/9 missions.
  - **Node States:**
    - *Completed Missions:* Render as green circular badges containing a checkmark (`✓`), carrying a soft glow.
    - *Active/Unlocked Missions:* Scaled larger, rendered in glowing orange-to-violet sunset gradient, pulsing gently (`animate-pulse`/`animate-float`).
    - *Locked Missions:* Translucent grey with a lock icon, preventing clicks.
  - **Syllabus Paste Box:** Keep the premium `/api/match-topics` paste input box directly beneath the hero section to let parents/kids match their school curriculum.
  - **Player Stats:** Surface XP streaks and level metrics for logged-in students; hide for guest sessions.

---

## 5. Concept Card Carousel (`components/chat/concept-card-slides.tsx`)

- **Refined Slide Interface:**
  - Center each slide inside a gorgeous glassmorphic panel (`bg-indigo-950/50 backdrop-blur-md border border-violet-500/20 shadow-lg shadow-violet-500/10`).
  - Render the concept visual in a large monospaced box with electric purple or amber highlight fonts and KaTeX syntax.
  - Visual back-and-next dots with smooth transition states.
  - **Card Footer controls:** Expose three clean, styled pill button options after the 3rd card has been seen:
    1. *Continue Learning:* Progresses cards/batches (if more cards are available).
    2. *Start Challenge Mode:* Graded challenge initiation.
    3. *Choose another topic:* Returns back to dashboard.

---

## 6. Fullscreen Challenge Mode (`components/chat/challenge-mode.tsx`)

- **Challenge Engine Visuals:**
  - Full-screen distraction-free layout (hiding all navigation, sidebars, and chat logs).
  - High-polish progress bar animating smoothly across 5 questions.
  - Rounded, translucent answer options that illuminate instantly (positive coral pulse on correct answer, gentle shake animation on wrong answer).
  - Celebration Results card detailing "Strong Skills" and "Needs Practice" using real-time database skill mastery.

---

## 7. First-Class Review Mistakes Mode (`components/chat/review-mistakes-screen.tsx`)

- **Mistake Interface:**
  - High-fidelity mistake panel detailing question, student answer (struck-through), correct worked explanation, and common misconceptions.
  - Prev / Next button interface with primary CTAs: "Retry Similar Question", "Continue Learning", or "Choose Another Topic".

---

## 8. Manual QA Verification Checklist

1. Click logo from any active lesson/challenge view → instantly resets mission view, returns back to homepage, preserving progress.
2. Select Year 8/9 toggle → Journey path nodes update.
3. Syllabus matcher → pastes a list, matches topics, creates Start CTAs.
4. Concept card transitions → Arrow navigates, dot moves, "Explain differently" reteaches.
5. Challenge mode answers → Instant pop/shake animations with sound feedback.
6. Finished challenge → Results screen with Skills breakdown.
7. Review mistakes → View carded mistakes with worked methods.
8. Guest Mode check → No badges/streak stats shown on home.
