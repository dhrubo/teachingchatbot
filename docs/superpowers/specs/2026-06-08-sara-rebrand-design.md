# SARA Rebrand — Design Spec

**Date:** 2026-06-08
**Status:** Approved for implementation

## Brand Identity

- **Name:** SARA — Smart AI Reasoning Assistant
- **Inspiration:** Saraswati, goddess of learning (respectful, not literal)
- **Tagline:** Learn bright. Level up.

## Design Decisions (from brainstorming)

| Decision | Choice |
|----------|--------|
| Layout approach | C — Dashboard overlays the empty chat at `/` (no routing changes) |
| Navigation | Dashboard slides out, chat slides in when mission starts |
| Mascot style | A — Minimal geometric (glowing headpiece, stylus, math symbols) |
| Color palette | A — Extended sunset (coral/amber primary + violet accents) |
| Background | B — Deep violet night |
| Mission start | A — Immediate teaching, no redundant gate overlay |
| Motion library | Framer Motion (already installed) |

## Architecture

```
/                  → SARA dashboard (replaces Greeting component)
/chat/[id]         → existing chat view (unchanged)
```

- The SARA dashboard renders in place of the current `Greeting` component when no messages exist yet.
- Logged-in redirect to last chat (`/chat/{id}`) still works on page load.
- When a student picks a mission, the dashboard fades/slides out and the chat UI appears (no URL change for new chats).
- Existing chat flow (messages, answer panel, input, bundles, XP) is completely untouched.

### Data Flow

The dashboard reads player data from `ActiveChatContext` (same context the rest of the app uses):

| Field | Context source | Default (guest/no data) |
|-------|---------------|------------------------|
| XP | `xpStreak.xp` | 0 |
| Streak | `xpStreak.streak` | 0 |
| Level | `xpStreak.level` | 1 |
| Badges | `xpStreak.badges.length` | 0 |
| Topic progress | `topicProgress` (map of topic → progress) | null |

The dashboard renders inside `ChatShell` wrapped in `ActiveChatProvider`, so `useActiveChat()` is available.

### Dashboard → Chat Transition

When a mission/topic is clicked:
1. The card click handler calls `sendMessage(topicPrompt)` (same as current suggested-actions chip)
2. This adds a user message and triggers the AI response stream
3. The dashboard component listens for `messages.length > 0` and hides/animateOut using Framer Motion's `AnimatePresence`
4. The messages + answer panel appear as the stream starts
5. No URL change, no routing, no gate overlay

Implementation: the dashboard checks `messages.length === 0 && status !== "submitted" && status !== "streaming"` to decide whether to show itself.

## Components to Create / Modify

### New: `components/brand/sara-mascot.tsx`

Inline SVG component for the SARA mascot.

**Props:**
- `size?: number` (default 80)
- `animated?: boolean` (default true)
- `mood?: "happy" | "thinking" | "celebrating"` (default "happy")

**Visual elements (SVG):**
- Minimal geometric humanoid shape (head, torso)
- Glowing headpiece/AI halo (violet gradient circle)
- Stylus/pen in hand (veena-inspired)
- Floating math symbols nearby (π, ∑, √, %)
- Glow aura behind figure (radial gradient)
- Colors: coral (#F97316), violet (#7C3AED), amber (#FBBF24)
- No facial features — constellation-person style
- Animation: slow float (translateY oscillation)

### New: `components/brand/player-stats.tsx`

Glass card showing player metrics.

**Props:**
- `xp: number`
- `streak: number`
- `level: number`
- `badges: number`

**Layout:** 4-column row with glassmorphism stat blocks.
- Each block: emoji icon, value (large), label (small)
- Background: `rgba(255,255,255,0.06)` with backdrop blur
- Subtle hover lift animation

### New: `components/brand/mission-card.tsx`

Today's featured mission card.

**Props:**
- `title: string`
- `emoji: string`
- `description: string`
- `progressPercent: number` (0-100)
- `onClick: () => void`

**Layout:**
- Horizontal card with emoji icon, title, description, progress bar, "Continue" button
- Glassmorphism background with amber border accent
- Soft glow animation on the progress bar

### New: `components/brand/topic-map.tsx`

Grid of mission cards for topic selection.

**Props:**
- `topics: Array<{ title: string, emoji: string, progressPercent: number, locked: boolean, onClick: () => void }>`

**Layout:**
- 3-column grid of small cards
- Each card: emoji, title, status text, mini progress bar
- Locked cards are dimmed (opacity 0.4) with lock icon
- Hover lift effect on unlocked cards

### New: `components/brand/coach-bubble.tsx`

Daily coach message from SARA.

**Props:**
- `message: string`

**Layout:**
- Horizontal bar with SARA mini icon + italic quote text
- Subtle violet tinted background

### Modify: `components/chat/greeting.tsx` → `components/chat/sara-dashboard.tsx`

Rename and replace with the new dashboard layout.

The dashboard imports and arranges: `SaraMascot`, `PlayerStats`, `MissionCard`, `TopicMap`, `CoachBubble`.

**States:**
- **Loading:** Show skeleton placeholders for stats, mission, and topics
- **Has data:** Show full dashboard with real XP/streak/badge values
- **Guest (no data):** Show empty state with "Start your first mission" prompt
- **Error fetching stats:** Show dashboard with zeros, suppress coach bubble

### Modify: `app/(chat)/layout.tsx`

No changes needed — the layout renders `ChatShell` which already conditionally shows the greeting.

### Modify: `app/(chat)/page.tsx`

No routing changes — the dashboard replaces the greeting at the same location.

### Sidebar: `components/chat/app-sidebar.tsx`

**Branding updates:**
- Replace `MessageSquareIcon` with a custom SARA mini icon (or the `SaraMascot` component with `size={24}`)
- Tooltip text: "Chatbot" → "SARA"

**FREE mode (guest users):**
- Hide `SidebarHistory` (multi-conversation history)
- Instead show:
  - SARA mini mascot at top
  - "Current mission" panel (topic name + progress bar)
  - "Free mode: 5 questions today" label
  - Sign in button

**PREMIUM / logged-in mode:**
- Keep existing sidebar history and user nav
- Update branding (icon, tooltip)

## Color Palette

### Primary (existing — keep)
- Coral: `oklch(0.66 0.19 42)` / `#F97316` (light)
- Amber: `#FBBF24`
- Cream: `#FEF3C7`

### Violet (new accent)
- Violet: `#7C3AED`
- Light violet: `#A78BFA`
- Indigo: `#4C1D95`

### Background
- Deep violet night: `#1E1B4B` → `#312E81` → `#4C1D95` (gradient)
- Cards: `rgba(255,255,255,0.05)` with `backdrop-filter: blur(12px)`
- Borders: `rgba(255,255,255,0.06)`

### Text
- Primary: white (`#FFFFFF`)
- Secondary: `rgba(255,255,255,0.6)`
- Muted: `rgba(255,255,255,0.4)`

## CSS Variables to Add

In `app/globals.css`:
```css
--color-brand-violet: #7C3AED;
--color-brand-violet-light: #A78BFA;
--color-brand-violet-dark: #4C1D95;
--gradient-sara: linear-gradient(135deg, #F97316, #7C3AED);
--gradient-sara-reverse: linear-gradient(135deg, #7C3AED, #F97316);
--glass-bg: rgba(255,255,255,0.05);
--glass-border: rgba(255,255,255,0.06);
```

## Copy Changes

| Location | Old | New |
|----------|-----|-----|
| `app/layout.tsx` metadata.title | "AI Maths Tutor Chatbot" | "SARA — Smart AI Reasoning Assistant" |
| `app/layout.tsx` metadata.description | "v0 demo tutor..." | "Learn bright. Level up. — Your AI maths coach for Year 8 & 9." |
| Greeting heading | "Hey! Ready for some maths? 👋" | "Meet SARA, your AI maths coach" |
| Greeting subtitle | "I'm your personal maths tutor..." | "Build confidence with tiny lessons, smart hints, and one challenge at a time." |
| Input placeholder | "Ask me anything maths… 🧮" | "Ask SARA anything maths… 🧮" |
| Sidebar tooltip | "Chatbot" | "SARA" |
| topic suggestions | "topics" | "missions" |
| AI prompt role | "calm, patient UK maths tutor" | "calm, patient UK maths tutor" (keep — already good) |

## SVG SaraMascot — Design

The SVG will be inlined in the component (no image files).

**Structure (from top to bottom):**
1. Glow aura — large radial gradient circle behind the figure, coral-to-violet
2. Head — simple circle/oval, no facial features
3. AI halo / headpiece — arc or ring above head, violet glow
4. Body — geometric torso shape (trapezoid or rounded rect)
5. Arm holding stylus — line with a pen tip
6. Math symbols — 3-4 floating elements (π, ∑, √, %)
7. Optional: subtle bindu/spark dot on forehead

**Animation (when `animated=true`):**
- Entire SVG: slow float (translateY -3px to +3px, 3s ease-in-out infinite)
- Math symbols: subtle independent floating (varying delays and amplitudes)
- Halo: subtle pulse opacity

**Reduced motion:** All animations disabled via `@media (prefers-reduced-motion: reduce)`.

## Chat Page — Unchanged

The following must NOT be modified:
- Messages component and message rendering
- Answer panel and challenge flow
- Topic threading and thread switching
- Progress tracking (XP, streaks, badges)
- Sound effects
- Bundle system
- Question grading
- Rate limiting
- Auth flow
- Any API routes

## Sidebar FREE Mode

Guest users see a simplified sidebar:

```
┌─────────────────┐
│ 🧠 SARA         │  ← mini mascot
│                 │
│ 🎯 Current      │
│   Percentages   │
│   ████░░ 60%    │
│                 │
│ 📊 Free mode    │
│   5 questions   │
│   today         │
│                 │
│ [Sign in ↗]     │
└─────────────────┘
```

Logged-in users see the existing history sidebar with updated SARA branding.

## Implementation Order

1. Add violet CSS variables to `globals.css`
2. Create `components/brand/sara-mascot.tsx` (inline SVG)
3. Create `components/brand/player-stats.tsx`
4. Create `components/brand/mission-card.tsx`
5. Create `components/brand/topic-map.tsx`
6. Create `components/brand/coach-bubble.tsx`
7. Rename `greeting.tsx` → `sara-dashboard.tsx` and update imports
8. Rewrite `sara-dashboard.tsx` with new layout
9. Update `app-sidebar.tsx` branding + FREE mode panel
10. Update copy in `app/layout.tsx` metadata and `multimodal-input.tsx`
11. Update sidebar tooltip
12. Test everything

## Files Changed

### New files:
- `components/brand/sara-mascot.tsx`
- `components/brand/player-stats.tsx`
- `components/brand/mission-card.tsx`
- `components/brand/topic-map.tsx`
- `components/brand/coach-bubble.tsx`

### Modified files:
- `app/globals.css` — add violet CSS variables
- `components/chat/greeting.tsx` → rename to `sara-dashboard.tsx`, rewrite
- `components/chat/app-sidebar.tsx` — branding + FREE mode panel
- `app/layout.tsx` — metadata update
- `components/chat/multimodal-input.tsx` — placeholder text
- `components/chat/shell.tsx` — update import if greeting renamed
- `components/chat/sidebar-history.tsx` — if any guest-specific changes needed

## Acceptance Criteria

- [ ] App has new SARA branding (name, tagline, metadata)
- [ ] SARA mascot (minimal geometric SVG) appears on home dashboard
- [ ] Dashboard replaces greeting when no chat active
- [ ] Dashboard shows: hero, stats, mission, topic map, coach bubble
- [ ] Deep violet night background
- [ ] Glassmorphism cards with violet/coral accents
- [ ] Clicking a mission transitions to chat (no routing change)
- [ ] Sidebar shows SARA branding
- [ ] FREE mode sidebar hides history, shows current mission panel
- [ ] Existing chat/tutor flow still works
- [ ] Existing challenge bundle flow still works
- [ ] `tsc --noEmit` clean
- [ ] `pnpm test:unit` passes
