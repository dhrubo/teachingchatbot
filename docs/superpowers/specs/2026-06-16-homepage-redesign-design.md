# Homepage Redesign: GCSE Tutor & Quiz Master

**Date:** 2026-06-16
**Status:** Design — approved

## 1. Goal

Redesign the SARA homepage (`sara-dashboard.tsx`) from a maths-specific landing page to a **subject-agnostic GCSE tutor and quiz master** that dynamically adapts to every subject in the database.

## 2. Key Changes

### 2.1 Hero Copy

- **Before:** "Learn Maths Without Feeling Stuck" + "SARA is your AI maths coach"
- **After:** "Your GCSE Tutor & Quiz Master" + "SARA adapts to your syllabus — every subject, one lesson at a time."

### 2.2 Full-Width Search Box

The "paste your topics" box (currently `TopicPasteBox`) moves from the left column of a 2-col grid to a **full-width section** at the top of the page, directly under the hero.

- Container: rounded-2xl border, glass panel
- Textarea: full width, min-height: 88px, resize-y
- Button: "Find my topics" aligned right

### 2.3 "What is SARA?" Moved Underneath

Currently in the right column of the 2-col grid. Moves to a **full-width section below the search box**.

- Compact horizontal layout on desktop: 4 items in a row (📖 Short visual lessons, 🎯 Concept cards, ⚡ Quiz challenges, 📊 Progress tracking)
- Wraps flexibly on mobile

### 2.4 Subject Tabs (Dynamic from DB)

**Replaces** the current 2-card subject selector (GCSE Maths / GCSE Science) with a **horizontal tab bar** that dynamically shows every subject that has missions in the `Mission` table.

- **Data source:** Fetched from `/api/lessons?year=8` — collect unique `subject` values from the response
- **Desktop:** Underlined tab bar with subject emoji + "GCSE {Subject}" label
- **Mobile:** Scrollable pill-style chips (`overflow-x: auto`, `white-space: nowrap`, `-webkit-overflow-scrolling: touch`)
- **Emoji per subject:** Defined in a lookup map (maths: 📐, science: 🧪, geography: 🌍, default: 📖)
- **Active tab:** Orange underline/glow matching the sunset theme
- **Year 8/9 toggle:** Placed inside the active tab area (was beside "What is SARA?")

### 2.5 Quiz Buttons Per Topic

Every topic under the active subject tab gets a **"Quiz ⚡"** button that triggers `startMissionDirectQuiz` (fast-track 5-question adaptive challenge, bypassing concept cards).

- **Desktop:** Topics in a 2-column grid, each row has a title on the left and "Quiz ⚡" on the right
- **Mobile:** Topics in a 1-column list, same layout
- The "Start →" / "Continue →" button remains alongside the quiz button for the full lesson path

### 2.6 Year Toggle Per Subject

The Year 8/Year 9 toggle currently lives inside the "What is SARA?" card (right column). It moves to the **active subject tab area** as a secondary toggle below the tabs. The toggle only shows years that have missions for the active subject (derived from `yearGroups` in the subjects endpoint).

- Desktop: pills below the tab bar
- Mobile: abbreviated pills (Y8/Y9)
- Disabled years (no content) are greyed out or hidden

## 3. Responsive Behaviour

| Element | Desktop (≥768px) | Mobile (320–767px) |
|---|---|---|
| Hero | 30px font, multi-line | 16px font, tighter leading |
| Search box | Full width | Full width (same) |
| What is SARA? | Horizontal row, 4 items side-by-side | Compact wrap, smaller text |
| Subject tabs | Horizontal bar, underlined active tab | Scrollable pill chips |
| Year toggle | Y8/Y9 pills | Y8/Y9 pills (same) |
| Topic grid | 2 columns | 1 column |

## 4. Data Flow

1. `SaraDashboard` fetches `GET /api/lessons?year=8&subject=maths` via SWR (existing)
2. On mount (and year change), also fetch unique subjects: `GET /api/lessons/subjects` (new endpoint) — or derive from the existing `/api/lessons?year=N` responses
3. User clicks a subject tab → `setSubject(slug)`, SWR re-fetches missions for that subject
4. Each mission/topic renders with a "Quiz ⚡" button
5. Year toggle (`8`/`9`) re-fetches the active subject's missions

**New API endpoint:** `GET /api/lessons/subjects` — returns `{ subjects: [{ slug, title, yearGroups: number[] }] }` from distinct `mission.subject` values in the DB, including which year groups have missions for that subject. This lets the tab bar show only available years per subject (e.g., geography might only have Year 8).

**Flow:**
1. On mount, `SaraDashboard` fetches `GET /api/lessons/subjects` → populates subject tabs
2. Default: first subject in the list is active, first available year is selected
3. User clicks a tab → `setSubject(slug)`, the year toggle adjusts to that subject's `yearGroups`
4. SWR key: `/api/lessons?year=${year}&subject=${subject}` — re-fetches missions
5. Each returned mission renders with a "Quiz ⚡" + "Start →" button

## 5. Files Changed

| File | Change |
|---|---|
| `components/chat/sara-dashboard.tsx` | Full rewrite of layout sections (hero, search, SARA, tabs, topics, quiz) |
| `components/chat/topic-paste-box.tsx` | May need minor styling adjustments for full-width context |
| `app/(chat)/api/lessons/route.ts` | Add `GET /api/lessons/subjects` route |
| `components/chat/topic-picker.tsx` | Already has subject support — no changes needed |

## 6. Edge Cases

- **No subjects in DB:** Show a friendly "No subjects available yet" message
- **Single subject:** Tab bar shows just one tab (no horizontal scroll on mobile)
- **Many subjects (5+):** Tabs wrap on desktop, scroll on mobile
- **Subject with no topics:** Show empty state within the tab
- **Guest users:** Same layout, subjects derived from available data
- **Year 8 vs Year 9 subject availability:** If a subject exists in Y8 but not Y9 (e.g., geography currently), the tab shows with only Y8 active
