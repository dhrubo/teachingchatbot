# Design Spec: Subject Selector & Science Placeholder

## Goal
Implement a gorgeous, highly-polished Subject Selector (Maths 📐 / Science 🧪) directly above the active learning syllabus sections on the SARA dashboard. Handle conditional rendering to show the standard Maths content (Today's Mission & Learning Journey/Mission Map) or a premium Science placeholder card.

## UI Placement
- Place the Subject Selector directly above the "Today's Mission" and "Your Learning Journey" sections in `components/chat/sara-dashboard.tsx`.
- This serves as the perfect visual and functional transition from static onboarding/paste text to subject-specific active lessons.

## Component State
```typescript
const [subject, setSubject] = useState<"maths" | "science">("maths");
```

## Subject Selector UI Details
- A two-column grid (`grid grid-cols-2 gap-4 mb-6`).
- **Maths Card 📐**:
  - Gradient of warm orange/amber to deep violet.
  - Active: Sunset glow border (`border-orange-500/30`), subtle background (`bg-gradient-to-br from-orange-500/10 to-violet-500/15`), scaled (`scale-[1.02]`), warm orange glowing shadow.
  - Inactive: Muted border, lower opacity text.
- **Science Card 🧪**:
  - Gradient of deep indigo/violet.
  - Active: Glowing violet border (`border-violet-500/30`), background (`bg-gradient-to-br from-violet-500/10 to-indigo-500/15`), scaled (`scale-[1.02]`), purple glowing shadow.
  - Inactive: Muted border, lower opacity text.

## Science Placeholder Card Details
- Mounted only when `subject === "science"`.
- Uses a dark violet card backdrop (`sara-glass-panel border-violet-500/30 bg-violet-950/20 shadow-[0_0_25px_rgba(139,92,246,0.1)]`).
- Shows a floating/pulsing science emoji (`🧪` or `🧬`).
- Displays copy welcoming the user to GCSE Science and directing them to keep practicing Maths in the meantime.

## Verification
- Confirm compilation with `npx tsc --noEmit`.
- Run unit test suite with `pnpm test:unit` to ensure no regressions.
