# SARA Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the Year 8 & 9 GCSE Maths Revision Assistant to SARA (Smart AI Reasoning Assistant) adopting a cohesive "Deep Violet Space Sunset" theme across styling, interactive mascot, dashboard layout, headers, and app sidebar.

**Architecture:** 
1. Establish `:root` level cosmic space variables inside `globals.css` to override standard light/dark modes.
2. Refactor `sara-mascot.tsx` to support the customized SVG design and dynamic `happy`, `thinking`, and `celebrating` moods.
3. Rebrand `sara-dashboard.tsx` with modern glassmorphic cards, the SVG floating mascot, syllabus pasting left column, SARA bullet card with Year toggles on the right column, stats matrix, and the mission progress vertical maps.
4. Update header brand logo (`home-logo.tsx`, `chat-header.tsx`) and adapt the side navigation panel (`app-sidebar.tsx`) to render GCSE domain rollups.

**Tech Stack:** Next.js (App Router), Tailwind CSS v4, Framer Motion, Lucide React icons.

---

### Task 1: Global Theme & Tokens Setup

**Files:**
- Modify: `/Users/dhrubo.paul/Sites/teachingchatbot/app/globals.css`

- [ ] **Step 1: Read globals.css to ensure complete understanding of current color variables**

- [ ] **Step 2: Update design tokens inside root selector**
  Replace the light-mode variables and update dark-theme variables inside `/Users/dhrubo.paul/Sites/teachingchatbot/app/globals.css` to use SARA's space sunset colors directly under the `:root` and `.dark` blocks:

```css
:root {
  --radius: 0.625rem;
  --background: #120F35;
  --foreground: #FFFFFF;
  --card: rgba(255, 255, 255, 0.05);
  --card-foreground: #FFFFFF;
  --popover: #15143C;
  --popover-foreground: #FFFFFF;
  
  --primary: #F97316;
  --primary-foreground: #FFFFFF;
  --secondary: rgba(255, 255, 255, 0.08);
  --secondary-foreground: rgba(255, 255, 255, 0.8);
  
  --muted: rgba(255, 255, 255, 0.05);
  --muted-foreground: rgba(255, 255, 255, 0.6);
  --accent: #7C3AED;
  --accent-foreground: #FFFFFF;
  
  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(255, 255, 255, 0.06);
  --ring: #7C3AED;

  --brand-coral: #F97316;
  --brand-amber: #F59E0B;
  --brand-pink: #EF4444;
  --brand-violet: #7C3AED;
  
  --gradient-sunset: linear-gradient(135deg, #F97316, #EF4444);
  --gradient-sara: linear-gradient(135deg, #F97316, #7C3AED);
  --gradient-sara-reverse: linear-gradient(135deg, #7C3AED, #F97316);

  --sidebar: #0F0D29;
  --sidebar-foreground: rgba(255, 255, 255, 0.8);
  --sidebar-border: rgba(255, 255, 255, 0.06);
  --sidebar-accent: rgba(255, 255, 255, 0.04);
  --sidebar-accent-foreground: #FFFFFF;
}

.dark {
  --background: #120F35;
  --foreground: #FFFFFF;
  --card: rgba(255, 255, 255, 0.05);
  --card-foreground: #FFFFFF;
  --popover: #15143C;
  --popover-foreground: #FFFFFF;
  --primary: #F97316;
  --primary-foreground: #FFFFFF;
  --secondary: rgba(255, 255, 255, 0.08);
  --secondary-foreground: rgba(255, 255, 255, 0.8);
  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(255, 255, 255, 0.06);
  --ring: #7C3AED;
}
```

- [ ] **Step 3: Define custom keyframes and utility classes**
  Append these animations and custom classes at the end of `/Users/dhrubo.paul/Sites/teachingchatbot/app/globals.css`:

```css
@utility glowing-sunset {
  background: linear-gradient(135deg, #FFB073, #DDB6FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.3));
}

@utility sara-glass-panel {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@utility hover-sara-glass-panel {
  &:hover {
    border-color: rgba(249, 115, 22, 0.2);
    box-shadow: 0 8px 32px 0 rgba(124, 58, 237, 0.15);
  }
}
```

- [ ] **Step 4: Run typecheck to verify there are no errors**
  Run: `npx tsc --noEmit`
  Expected: Clean compiler exit with 0 errors.

---

### Task 2: Rebrand SARA Mascot with Interactive Moods

**Files:**
- Modify: `/Users/dhrubo.paul/Sites/teachingchatbot/components/brand/sara-mascot.tsx`

- [ ] **Step 1: Replace SARA Mascot content**
  Update the component to export SARA's orbital-halo structure while dynamically adjusting properties based on `mood === "happy" | "thinking" | "celebrating"`:

```tsx
"use client";

import React from 'react';
import { cn } from "@/lib/utils";

type Mood = "happy" | "thinking" | "celebrating";

export interface SaraMascotProps {
  size?: number;
  animated?: boolean;
  mood?: Mood;
  className?: string;
}

export function SaraMascot({ size = 130, animated = true, mood = "happy", className }: SaraMascotProps) {
  return (
    <div
      aria-label="SARA mascot"
      className={cn(
        "relative flex items-center justify-center select-none overflow-visible",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg 
        className={cn(
          "w-full h-full overflow-visible", 
          animated && "animate-float"
        )} 
        viewBox="0 0 160 160" 
      >
        <defs>
          <radialGradient id="aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity={mood === "thinking" ? 0.8 : 0.5} />
            <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="haloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        
        {/* Glow Aura */}
        <circle 
          cx="80" 
          cy="80" 
          r="70" 
          fill="url(#aura)" 
          className={cn("origin-center", animated && "animate-pulse")} 
          style={{ animationDuration: mood === "thinking" ? "2s" : "4s" }}
        />

        {/* Main Mascot Geometry */}
        <g>
          {/* Orbiting Halo */}
          <ellipse 
            cx="80" 
            cy="35" 
            rx="32" 
            ry="8" 
            fill="none" 
            stroke="url(#haloGrad)" 
            strokeWidth="2.5" 
            className={cn("origin-center", animated && "animate-[spin_8s_linear_infinite]")}
            style={{ animationDuration: mood === "thinking" ? "4s" : "8s" }}
          />
          <circle cx="80" cy="35" r="3" fill="#FBBF24" />

          {/* Minimal Geometric Head */}
          <circle cx="80" cy="60" r="18" fill="#141235" stroke="url(#bodyGrad)" strokeWidth="3" />
          
          {/* Interactive face & power core based on mood */}
          <circle 
            cx="80" 
            cy="60" 
            r={mood === "thinking" ? 4 : 5} 
            fill="#FEF3C7" 
            className={cn("origin-center", animated && "animate-pulse")} 
          />
          
          {/* Custom Eyes / Cues */}
          {mood === "happy" && (
            <path d="M72 58 Q74 55 76 58 M84 58 Q86 55 88 58" fill="none" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
          )}
          {mood === "thinking" && (
            <path d="M72 59 L76 57 M84 57 L88 59" fill="none" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
          )}
          {mood === "celebrating" && (
            <path d="M71 59 L75 55 L79 59 M81 59 L85 55 L89 59" fill="none" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
          )}

          {/* Torso */}
          <path d="M 62 88 L 98 88 L 108 120 L 52 120 Z" fill="url(#bodyGrad)" className="opacity-90" />

          {/* Stylus / Staff */}
          <line x1="90" y1="98" x2="118" y2="80" stroke="#FEF3C7" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="118,80 124,72 126,82" fill="#FBBF24" />

          {/* Orbiting Math Constants */}
          <text x="35" y="55" className="fill-amber-200 text-xs font-semibold select-none pointer-events-none" style={{ animationDelay: "0s" }}>π</text>
          <text x="125" y="58" className="fill-violet-300 text-sm font-semibold select-none pointer-events-none" style={{ animationDelay: "0.5s" }}>∑</text>
          <text x="30" y="105" className="fill-orange-300 text-xs font-semibold select-none pointer-events-none" style={{ animationDelay: "1s" }}>√</text>
          <text x="128" y="112" className="fill-amber-300 text-[10px] font-semibold select-none pointer-events-none" style={{ animationDelay: "1.5s" }}>%</text>

          {/* Celebrating Sparkles */}
          {mood === "celebrating" && (
            <>
              <text x="50" y="30" className="animate-bounce fill-yellow-400 text-[10px]">★</text>
              <text x="110" y="30" className="animate-bounce fill-yellow-400 text-[10px]" style={{ animationDelay: "0.2s" }}>★</text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation.

---

### Task 3: Redesign the Master SARA Dashboard

**Files:**
- Modify: `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/sara-dashboard.tsx`

- [ ] **Step 1: Modify the rendering layout**
  Update the main layout in `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/sara-dashboard.tsx` to render:
  - Full-width [CoachBubble] at the top.
  - Large Hero containing SARA typography with `.glowing-sunset` and the floated `SaraMascot` (size: 130).
  - A clean 2-Column Grid grouping the Paste Box (Left) and SARA bullets + Year group toggles (Right).
  - User statistics matrix.
  - Interactive Mission Map & Learning Journey cards.

Let's write the exact return structure for `SaraDashboard`:

```tsx
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <motion.div
        animate={{ opacity: 1 }}
        className="flex flex-col gap-8"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ---- AI Coach Bubble ---- */}
        <section className="rounded-2xl border border-violet-500/15 bg-violet-950/15 p-4 text-center backdrop-blur-md">
          <p className="text-xs font-medium italic text-violet-200">
            "Welcome back! Let's explore fractions or solve some equations today."
          </p>
        </section>

        {/* ---- Hero Row ---- */}
        <section className="relative flex flex-col md:flex-row items-center justify-between py-6 gap-6">
          <div className="flex-1 text-left">
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl leading-tight">
              Learn Maths{" "}
              <span className="glowing-sunset font-black block mt-1">
                Without Feeling Stuck
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/90 font-medium max-w-md">
              SARA is your AI maths coach — tiny visual lessons, one challenge at
              a time, and progress that actually sticks.
            </p>
          </div>
          <div className="shrink-0">
            <SaraMascot animated mood="happy" size={130} />
          </div>
        </section>

        {/* ---- Card Selection Grid ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Paste-A-Topic */}
          <div className="sara-glass-panel hover-sara-glass-panel rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                What do you want to learn?
              </h2>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Pick a topic from <strong className="text-foreground">Choose a Topic</strong> at the top — or paste your school syllabus topics below to auto-match.
              </p>
            </div>
            <div className="mt-4">
              <TopicPasteBox />
            </div>
          </div>

          {/* Column 2: What is SARA? & Level toggler */}
          <div className="sara-glass-panel hover-sara-glass-panel rounded-2xl p-6 flex flex-col justify-between gap-6">
            <div>
              <h2 className="text-base font-bold text-foreground bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                What is SARA?
              </h2>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span>📖</span>
                  <span>Short visual lessons — one concept at a time</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🎯</span>
                  <span>Concept cards — reference whenever you need</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>⚡</span>
                  <span>Challenge mode — gamified lessons with local grading</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📊</span>
                  <span>Progress tracking — GCSE alignment and analytics</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-start border-t border-white/5 pt-4">
              <div className="flex gap-1 rounded-full border border-white/5 bg-white/5 p-1 backdrop-blur-md">
                <button
                  className={cn(
                    "rounded-full px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                    year === "8"
                      ? "bg-gradient-to-r from-orange-500 to-violet-600 text-white shadow-md shadow-orange-500/20 scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  onClick={() => setYear("8")}
                  type="button"
                >
                  Year 8
                </button>
                <button
                  className={cn(
                    "rounded-full px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                    year === "9"
                      ? "bg-gradient-to-r from-orange-500 to-violet-600 text-white shadow-md shadow-orange-500/20 scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  onClick={() => setYear("9")}
                  type="button"
                >
                  Year 9
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ---- PlayerStats (logged-in only) ---- */}
        {isLoggedIn && hasProgressData && stats && (
          <PlayerStats
            badges={stats.badges.length}
            level={Math.floor(stats.xp / 100) + 1}
            streak={stats.streak}
            xp={stats.xp}
          />
        )}

        <div className="my-2 h-px bg-white/5" />

        {/* ---- Mission Map ---- */}
        <section>
          <h2 className="mb-4 text-xs font-extrabold text-foreground/40 tracking-wider uppercase">
            YOUR LEARNING JOURNEY
          </h2>
          <div className="sara-glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -left-16 -top-16 size-32 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
            <div className="absolute -right-16 -bottom-16 size-32 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

            <MissionMap
              completedMissions={completedMissionIds}
              currentMissionId={currentMissionId}
              onSelect={(mission) => startMission(mission)}
              year={year}
            />
          </div>
        </section>

        {/* ---- What You'll Learn (curriculum missions list) ---- */}
        <section>
          <h2 className="mb-1 text-xs font-extrabold text-foreground/40 tracking-wider uppercase">
            What You&apos;ll Learn
          </h2>
          <p className="mb-4 text-[11px] text-muted-foreground">
            Year {year} maths, broken into bite-sized topics. Tap any to start.
          </p>
          <div className="flex flex-col gap-3">
            {missions.map((mission) => {
              const isCompleted = completedMissionIds.includes(mission.id);
              const isCurrent = mission.id === currentMissionId;

              // Compute score and percentage progress
              const score = isCurrent && topicProgress ? topicProgress.score : isCompleted ? 5 : 0;
              const progressPercentage = Math.round((score / 5) * 100);

              return (
                <button
                  className={cn(
                    "group relative flex flex-col gap-3 rounded-2xl border p-4 text-left backdrop-blur-md transition-all duration-300 sara-glass-panel",
                    isCompleted
                      ? "border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : isCurrent
                        ? "border-orange-500/25 bg-orange-500/5 hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                        : "border-white/5 bg-white/5 hover:border-white/10 hover:shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                  )}
                  key={mission.id}
                  onClick={() => startMission(mission)}
                  type="button"
                >
                  <div className="flex items-center gap-3 w-full">
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg shadow-inner",
                        isCompleted
                          ? "from-emerald-500/20 to-emerald-500/5 text-emerald-400"
                          : isCurrent
                            ? "from-orange-500/20 to-orange-500/5 text-orange-400"
                            : "from-indigo-500/20 to-indigo-500/5 text-indigo-300"
                      )}
                    >
                      {isCompleted ? "✓" : mission.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-sm font-bold tracking-tight",
                            isCompleted
                              ? "text-emerald-400"
                              : isCurrent
                                ? "text-orange-400"
                                : "text-indigo-200"
                          )}
                        >
                          {mission.title}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-muted-foreground/60 bg-muted/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {mission.estimatedMinutes} min
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed max-w-lg">
                        {mission.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress Indicator for curriculum list */}
                  {(isCompleted || isCurrent) && (
                    <div className="mt-2 w-full pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/75 mb-1.5 uppercase tracking-wider animate-none">
                        <span>{isCompleted ? "Completed" : "Active Progress"}</span>
                        <span>{progressPercentage}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-indigo-950/40 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isCompleted
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : "bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                          )}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="h-8" />
      </motion.div>
    </div>
  );
```

- [ ] **Step 2: Run typecheck**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation.

---

### Task 4: Rebrand Top Header Logo & Navigation Adaptations

**Files:**
- Modify: `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/chat-header.tsx`

- [ ] **Step 1: Replace SARA Logo with custom vector circle logo**
  Inside `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/chat-header.tsx`, find the `HomeLogo` block (line 81) and replace its contents to use a stylized circular vector logo with a customized 'S':

```tsx
      {/* SARA Circular Logo */}
      <HomeLogo className="flex items-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] hover:translate-y-[-0.5px]">
        <div className="flex size-7 items-center justify-center rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)] font-black text-white text-xs select-none">
          S
        </div>
        <span className="text-sm font-extrabold tracking-tight text-white uppercase">
          SARA
        </span>
      </HomeLogo>
```

- [ ] **Step 2: Update topic selector button representation**
  Inside `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/topic-picker.tsx`, modify the button text content (line 114) to explicitly append ` Choose a Topic ∨ ` or keep it styled:

```tsx
        <Button
          className={cn("rounded-full px-3 text-sm font-medium transition-all duration-200 hover:translate-y-[-1px]", className)}
          size="sm"
          variant="ghost"
        >
          Choose a Topic
          <ChevronDownIcon className="ml-1 size-3.5" />
        </Button>
```

- [ ] **Step 3: Run typecheck**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation.

---

### Task 5: Rebrand SARA Sidebar with GCSE Domain Progress Rollup

**Files:**
- Modify: `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/app-sidebar.tsx`

- [ ] **Step 1: Add GCSE Domains rollup module in App Sidebar**
  Inside `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/app-sidebar.tsx`, below the `SidebarHistory` section, introduce a static rollup panel showcasing Year 8/9 GCSE domain mastery bars (Numbers, Ratio/Proportion, Algebra):

```tsx
          {/* GCSE Domains Rollup Panel */}
          <SidebarGroup className="mt-auto border-t border-sidebar-border pt-4">
            <SidebarGroupContent>
              <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-sidebar-foreground/45">
                GCSE Progress
              </p>
              <div className="space-y-3 px-3">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-sidebar-foreground/70">
                    <span>Numbers</span>
                    <span>75%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: "75%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-sidebar-foreground/70">
                    <span>Ratio & Proportion</span>
                    <span>40%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: "40%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-sidebar-foreground/70">
                    <span>Algebra</span>
                    <span>20%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: "20%" }} />
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
```

- [ ] **Step 2: Update user profile navigation badges**
  Inside `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/sidebar-user-nav.tsx`, customize the avatar indicator inside `SidebarMenuButton` (line 60) to render the initial letter inside SARA's sunset gradient badge:

```tsx
                <div
                  className="size-5 shrink-0 rounded-full flex items-center justify-center bg-gradient-to-tr from-orange-500 to-violet-600 ring-1 ring-white/10 text-[9px] font-black text-white uppercase select-none"
                >
                  {isGuest ? "G" : user?.email?.charAt(0) || "U"}
                </div>
```

- [ ] **Step 3: Run typecheck**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation.

---

### Task 6: Final Verification & Building Checks

- [ ] **Step 1: Run comprehensive local tests**
  Run: `pnpm test:unit`
  Expected: All 104/104 tests pass successfully.

- [ ] **Step 2: Run build-time diagnostics**
  Run: `pnpm build`
  Expected: Clean compilation, successful output, Next.js page generation.
