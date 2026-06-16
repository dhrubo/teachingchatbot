# Plan 003: Remove `"use client"` from `lib/learning-state-machine.ts`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- lib/learning-state-machine.ts`
> If the file changed, read the current `"use client"` line and verify it's
> still line 1 before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

`lib/learning-state-machine.ts` is a pure library — it exports only TypeScript
types and pure functions (`LessonAction`, `LessonState`, `allowedActions`,
`isValidTransition`, `assertHasNextAction`, `ACTION_LABELS`). It uses no React
hooks, no JSX, no browser APIs, and no `useRef`/`useEffect`. The `"use client"`
directive at line 1 forces Next.js to mark every module that imports from this
file as a client boundary, pulling server components into the client bundle.
Removing it fixes that misclassification.

## Current state

`lib/learning-state-machine.ts:1`:
```typescript
"use client";

export type LessonAction =
  | "continue_learning"
  | "start_challenge"
  | "retry_similar"
  ...
```

The entire file is 81 lines of types and pure functions.

## Commands you will need

| Purpose   | Command               | Expected on success |
|-----------|-----------------------|---------------------|
| Typecheck | `npx tsc --noEmit`    | exit 0, no errors   |
| Tests     | `pnpm test:unit`      | 104/104 pass        |
| Build     | `pnpm build`          | exit 0              |

## Scope

**In scope**:
- `lib/learning-state-machine.ts` (single line change)

**Out of scope**:
- Any logic changes to the state machine
- Adding `"use client"` anywhere else

## Git workflow

- Branch: `advisor/003-rm-client-directive`
- Single commit: `dx: remove "use client" from pure library lib/learning-state-machine.ts`

## Steps

### Step 1: Remove the `"use client"` directive

Open `lib/learning-state-machine.ts`. Delete line 1 (`"use client";`).

**Verify**:
```bash
head -1 lib/learning-state-machine.ts
```
Must show `export type LessonAction` (or the first export), not `"use client"`.

### Step 2: Verify no regression

```bash
npx tsc --noEmit
pnpm test:unit
pnpm build
```

All must pass.

## Test plan

No new tests needed — zero behavioural change. The existing 104 unit tests
must pass.

## Done criteria

- [ ] Line 1 of `lib/learning-state-machine.ts` is no longer `"use client"`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm test:unit` exits 0 (104/104)
- [ ] `pnpm build` exits 0
- [ ] Only `lib/learning-state-machine.ts` was modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- If `npx tsc --noEmit` fails with errors about `document` or `window` being
  used in the file (which would mean the file does use browser APIs despite
  appearing pure). Stop and report.
- If `pnpm build` produces "Module not found" errors related to importing
  this file from a server component without `"use client"`.

## Maintenance notes

- If future changes add React hooks or browser API usage to this file, the
  `"use client"` directive must be re-added — but that's a clear code-review
  signal: "you are adding browser-only dependencies to a pure module".
