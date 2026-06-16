# GCSE Mega Menu & Dynamic Subject Curriculum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand SARA to fully support dynamic, subject-specific topics across the homepage dashboard and top navigation.

**Architecture:** Update the lessons API to support dynamic subject filters. Overhaul the top-nav topic dropdown to be a gorgeous double-column wide Mega Menu grouping Maths and Science by Year 8/Year 9, fetching live data using useSWR with high-fidelity Science offline fallbacks. Update the dashboard to render the circular `MissionMap` for both subjects dynamically.

**Tech Stack:** Next.js (App Router), React, useSWR, Tailwind CSS, Framer Motion, Drizzle ORM, Vitest.

---

### Task 1: Update Lessons API (`app/(chat)/api/lessons/route.ts`)

**Files:**
- Modify: `app/(chat)/api/lessons/route.ts:15-32`

- [ ] **Step 1: Read the subject parameter from request searchParams**
  Read `subjectParam` from `searchParams.get("subject")` and default to `"maths"`.

- [ ] **Step 2: Update the list-missions query**
  Update the query filtering the `mission` table inside the `yearParam` block to filter by `mission.yearGroup === year`, `mission.subject === subjectParam`, and `mission.isActive === true`. Order by `asc(mission.order)`.

  Here is the code structure to apply:
  ```typescript
  const subjectParam = searchParams.get("subject") || "maths";
  // ...
  if (yearParam) {
    const year = Number.parseInt(yearParam, 10);
    const missions = await db
      .select()
      .from(mission)
      .where(
        and(
          eq(mission.yearGroup, year),
          eq(mission.subject, subjectParam),
          eq(mission.isActive, true)
        )
      )
      .orderBy(asc(mission.order));

    return NextResponse.json({ missions });
  }
  ```

- [ ] **Step 3: Run the project tests to ensure no regressions**
  Run: `pnpm test:unit`
  Expected: All 108 tests pass.

---

### Task 2: Refactor SARA Dashboard (`components/chat/sara-dashboard.tsx`)

**Files:**
- Modify: `components/chat/sara-dashboard.tsx`

- [ ] **Step 1: Incorporate subject in SWR query key**
  Change the useSWR query URL so that it appends `&subject=${subject}` to the search parameters.
  ```typescript
  const { data: apiData } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lessons?year=${year}&subject=${subject}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  ```

- [ ] **Step 2: Change GCSE Science card subtitle**
  Change the Science card subtitle from "Coming Soon" to "Active Syllabus".

- [ ] **Step 3: Render Today's Mission and MissionMap for all subjects dynamically**
  Remove the `{subject === "maths" && (...)` wrapper (and remove the corresponding closing `}`) so that both Maths and Science subjects can render their circular maps (`MissionMap`) and Daily Mission cards dynamically.
  Ensure we also remove the static, non-functional Science premium placeholder card block completely (lines 372-406).

- [ ] **Step 4: Completely remove the "What You'll Learn" section**
  Delete the entire "What You'll Learn" block at the bottom of the dashboard (lines 433-527) to avoid linear listings redundancy.

- [ ] **Step 5: Run compilation check**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation.

---

### Task 3: Overhaul Top-Nav Mega Menu (`components/chat/topic-picker.tsx`)

**Files:**
- Modify: `components/chat/topic-picker.tsx`

- [ ] **Step 1: Expand static fallbacks for Science and Maths**
  Define high-fidelity fallback items for both Maths and Science across Year 8 and Year 9.
  ```typescript
  const MATHS_FALLBACK: Record<"8" | "9", TopicItem[]> = {
    "8": [
      { slug: "number-skills", title: "Number Skills", emoji: "🔢" },
      { slug: "fractions", title: "Fractions", emoji: "🧮" },
      { slug: "percentages", title: "Percentages", emoji: "💯" },
      { slug: "ratio-proportion", title: "Ratio & Proportion", emoji: "⚖️" },
      { slug: "algebra-basics", title: "Algebra Basics", emoji: "🔤" },
      { slug: "straight-line-graphs", title: "Straight-Line Graphs", emoji: "📈" },
      { slug: "angles-geometry", title: "Angles & Geometry", emoji: "📐" },
      { slug: "probability", title: "Probability", emoji: "🎲" },
      { slug: "area-perimeter", title: "Area & Perimeter", emoji: "📏" },
    ],
    "9": [
      { slug: "indices-standard-form", title: "Indices & Standard Form", emoji: "🔢" },
      { slug: "volume-surface-area", title: "Volume & Surface Area", emoji: "📦" },
      { slug: "simultaneous-equations", title: "Simultaneous Equations", emoji: "➗" },
      { slug: "pythagoras", title: "Pythagoras", emoji: "📏" },
    ],
  };

  const SCIENCE_FALLBACK: Record<"8" | "9", TopicItem[]> = {
    "8": [
      { slug: "cells-respiration", title: "Cells & Respiration", emoji: "🧫" },
      { slug: "elements-compounds", title: "Elements & Compounds", emoji: "🧪" },
      { slug: "forces-magnets", title: "Forces & Magnets", emoji: "🧲" },
      { slug: "light-sound", title: "Light & Sound", emoji: "🔊" },
    ],
    "9": [
      { slug: "photosynthesis-ecosystems", title: "Photosynthesis & Ecosystems", emoji: "🌿" },
      { slug: "chemical-reactions", title: "Chemical Reactions", emoji: "💥" },
      { slug: "energy-waves", title: "Energy & Waves", emoji: "🌊" },
      { slug: "earth-atmosphere", title: "Earth & Atmosphere", emoji: "🌍" },
    ],
  };
  ```

- [ ] **Step 2: Build `useSubjectYearTopics` custom hook**
  Update the topic hook to load subjects and years dynamically:
  ```typescript
  function useSubjectYearTopics(year: "8" | "9", subject: "maths" | "science"): TopicItem[] {
    const { data } = useSWR(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lessons?year=${year}&subject=${subject}`,
      fetcher,
      { revalidateOnFocus: false }
    );
    const missions = data?.missions as { slug: string; title: string }[] | undefined;
    if (missions?.length) {
      return missions.map((m) => ({
        slug: m.slug,
        title: m.title,
        emoji: subject === "maths" ? "📐" : "🧪",
      }));
    }
    return subject === "maths" ? MATHS_FALLBACK[year] : SCIENCE_FALLBACK[year];
  }
  ```

- [ ] **Step 3: Update `YearGroup` to accept a subject**
  Pass the subject to `YearGroup` component and style button items with the Sunset Space Theme (pulsing dots, hover borders, glow actions).
  ```typescript
  function YearGroup({
    year,
    subject,
    onPick,
  }: {
    year: "8" | "9";
    subject: "maths" | "science";
    onPick: (t: TopicItem) => void;
  }) {
    const topics = useSubjectYearTopics(year, subject);
    return (
      <div className="flex flex-col gap-1 p-2">
        <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-orange-500 animate-pulse" />
          Year {year}
        </p>
        <div className="grid grid-cols-1 gap-1">
          {topics.map((t) => (
            <button
              className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground/80 transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/20 border border-transparent hover:translate-x-1"
              key={t.slug}
              onClick={() => onPick(t)}
              type="button"
            >
              <span className="mr-1.5">{t.emoji || (subject === "maths" ? "📐" : "🧪")}</span>
              {t.title}
            </button>
          ))}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: Redesign Popover to Mega Menu inside `TopicPicker`**
  Modify `TopicPicker`'s `PopoverContent` to make it a gorgeous double-column layout:
  ```typescript
  export function TopicPicker({ className }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const startTopic = useStartTopic();

    const pick = (t: TopicItem) => {
      setOpen(false);
      startTopic({ id: t.slug, title: t.title, emoji: t.emoji || "📖" });
    };

    return (
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-orange-400 transition-all duration-200 hover:translate-y-[-1px] shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.15)]",
              className
            )}
            size="sm"
            variant="ghost"
          >
            Choose a Topic
            <ChevronDownIcon className="ml-1.5 size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[720px] max-w-[95vw] p-2 bg-slate-950/95 border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
            {/* Maths Column */}
            <div className="flex flex-col gap-2 p-2">
              <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5 pb-2">
                <span className="text-xl">📐</span>
                <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                  GCSE Maths
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <YearGroup onPick={pick} subject="maths" year="8" />
                <YearGroup onPick={pick} subject="maths" year="9" />
              </div>
            </div>

            {/* Science Column */}
            <div className="flex flex-col gap-2 p-2">
              <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5 pb-2">
                <span className="text-xl">🧪</span>
                <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-300 bg-clip-text text-transparent">
                  GCSE Science
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <YearGroup onPick={pick} subject="science" year="8" />
                <YearGroup onPick={pick} subject="science" year="9" />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  ```

---

### Task 4: Compilation and Test Runner

**Files:**
- N/A

- [ ] **Step 1: Check compilation**
  Run: `npx tsc --noEmit`
  Expected: No TypeScript errors.

- [ ] **Step 2: Run all unit tests**
  Run: `pnpm test:unit`
  Expected: 100% of unit tests pass.
