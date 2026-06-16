# Plan 002: Extract `hasRenderableContent` to shared module

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- app/(chat)/api/chat/route.ts hooks/use-active-chat.tsx`
> If either file changed, read the current `VISIBLE_TOOL_TYPES` and
> `hasRenderableContent` in both before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

The `VISIBLE_TOOL_TYPES` set and `hasRenderableContent` function are defined
identically in two files — `app/(chat)/api/chat/route.ts:71-90` and
`hooks/use-active-chat.tsx:109-126`. Adding a new student-visible tool (like
`tool-askQuestion`) requires editing both files in lockstep. When they drifted
in Phase 29, it caused a "nothing displayed after answering" bug that took
hours to diagnose. Extracting to one shared module eliminates the duplication
and prevents future silent-turn regressions.

## Current state

**`app/(chat)/api/chat/route.ts:71-90`**:
```typescript
const VISIBLE_TOOL_TYPES = new Set([
  "tool-askQuestion",
]);

function hasRenderableContent(message: { parts?: unknown[] }): boolean {
  return (message.parts ?? []).some((part) => {
    const p = part as { type?: string; text?: string; output?: unknown };
    if (p.type === "text") {
      return (p.text ?? "").trim().length > 0;
    }
    if (typeof p.type === "string" && VISIBLE_TOOL_TYPES.has(p.type)) {
      return p.output !== undefined;
    }
    return false;
  });
}
```

**`hooks/use-active-chat.tsx:109-126`**:
```typescript
const VISIBLE_TOOL_TYPES = new Set([
  "tool-askQuestion",
]);

function hasRenderableContent(message: ChatMessage): boolean {
  return (message.parts ?? []).some((part) => {
    if (part.type === "text") {
      return (part.text ?? "").trim().length > 0;
    }
    if (VISIBLE_TOOL_TYPES.has(part.type)) {
      return (part as { output?: unknown }).output !== undefined;
    }
    return false;
  });
}
```

Note the slight type difference — `route.ts` uses `{ parts?: unknown[] }` while
`use-active-chat.tsx` uses `ChatMessage`. The shared module should accept a
generic shape that both callers match.

## Commands you will need

| Purpose   | Command               | Expected on success |
|-----------|-----------------------|---------------------|
| Typecheck | `npx tsc --noEmit`    | exit 0, no errors   |
| Tests     | `pnpm test:unit`      | 104/104 pass        |
| Build     | `pnpm build`          | exit 0              |

## Scope

**In scope**:
- `lib/ai/visible-tools.ts` (new — shared module)
- `app/(chat)/api/chat/route.ts` (remove local definitions, import from shared)
- `hooks/use-active-chat.tsx` (remove local definitions, import from shared)

**Out of scope**:
- Any logic changes to `hasRenderableContent` behaviour
- Renaming `VISIBLE_TOOL_TYPES` or `hasRenderableContent`

## Git workflow

- Branch: `advisor/002-visible-tools-shared`
- Single commit: `refactor: extract VISIBLE_TOOL_TYPES and hasRenderableContent to shared module`

## Steps

### Step 1: Create `lib/ai/visible-tools.ts`

Write the shared module. Export both the set and the function. The function
should accept a generic shape `{ parts?: Array<{ type: string; text?: string }> }`
that both callers can satisfy.

File content:

```typescript
// Tools whose output is actually shown to the student. Other tools
// (updateStudentProfile, manageGoals, startNewTopicSession, getCurriculumTopics)
// persist data or steer state but render NOTHING in the thread.
const VISIBLE_TOOL_TYPES = new Set([
  "tool-askQuestion",
]);

/**
 * True if a message has something the student can see: non-empty text or a
 * visible tool call with output. Silent persistence tools don't count, so a
 * tool-only-silent turn is treated as content-less.
 */
function hasRenderableContent(message: {
  parts?: Array<{ type: string; text?: string; [key: string]: unknown }>;
}): boolean {
  return (message.parts ?? []).some((part) => {
    if (part.type === "text") {
      return (part.text ?? "").trim().length > 0;
    }
    if (VISIBLE_TOOL_TYPES.has(part.type)) {
      return (part as { output?: unknown }).output !== undefined;
    }
    return false;
  });
}

export { VISIBLE_TOOL_TYPES, hasRenderableContent };
```

**Verify**:
```bash
npx tsc --noEmit
```
Must exit 0.

### Step 2: Update `app/(chat)/api/chat/route.ts`

1. Add import at the top:
   ```typescript
   import { VISIBLE_TOOL_TYPES, hasRenderableContent } from "@/lib/ai/visible-tools";
   ```

2. **Delete** lines 67-90 (the local `VISIBLE_TOOL_TYPES` constant and
   `hasRenderableContent` function definition).

3. Add a comment referencing the shared import where the deletion was, so
   future readers know where to look:
   ```typescript
   // VISIBLE_TOOL_TYPES and hasRenderableContent live in lib/ai/visible-tools.ts
   ```

**Verify**:
```bash
npx tsc --noEmit
```
Must exit 0. Also verify no duplicate definition by checking:
```bash
grep -n "VISIBLE_TOOL_TYPES" app/\(chat\)/api/chat/route.ts
```
Should show only one occurrence (the import line).

### Step 3: Update `hooks/use-active-chat.tsx`

1. Add import at the top:
   ```typescript
   import { VISIBLE_TOOL_TYPES, hasRenderableContent } from "@/lib/ai/visible-tools";
   ```

2. **Delete** lines 109-126 (the local `VISIBLE_TOOL_TYPES` constant and
   `hasRenderableContent` function definition). Double-check the line numbers
   from the drift check — they should match, but verify the content before
   deleting.

**Verify**:
```bash
npx tsc --noEmit
pnpm test:unit
```
Both must pass.

### Step 4: Verify no stale references

```bash
grep -rn "const VISIBLE_TOOL_TYPES" app/ hooks/ --include="*.tsx" --include="*.ts"
```

Should return no results (the only definition is now in `lib/ai/visible-tools.ts`).

```bash
pnpm build
```
Must exit 0.

## Test plan

No new tests needed — this is a pure extraction. The existing 104 unit tests
must pass.

## Done criteria

- [ ] `lib/ai/visible-tools.ts` exists with `VISIBLE_TOOL_TYPES` and `hasRenderableContent`
- [ ] Both `app/(chat)/api/chat/route.ts` and `hooks/use-active-chat.tsx` import from it
- [ ] Both files no longer define their own local version
- [ ] `grep -rn "const VISIBLE_TOOL_TYPES" app/ hooks/` returns no results
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm test:unit` exits 0 (104/104)
- [ ] `pnpm build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- If the `VISIBLE_TOOL_TYPES` content differs between the two files: stop and
  report the difference. One may have been updated while the other wasn't.
- If `npx tsc --noEmit` produces errors that can't be resolved by adjusting
  the function signature in the shared module.

## Maintenance notes

- When adding a new student-visible tool, add its type string to the
  `VISIBLE_TOOL_TYPES` set in `lib/ai/visible-tools.ts` — only one file to
  update.
- When the message shape changes (e.g., `parts` gets a new variant type),
  update the shared `hasRenderableContent` — both callers pick it up
  automatically.
