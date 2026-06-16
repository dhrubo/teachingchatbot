# Fast-Track Challenge & Open Lessons API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the static lessons API to guests/public access and add a "Fast-Track Quiz" mode to SARA student dashboard.

**Architecture:** Remove strict NextAuth session checks on the read-only static `/api/lessons` endpoint. Add a direct async quiz trigger on `SaraDashboard` that awaits topic start and triggers `fastTrackChallenge()`. Insert a "Fast-Track Quiz" button on the Today's Mission card and a full-width "Challenge Mode" CTA banner above the Topic Map.

**Tech Stack:** Next.js App Router, Tailwind CSS, Framer Motion, SWR, NextAuth.

---

### Task 1: Open Lessons API to Guest Access

**Files:**
- Modify: `app/(chat)/api/lessons/route.ts`

- [ ] **Step 1: Remove auth check on GET endpoint**

Open `app/(chat)/api/lessons/route.ts` and remove the following block at the beginning of the `GET` function (around lines 11-14):
```typescript
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
```

- [ ] **Step 2: Run verification**

Run `npx tsc --noEmit` and `pnpm test:unit` to ensure no compile errors or regression.

---

### Task 2: Implement Direct Quiz Trigger and UI Elements in `SaraDashboard`

**Files:**
- Modify: `components/chat/sara-dashboard.tsx`

- [ ] **Step 1: Import context hooks and update destructured values**

Add the import for `useMission` at the top of the file:
```typescript
import { useMission } from "@/components/chat/mission-orchestrator";
```

Near line 58, inside the `SaraDashboard` component, extract `fastTrackChallenge` and `isInMission` from `useMission()`:
```typescript
  const { xpStreak, topicProgress, completedTopics } = useActiveChat();
  const startTopic = useStartTopic();
  const { fastTrackChallenge, isInMission } = useMission();
```

- [ ] **Step 2: Implement Direct Quiz Handler**

Inside the `SaraDashboard` component (e.g., above or below `startMission`), implement `startMissionDirectQuiz`:
```typescript
  async function startMissionDirectQuiz(mission: { id: string; title: string; emoji: string }) {
    await startTopic({ id: mission.id, title: mission.title, emoji: mission.emoji });
    fastTrackChallenge();
  }
```

- [ ] **Step 3: Add "⚡ Fast-Track Quiz" Button to "Today's Mission" Card**

Locate Today's Mission action buttons container:
```tsx
                  <button
                    className="w-full sm:w-auto shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-violet-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:scale-[1.05] hover:shadow-orange-500/40 active:scale-[0.95]"
                    onClick={() => startMission(todayMission)}
                    type="button"
                  >
                    {continueMission ? "Continue →" : "Start →"}
                  </button>
```

Replace/upgrade this section to render both buttons wrapped in a responsive flex row:
```tsx
                  <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 shrink-0">
                    <button
                      className="w-full sm:w-auto rounded-full border border-orange-500/30 bg-orange-500/10 px-5 py-2.5 text-xs font-extrabold text-orange-400 hover:text-white hover:bg-orange-500/20 hover:border-orange-500/50 shadow-md shadow-orange-500/5 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_15px_rgba(249,115,22,0.25)] active:scale-[0.95]"
                      onClick={() => startMissionDirectQuiz(todayMission)}
                      type="button"
                    >
                      ⚡ Fast-Track Quiz
                    </button>
                    <button
                      className="w-full sm:w-auto rounded-full bg-gradient-to-r from-orange-500 to-violet-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:scale-[1.05] hover:shadow-orange-500/40 active:scale-[0.95]"
                      onClick={() => startMission(todayMission)}
                      type="button"
                    >
                      {continueMission ? "Continue →" : "Start →"}
                    </button>
                  </div>
```

- [ ] **Step 4: Add prominent full-width Challenge Mode CTA Card**

Locate the circular **YOUR LEARNING JOURNEY** Mission Map section:
```tsx
            {/* ---- Mission Map ---- */}
            <section>
              <h2 className="mb-4 text-xs font-extrabold text-foreground/40 tracking-wider uppercase">
                YOUR LEARNING JOURNEY
              </h2>
```

Directly *above* the circular map's container header, add the prominent full-width glass banner:
```tsx
            {/* ---- Fast-Track Challenge Mode Banner ---- */}
            {todayMission && (
              <div className="mb-6 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 to-indigo-950/40 p-6 text-left relative overflow-hidden shadow-[0_0_30px_rgba(124,58,237,0.15)] backdrop-blur-md transition-all duration-300 hover:border-violet-500/50 hover:shadow-[0_0_40px_rgba(124,58,237,0.3)] hover:-translate-y-0.5">
                <div className="absolute -right-10 -bottom-10 size-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                      🏆 Challenge Mode: Year {year} {subject === "maths" ? "Maths" : "Science"}
                    </h3>
                    <p className="mt-2 text-xs text-violet-200/80 leading-relaxed max-w-xl font-medium">
                      Skip the cards and test your secure understanding with a 5-question adaptive quiz immediately! 🚀
                    </p>
                  </div>
                  <button
                    className="w-full sm:w-auto shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-300 hover:scale-[1.05] active:scale-[0.95]"
                    onClick={() => startMissionDirectQuiz(todayMission)}
                    type="button"
                  >
                    Take Quiz Now ⚡
                  </button>
                </div>
              </div>
            )}
```

---

### Task 3: Verification & Clean Build

- [ ] **Step 1: Check compilation**

Run: `npx tsc --noEmit`
Expected: Success, no type/compile errors.

- [ ] **Step 2: Run all unit tests**

Run: `pnpm test:unit`
Expected: Success, all tests pass.
