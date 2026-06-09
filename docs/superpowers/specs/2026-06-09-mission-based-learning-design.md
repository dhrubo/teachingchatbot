# Mission-Based Learning Experience

**Date:** 2026-06-09
**Status:** Design Approved
**Applies to:** TeachingChatbot

## Overview

Transform TeachingChatbot from a chat-centric experience into a mission-based
learning adventure. The AI tutor becomes a guide; the mission system becomes the
product. The feel should be closer to Duolingo/Khan Academy/Brilliant and less
like a generic chatbot.

## Architecture

### Approach: Chat-First Mission Orchestration (Chosen)

The existing `useChat`/`streamText` infrastructure is kept as the base layer. A
new `MissionOrchestrator` component wraps the chat in a mission flow state
machine. The chat engine runs underneath but is hidden during concept card and
challenge mode phases. A HELP_CHAT state surfaces the chat when the student
asks for help.

### Component Tree

```
App Layout
├── Sidebar (unchanged)
├── ChatShell
│   ├── MissionOrchestrator (NEW)
│   │   ├── MissionHeader (progress, mission name, exit)
│   │   ├── LessonPhase (LLM teaching + cards)
│   │   │   ├── Chat messages (hidden when not in lesson)
│   │   │   └── ConceptCardSlides (NEW — pre-authored, no LLM)
│   │   ├── ChallengeGate ("Ready for Challenge Mode?")
│   │   └── ChallengeMode (NEW — full-screen overlay)
│   └── MultimodalInput (hidden during ChallengeMode)
├── HomePage (redesigned — hero + mission map + how it works)
├── ParentDashboard (NEW — route: /parent/dashboard)
├── TopicSelectScreen / TopicEntryOverlay → simplified/removed
```

### Mission State Machine

```
HOME → SELECT MISSION → INTRO → LESSON → CARDS → GATE → CHALLENGE → RESULTS → COMPLETE
                                                  ↕
                                               HELP_CHAT
```

States:
- **HOME** — Hero + mission map. Guest: random "Today's Mission". Logged-in: "Continue Mission".
- **SELECT MISSION** — Tap a mission node on the map.
- **INTRO** — Short mission intro (title, goals, estimated time). "Start →" button.
- **LESSON** — LLM teaches via `useChat` stream. Chat messages visible.
- **CARDS** — 3+ pre-authored concept cards as a slide deck. No LLM call.
- **GATE** — "Ready for Challenge Mode?" with "I'm ready 🚀" / "Explain more 🔄".
- **CHALLENGE** — Full-screen overlay. Questions 1/5, 2/5... LLM generates via emitChallengeBundle.
- **RESULTS** — Score screen: stars, score, review mistakes, continue buttons.
- **COMPLETE** — Mission marked done in DB. Return to mission map.
- **HELP_CHAT** — Available from CARDS/GATE/CHALLENGE. Opens chat overlay. Student returns after.

### Key Design Decisions

1. **Mission wrapper around topics** — both exist. Missions are the student-facing
   layer; topics are the data/progress layer underneath.
2. **Concept cards are pre-authored** — no LLM call. Stored in `lib/ai/missions.ts`.
3. **Challenge mode = full-screen overlay** — not inline. Chat input hidden.
4. **Scoring/grading is client-side** — no LLM calls for XP, streaks, or results.
5. **Help chat uses existing chat flow** — same `useChat`/`streamText` infra.

## Data Model

### Mission Definitions (`lib/ai/missions.ts`)

```typescript
interface ConceptCard {
  id: string;
  title: string;        // "Percent means out of 100"
  visual: string;       // "25% = 25/100 = 0.25"
  example: string;      // "75% = 75 out of every 100"
  explanation: string;  // max 50 words
}

interface MissionDefinition {
  id: string;                    // "missions/percentages"
  title: string;                 // "Percentages"
  yearGroup: "8" | "9";
  emoji: string;                 // "💯"
  description: string;
  estimatedMinutes: number;
  topics: string[];              // FK to curriculum topic names
  conceptCards: ConceptCard[];   // 3+ cards, pre-authored
  prerequisiteMissionIds: string[];
  gcseDomain: string;
}
```

### MissionProgress (New DB Table)

```typescript
// Composite key: (studentId, missionId)
studentId:       uuid       FK → StudentProfile.id
missionId:       text       "missions/percentages"
status:          enum       not_started | in_progress | completed | mastered
phase:           enum       intro | lesson | cards | challenge | results
score:           int        0-5
challengesDone:  int        0-N
challengesTotal: int        N
conceptCardsViewed: int     0-3+
lastLessonAt:    timestamp
completedAt:     timestamp
```

### Existing Tables (Unchanged)

- `TopicProgress` — kept. Missions reference topics; topic-level tracking works underneath.
- `StudentProfile` — kept. XP/streak/badges stay for logged-in users. Guest UI hides them.
- `StudentGoal` — kept. Goals can reference mission IDs.
- `Chat` / `Message_v2` — kept. Chat history persists for logged-in users.

## Homepage Design

### Layout (scrollable, dark gradient background)

1. **Sign in / Sign up** buttons (top-right, guest only)
2. **Hero section** — mascot + "Learn Maths Without Feeling Stuck" + subheading
3. **"What is this?"** section — explains SARA as a smart maths coach with bullet points: short visual explanations, concept cards, challenge mode, progress tracking
4. **Year 8 / Year 9 toggle** (pill style)
5. **Today's Mission** card — prominent. Guest: random mission. Logged-in: Continue Mission with progress
6. **Mission Map** — visual journey with numbered nodes connected by a path line. Current mission highlighted (glowing/sunset). Completed ones ticked. Locked ones dimmed
7. **How It Works** — 2×2 grid: Learn → Practise → Challenge → Master, each with icon + description
8. **What You'll Learn** — list of topics with icon, name, and brief topic description (e.g. "Increase, decrease, reverse percentages, and decimal conversions")

### Color Scheme

Uses existing Tailwind dark theme classes throughout. No hardcoded colors:
- Background: `bg-background`, `bg-card`, `bg-sidebar` and gradients where appropriate
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`
- Borders: `border-border`, `border-border/50`
- Accent: `bg-[image:var(--gradient-sunset)]` for CTAs

## Concept Card Slides (Phase A)

### Component: `ConceptCardSlides`

- Appears after the LLM lesson phase
- Shows pre-authored concept cards one at a time
- Progress dots at top (current card highlighted/accented)
- Each card shows: title, visual (formatted math or diagram), explanation text
- Navigation: "← Back" / "Next →" buttons
- After last card: transition to ChallengeGate
- **Zero LLM calls** during card phase

### Card Format

```
Title: "Useful benchmark percentages"
Visual: "50% = ½   25% = ¼   10% = ⅒   1% = 1/100"
Explanation: "Knowing these benchmark percentages makes mental maths much faster."
```

### Gate Transition

After all cards viewed:
```
Ready for Challenge Mode?
5 questions to test what you've learned
[Explain more 🔄]  [I'm ready 🚀]
```

- "I'm ready" → opens Challenge Mode overlay
- "Explain more" → triggers LLM reteach

## Challenge Mode Overlay (Phase B)

### Component: `ChallengeMode`

- Full-screen overlay, takes over entire viewport
- Chat input hidden behind overlay
- Top bar: "Question N of M" | score tracker | exit button
- Progress bar (full width)
- Question card (centered, prominent)
- Answer options (2×2 grid for MC, text input for short_answer)
- "Ask Tutor 💬" button (always visible, opens chat panel)
- Exit → confirm dialog → return to mission map

### Behavior

- One question at a time, advance locally (no LLM call between questions)
- Correct answer: instant green feedback, advance
- Wrong answer: explanation shown, advance
- Results calculated client-side after all questions answered
- Help chat: small overlay panel, student types, LLM responds, returns to challenge

### Results Screen (Phase C)

- "Mission Complete!" header
- Star rating (⭐⭐⭐⭐☆)
- Score: "4 / 5"
- Stats: "Correct: 4 • Wrong: 1 • Accuracy: 80%"
- Buttons: "Review mistakes" | "Continue learning →"
- No XP/streak/badges shown here (appear on mission map after)

## Guest Mode

### Random Mission Selection

- Pool of ~10 missions spanning Year 8 and Year 9
- Pick is deterministic per date (hash of date string)
- Guest sees "Today's Mission" card, not "Continue Mission"

### No Gamification

- XP: hidden entirely for guests
- Streaks: hidden
- Badges: hidden
- `PlayerStats` component not rendered for guest sessions

### Rate Limit

- 5 answered challenge questions per day
- Counter resets daily
- After limit: wall screen with "You've used today's free questions. Come back tomorrow, or create an account."
- LLM not called after limit is reached
- Existing `getMessageCountByUserId` / `getEntitlements` can be adapted

### Session Limits

- 1 conversation per session
- Guest history not listed (sidebar hidden for guests — already implemented)
- 24-hour retention (already implemented)

## Prompt Changes

### Current → New

| Section | Current (~550 lines) | New (~200 lines) |
|---------|---------------------|------------------|
| ROLE | "Teach then emitChallengeBundle" | "You teach. Mission system handles flow." |
| Topic threads | ~60 lines | Removed (MissionOrchestrator handles it) |
| UI narration | ~40 lines | Simplified: "Don't narrate UI" |
| Challenge bundles | ~30 lines | Keep ~15 lines |
| Brevity rules | ~50 lines | Keep ~30 lines |
| Reteaching | ~40 lines | Keep ~30 lines |
| Curriculum | ~60 lines inlined | Removed (tool-retrievable) |

### What the Tutor No Longer Manages

- Topic thread management
- Topic switching rules
- Readiness gates
- In-session progress tracking
- Empty turn protection (mission flow ensures visible content)
- Curriculum listing (tool-call retrievable)

## Parent Dashboard

### Route: `/parent/dashboard`

- Accessible to accounts with `role: "parent"` or users with children linked
- Shows mission progress per student (student selector if multiple children)
- **Metrics shown:** Current mission with progress %, completed count, in-progress count, struggling count, mastered count
- **Metrics NOT shown as primary:** Raw XP, streak numbers, badges
- Mission list with status badges and progress bars per mission
- Recommended next mission based on curriculum prerequisites
- V1 scope: basic dashboard route, read-only. No report generation or email summaries.

## AI Usage Optimization

### What the LLM is Called For

- Lesson generation (teaching text)
- Challenge generation (`emitChallengeBundle`)
- Reteaching ("Explain differently")
- Help chat responses

### What the LLM is NOT Called For

- XP, streaks, badges (client-side)
- Progress bars (client-side)
- Mission completion state (client-side)
- Challenge scoring (client-side, local grading)
- Challenge results screen (client-side)
- Lesson navigation/state machine (client-side)
- Concept cards (pre-authored static data)

## File Changes Summary

### New Files

- `lib/ai/missions.ts` — Mission definitions + concept card data
- `lib/ai/guest-mission.ts` — Random guest mission selection
- `lib/db/queries/mission.ts` — MissionProgress CRUD queries
- `components/chat/mission-orchestrator.tsx` — Mission state machine wrapper
- `components/chat/mission-header.tsx` — Mission progress header
- `components/chat/concept-card-slides.tsx` — Concept card slide deck
- `components/chat/challenge-mode.tsx` — Full-screen challenge overlay
- `components/chat/challenge-results.tsx` — Results screen
- `components/chat/mission-map.tsx` — Visual mission journey component
- `app/(parent)/dashboard/page.tsx` — Parent dashboard route
- `lib/db/migrations/0004_add_mission_progress.sql` — Migration

### Modified Files

- `components/chat/sara-dashboard.tsx` — Rewritten as landing page (hero + map + how it works)
- `components/chat/shell.tsx` — Add `MissionOrchestrator` wrapper
- `components/chat/answer-panel.tsx` — Simplified (only used for non-challenge questions)
- `components/chat/topic-entry-overlay.tsx` — Removed (replaced by mission INTRO screen)
- `hooks/use-active-chat.tsx` — Mission state added alongside chat state
- `lib/ai/prompts-tutor.ts` — Simplified prompt (~200 lines)
- `lib/db/schema.ts` — Add `MissionProgress` table
- `app/(chat)/api/chat/route.ts` — No major change (tools same, prompt changes only)

## Out of Scope (V1)

- Parent report generation / email summaries
- Syllabus upload and test paper analysis
- Science curriculum extension
- Guest XP calculation (guest mode intentionally skips gamification)

## Future Considerations

- `LessonSummary` DB table for caching LLM lesson text (v2 optimization)
- Achievement/trophy system tied to mission completion (v2)
- Animated mission map with unlock animations (v2)
- Mobile-specific challenge mode optimizations (v2)
