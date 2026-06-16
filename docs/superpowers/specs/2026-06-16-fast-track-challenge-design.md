# Design Spec: Fast-Track Challenge & Open Lessons API

This document details the implementation of guest-access to public educational curriculum and a "Fast-Track" direct challenge mode on the SARA student dashboard.

## 1. Context & Motivation

1. **Guest-Access Compatibility:** SARA allows conversational guest onboarding. Currently, the static curriculum API `/api/lessons` has a strict session requirement that prevents unauthenticated or guest users from loading concept cards or list missions, leaving the dashboard empty or breaking guest onboarding flow. Since this endpoint contains only public Year 8 and Year 9 educational maths and science curriculum (no private personal details), removing this strict check is perfectly secure.
2. **"Fast-Track" Quiz Mode:** Some students are ready to test their understanding immediately without clicking through the multiple educational concept cards first. Providing an option to jump directly into the 5-question adaptive assessment ("Challenge Mode") makes the app highly gamified and responsive.

## 2. Proposed Changes

### A. Removing Session Check on `/api/lessons`
**File:** `app/(chat)/api/lessons/route.ts`
- Remove the strict `auth()` session check at the top of the `GET` handler.
- Maintain error-handling and data integrity of queries.

### B. Student Dashboard "Fast-Track" Actions
**File:** `components/chat/sara-dashboard.tsx`
- **Context Integration:** Import and invoke `useMission` to access `fastTrackChallenge` and `isInMission`.
- **Direct Quiz Handler:**
  Add an asynchronous handler `startMissionDirectQuiz(mission)` that calls `startTopic` (which loads the cards/sets up the mission state from the DB) and immediately triggers `fastTrackChallenge()` to bypass cards and activate the challenge phase directly:
  ```typescript
  async function startMissionDirectQuiz(mission: { id: string; title: string; emoji: string }) {
    await startTopic({ id: mission.id, title: mission.title, emoji: mission.emoji });
    fastTrackChallenge();
  }
  ```
- **"⚡ Fast-Track Quiz" Action on Today's Mission Card:**
  - Introduce a second button on the Daily Mission card.
  - Style with a tactile sunset amber border (`border-orange-500/30`), hover scale scale up to `[1.05]`, glow transition, and custom text.
- **Full-Width "Challenge Mode" CTA Banner:**
  - Positioned above the circular **Topic Map**.
  - **Title:** `"🏆 Challenge Mode: Year {year} {subject}"`
  - **Sub-description:** `"Skip the cards and test your secure understanding with a 5-question adaptive quiz immediately! 🚀"`
  - **Action:** Triggers `startMissionDirectQuiz(todayMission)`.
  - **Style:** Premium royal violet glass backdrop, glowing violet shadow (`shadow-[0_0_30px_rgba(124,58,237,0.15)]`), border highlights, and interactive hover shifts.

## 3. Verification & Safety

- Run type checking: `npx tsc --noEmit`
- Run unit test suite: `pnpm test:unit`
