# Subject Selector & Science Placeholder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a beautiful, responsive Subject Selector to the dashboard that allows toggling between Maths and a high-fidelity Science placeholder card, hiding or showing active maths learning sections as appropriate.

**Architecture:** Use client-side React state (`useState`) to toggle the current subject, conditionally rendering existing Maths sub-components (`todayMission`, `MissionMap`) or a premium new Science placeholder.

**Tech Stack:** Next.js, React, Tailwind CSS, Framer Motion, Lucide icons (if any, otherwise custom icons/emojis).

---

## File Structure

- Modify: `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/sara-dashboard.tsx`

---

## Tasks

### Task 1: Subject State and Selector UI

**Files:**
- Modify: `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/sara-dashboard.tsx`

- [ ] **Step 1: Declare the subject state**

Modify the top of `SaraDashboard` function in `/Users/dhrubo.paul/Sites/teachingchatbot/components/chat/sara-dashboard.tsx`:
```typescript
const [subject, setSubject] = useState<"maths" | "science">("maths");
```

- [ ] **Step 2: Add Subject Selector UI Markup**

Insert the gorgeous selector right above "Today's Mission" section in the JSX layout:
```tsx
{/* ---- Subject Selector Card Row ---- */}
<section className="mb-6">
  <div className="grid grid-cols-2 gap-4">
    <button
      onClick={() => setSubject("maths")}
      className={cn(
        "group relative flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all duration-300",
        subject === "maths"
          ? "border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-violet-500/15 shadow-[0_0_20px_rgba(249,115,22,0.15)] scale-[1.02]"
          : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100"
      )}
      type="button"
    >
      <div className="text-3xl mb-2 transition-transform duration-300 group-hover:scale-110">📐</div>
      <div className={cn(
        "text-sm font-black tracking-tight",
        subject === "maths" ? "text-orange-400" : "text-muted-foreground"
      )}>
        GCSE Maths
      </div>
      <div className="text-[10px] text-muted-foreground/60 mt-1 uppercase font-bold tracking-widest">
        Active Syllabus
      </div>
    </button>

    <button
      onClick={() => setSubject("science")}
      className={cn(
        "group relative flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all duration-300",
        subject === "science"
          ? "border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-indigo-500/15 shadow-[0_0_20px_rgba(124,58,237,0.15)] scale-[1.02]"
          : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100"
      )}
      type="button"
    >
      <div className="text-3xl mb-2 transition-transform duration-300 group-hover:scale-110">🧪</div>
      <div className={cn(
        "text-sm font-black tracking-tight",
        subject === "science" ? "text-violet-400" : "text-muted-foreground"
      )}>
        GCSE Science
      </div>
      <div className="text-[10px] text-muted-foreground/60 mt-1 uppercase font-bold tracking-widest">
        Coming Soon
      </div>
    </button>
  </div>
</section>
```

- [ ] **Step 3: Conditional Rendering for Today's Mission & Mission Map**

Wrap "Today's Mission" and "Mission Map" inside a conditional block checking if `subject === "maths"`:
```tsx
{subject === "maths" && todayMission && (
  <section>
    {/* Today's Mission layout... */}
  </section>
)}

{subject === "maths" && (
  <>
    <div className="my-2 h-px bg-white/5" />
    <section>
      {/* Mission Map/Your Learning Journey... */}
    </section>
  </>
)}
```

- [ ] **Step 4: Add Science Placeholder Card**

When `subject === "science"`, render the Science placeholder card:
```tsx
{subject === "science" && (
  <motion.section
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="sara-glass-panel border-violet-500/30 bg-violet-950/20 rounded-3xl p-8 relative overflow-hidden text-center shadow-[0_0_30px_rgba(139,92,246,0.1)] flex flex-col items-center justify-center min-h-[350px]"
  >
    <div className="absolute -left-20 -top-20 size-40 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
    <div className="absolute -right-20 -bottom-20 size-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

    <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-5xl shadow-inner mb-6 animate-bounce">
      🧬
    </div>

    <h3 className="text-xl font-black tracking-tight text-violet-200">
      GCSE Science lessons are coming soon!
    </h3>
    
    <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md">
      Our team is hard at work building visual lessons, concept cards, and challenges for Biology, Chemistry, and Physics. Try GCSE Maths to start mastering your syllabus today! 🚀
    </p>

    <button
      onClick={() => setSubject("maths")}
      className="mt-6 rounded-full bg-gradient-to-r from-orange-500 to-violet-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:scale-[1.05] hover:shadow-orange-500/40 active:scale-[0.95]"
      type="button"
    >
      Start Learning Maths 📐
    </button>
  </motion.section>
)}
```

- [ ] **Step 5: Run compilation check**

Run: `npx tsc --noEmit`
Expected: Passes without type errors.

- [ ] **Step 6: Run existing unit tests**

Run: `pnpm test:unit`
Expected: All 106 existing unit tests pass cleanly.

- [ ] **Step 7: Commit changes**

Run: `git add components/chat/sara-dashboard.tsx && git commit -m "feat: add subject selector & science placeholder"`
