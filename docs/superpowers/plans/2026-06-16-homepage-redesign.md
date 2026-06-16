# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the SARA homepage from maths-specific to a multi-subject GCSE tutor & quiz master with dynamic subject tabs, full-width search, and quiz buttons per topic.

**Architecture:** Add a `/api/lessons/subjects` endpoint to discover available subjects from the DB, then rewrite `sara-dashboard.tsx` to use it for dynamic tabs. Subject tabs replace the 2-card selector; search box goes full-width; "What is SARA?" moves underneath; each topic gets a Quiz button.

**Tech Stack:** Next.js App Router, Drizzle ORM, SWR, Framer Motion, Tailwind CSS

---

### Task 1: Add `/api/lessons/subjects` Endpoint

**Files:**
- Modify: `app/(chat)/api/lessons/route.ts`

- [ ] **Step 1: Add the subjects query handler to the lessons route**

Add a new branch at the top of the `GET` handler in `app/(chat)/api/lessons/route.ts`, before the `yearParam` check:

```typescript
// GET /api/lessons/subjects → list distinct subjects with their year groups
if (searchParams.get("subjects") === "true") {
  const rows = await db
    .select({ subject: mission.subject, yearGroup: mission.yearGroup })
    .from(mission)
    .where(eq(mission.isActive, true))
    .groupBy(mission.subject, mission.yearGroup)
    .orderBy(asc(mission.subject));

  const subjectMap = new Map<string, { slug: string; title: string; yearGroups: number[] }>();
  for (const row of rows) {
    if (!subjectMap.has(row.subject)) {
      subjectMap.set(row.subject, {
        slug: row.subject,
        title: subjectTitle(row.subject),
        yearGroups: [],
      });
    }
    subjectMap.get(row.subject)!.yearGroups.push(row.yearGroup);
  }

  return NextResponse.json({ subjects: Array.from(subjectMap.values()) });
}
```

Add the `subjectTitle` helper function at the top of the file (after imports):

```typescript
function subjectTitle(slug: string): string {
  const titles: Record<string, string> = {
    maths: "Maths",
    science: "Science",
    geography: "Geography",
    english: "English",
  };
  return titles[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}
```

- [ ] **Step 2: Verify the endpoint works**

Run: `npx tsc --noEmit`
Expected: No type errors.

Test with the dev server running: `curl http://localhost:3000/api/lessons?subjects=true`
Expected: `{"subjects":[{"slug":"maths","title":"Maths","yearGroups":[8,9]}, ...]}`

- [ ] **Step 3: Commit**

```bash
git add app/(chat)/api/lessons/route.ts
git commit -m "feat: add /api/lessons?subjects=true endpoint for dynamic subject tabs"
```

---

### Task 2: Rewrite SaraDashboard Layout

**Files:**
- Modify: `components/chat/sara-dashboard.tsx`

This is a substantial rewrite of the dashboard's layout structure. The key changes:

1. Hero copy — subject-agnostic
2. Search box moved to full-width section
3. "What is SARA?" moved underneath, full-width
4. Subject selector cards → dynamic horizontal tab bar
5. Year toggle per active subject
6. Quiz button on every topic in the grid

- [ ] **Step 1: Update imports and add subject SWR fetch**

Add `useCallback` to the React imports, and add the subjects fetch alongside the existing missions fetch (around line 69):

```typescript
const { data: subjectsData } = useSWR(
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lessons?subjects=true`,
  fetcher,
  { revalidateOnFocus: false }
);
```

- [ ] **Step 2: Add state for active subject and derived active years**

Replace the old `subject` state initialization and add derived state for the subject's available years:

```typescript
const [subject, setSubject] = useState<string>("maths");

const subjects: { slug: string; title: string; yearGroups: number[] }[] =
  useMemo(() => subjectsData?.subjects ?? [], [subjectsData]);

const activeSubjectYearGroups = useMemo(
  () => subjects.find((s) => s.slug === subject)?.yearGroups ?? [8],
  [subjects, subject]
);

// Reset year to first available if current year isn't available for this subject
useEffect(() => {
  if (activeSubjectYearGroups.length > 0 && !activeSubjectYearGroups.includes(year)) {
    setYear(activeSubjectYearGroups[0] as 8 | 9);
  }
}, [subject, activeSubjectYearGroups, year]);
```

- [ ] **Step 3: Update the hero section**

Replace lines ~163-179:

```tsx
{/* ---- Hero Row ---- */}
<section className="text-center py-6">
  <h1 className="text-2xl font-black tracking-tight sm:text-4xl leading-tight">
    Your GCSE{" "}
    <span className="bg-gradient-to-r from-orange-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent font-black">
      Tutor & Quiz Master
    </span>
  </h1>
  <p className="mt-3 text-sm leading-relaxed text-muted-foreground/90 font-medium max-w-lg mx-auto">
    SARA adapts to your syllabus — every subject, one lesson at a time.
  </p>
</section>
```

- [ ] **Step 4: Replace the 2-col grid with full-width search + SARA section**

Replace lines ~182-253 (the old card grid, subject selector, and year toggle):

```tsx
{/* ---- Full-width Search Box ---- */}
<section className="w-full">
  <TopicPasteBox />
</section>

{/* ---- What is SARA? (full width, underneath search) ---- */}
<section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center backdrop-blur-md">
  <h2 className="text-sm font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
    What is SARA?
  </h2>
  <div className="mt-3 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground">
    <span>📖 Short visual lessons</span>
    <span>🎯 Concept cards</span>
    <span>⚡ Quiz challenges</span>
    <span>📊 Progress tracking</span>
  </div>
</section>

{/* ---- PlayerStats (logged-in only) ---- */}
{isLoggedIn && hasProgressData && stats && (
  <PlayerStats
    badges={stats.badges.length}
    level={Math.floor(stats.xp / 100) + 1}
    streak={stats.streak}
    xp={stats.xp}
  />
)}
```

- [ ] **Step 5: Add the SUBJECT_EMOJIS and subjectTitle helpers**

Add near the top of the file (after `TOPIC_EMOJIS`):

```typescript
const SUBJECT_EMOJIS: Record<string, string> = {
  maths: "📐",
  science: "🧪",
  geography: "🌍",
  english: "📖",
};

function subjectTitle(slug: string): string {
  const titles: Record<string, string> = {
    maths: "Maths",
    science: "Science",
    geography: "Geography",
    english: "English",
  };
  return titles[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}
```

- [ ] **Step 6: Add the dynamic subject tab bar**

After the "What is SARA?" section and before the Today's Mission section, add the subject tabs + year toggle + topic grid:

```tsx
{/* ---- Dynamic Subject Tabs ---- */}
<section>
  {/* Subject tab bar — horizontal on desktop, scrollable pills on mobile */}
  <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none md:overflow-x-visible md:border-b md:border-white/5">
    {subjects.length === 0 && (
      <p className="text-xs text-muted-foreground py-2">No subjects available yet</p>
    )}
    {subjects.map((s) => (
      <button
        key={s.slug}
        className={cn(
          "whitespace-nowrap rounded-full md:rounded-none md:rounded-t-lg px-4 py-2 text-xs font-bold transition-all duration-200 shrink-0",
          subject === s.slug
            ? "bg-orange-500/15 text-orange-400 md:bg-transparent md:text-orange-400 md:border-b-2 md:border-orange-500"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5 md:hover:bg-transparent"
        )}
        onClick={() => setSubject(s.slug)}
        type="button"
      >
        <span className="mr-1.5">{SUBJECT_EMOJIS[s.slug] ?? "📖"}</span>
        GCSE {s.title}
      </button>
    ))}
  </div>

  {/* Year toggle — only shows years available for this subject */}
  {activeSubjectYearGroups.length > 1 && (
    <div className="flex gap-1.5 mt-3 mb-4">
      {activeSubjectYearGroups.map((y) => (
        <button
          key={y}
          className={cn(
            "rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
            year === y
              ? "bg-gradient-to-r from-orange-500 to-violet-600 text-white shadow-md shadow-orange-500/20"
              : "text-muted-foreground hover:text-foreground border border-white/5 hover:bg-white/5"
          )}
          onClick={() => setYear(y as 8 | 9)}
          type="button"
        >
          Year {y}
        </button>
      ))}
    </div>
  )}

  {/* Topic grid with Quiz buttons */}
  {missions.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
      {missions.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/10 hover:bg-white/5"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">{m.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
              <p className="text-[10px] text-muted-foreground/60 truncate">
                {m.gcseDomain?.replace(/_/g, " ") || "GCSE"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-[10px] font-extrabold text-white shadow-lg shadow-violet-500/15 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
              onClick={() => startMissionDirectQuiz(m)}
              type="button"
            >
              Quiz ⚡
            </button>
            <button
              className="rounded-full bg-gradient-to-r from-orange-500 to-violet-600 px-3 py-1.5 text-[10px] font-extrabold text-white shadow-lg shadow-orange-500/15 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
              onClick={() => startMission(m)}
              type="button"
            >
              Start →
            </button>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-muted-foreground py-8 text-center">
      No topics available for {subjectTitle(subject)} Year {year} yet.
    </p>
  )}
</section>
```

- [ ] **Step 7: Tighten imports**

Add `useEffect` to the React import if not already there:

```typescript
import { useEffect, useMemo, useState } from "react";
```

Also add the `subjectTitle` import from Task 1 — or since it's defined directly in sara-dashboard.tsx (Step 5), just ensure the React import includes `useEffect`.

- [ ] **Step 8: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 9: Commit**

```bash
git add components/chat/sara-dashboard.tsx
git commit -m "feat: rewrite homepage as multi-subject GCSE tutor dashboard with dynamic tabs and quiz buttons"
```

---

### Task 3: Scrolling Subjects Edge Cases

**Files:**
- Modify: `components/chat/sara-dashboard.tsx`

- [ ] **Step 1: Add `scrollbar-none` utility to the tab container**

The scrollable pill tabs on mobile should hide the scrollbar. Add the Tailwind class. If `scrollbar-none` isn't in the tailwind config, add a CSS utility to `app/globals.css`:

```css
@layer utilities {
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
}
```

- [ ] **Step 2: Verify the build**

Run: `npx tsc --noEmit`
Expected: No type errors.

Run build: `pnpm build` (or at least `next build` to catch any CSS/layout issues)
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "style: add scrollbar-none utility and mobile pill tab scrolling"
```

---

### Task 4: Clean Up Remaining Maths-Specific Copy

- [ ] **Step 1: Check for stale "Learn Maths" references in the codebase**

Search for any remaining hardcoded references:

```bash
rg "Learn Maths" --glob '*.tsx' --glob '*.ts'
```

Expected: No matches (the hero copy was updated in Task 2).

Also check the "Challenge Mode" banner (line 373 in the original):

```bash
rg "Challenge Mode: Year" --glob '*.tsx'
```

If the banner still says `"🏆 Challenge Mode: Year {year} Maths"` or `Science`, update it to use the subject title dynamically:

```typescript
🏆 Challenge Mode: Year {year} {subjectTitle(subject)}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "chore: remove remaining maths-specific copy from dashboard"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: Clean (0 errors)

- [ ] **Step 2: Unit test suite**

Run: `pnpm test:unit`
Expected: 108/108 tests pass (no regressions)

- [ ] **Step 3: Visual check**

Run `pnpm dev` and verify:
- Search box spans full width of the container
- "What is SARA?" is below the search box, centred
- Subject tabs show Maths, Science, Geography (and any others in the DB)
- Clicking a tab switches the topic grid
- Year toggle shows only available years per subject
- Each topic has "Quiz ⚡" and "Start →" buttons
- On mobile, tabs scroll horizontally, topics stack in 1 column
