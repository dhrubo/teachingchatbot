# Plan 005: Upgrade `@types/react` to match React 19

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- package.json`
> Read the current `@types/react` version before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: deps
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

`package.json` pins `"react": "19.0.1"` (React 19) but `"@types/react": "^18"`
(types for React 18, resolved to 18.x). React 19 introduces new APIs (`use`,
`useActionState`, improved `ref` callbacks) that have no type coverage, and
removes or changes deprecated APIs that React 18 types may still declare.
`skipLibCheck: true` in `tsconfig.json` suppresses the resulting errors, but
this means IDE autocomplete, `tsc --noEmit`, and type-aware lint are all
operating on the wrong type definitions.

## Current state

In `package.json`:
```json
"dependencies": {
  ...
  "react": "19.0.1",
  "react-dom": "19.0.1",
  ...
},
"devDependencies": {
  ...
  "@types/react": "^18",
  "@types/react-dom": "^18",
  ...
}
```

The `^18` range resolves to the latest 18.x release (e.g., `18.3.18`), which
is a major version behind the runtime React.

## Commands you will need

| Purpose   | Command               | Expected on success |
|-----------|-----------------------|---------------------|
| Install   | `pnpm install`        | exit 0              |
| Typecheck | `npx tsc --noEmit`    | exit 0, no errors   |
| Tests     | `pnpm test:unit`      | 104/104 pass        |
| Build     | `pnpm build`          | exit 0              |

## Scope

**In scope**:
- `package.json` (two version bumps)

**Out of scope**:
- Any code changes to accommodate API differences between React 18 and 19
  types (the codebase already uses React 19 APIs at runtime; this plan only
  aligns the type definitions)
- Changing runtime dependencies

## Git workflow

- Branch: `advisor/005-upgrade-types-react`
- Single commit: `deps: upgrade @types/react and @types/react-dom to match React 19`

## Steps

### Step 1: Update type packages

```bash
pnpm up "@types/react@^19" "@types/react-dom@^19"
```

**Verify**:
```bash
pnpm ls @types/react --depth=0
```
Must show `@types/react@19.x.x` (or latest 19.x).

```bash
pnpm ls @types/react-dom --depth=0
```
Must show `@types/react-dom@19.x.x`.

### Step 2: Run typecheck

```bash
npx tsc --noEmit
```

If this produces type errors, they are likely from React 19 removing or
changing types that React 18 allowed. Common issues:
- `React.ReactNode` no longer includes `undefined` (narrower union)
- `useRef(null)` now requires explicit `useRef<HTMLDivElement | null>(null)`
- Some deprecated `React.Props` types are removed

For each error:
1. Check if the runtime code actually works (it already runs on React 19).
2. Fix the type annotation, not the runtime logic.
3. If an error has no trivial fix, suppress with a focused `@ts-expect-error`
   and a comment — do not expand the scope.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 3: Run full verification

```bash
pnpm test:unit
pnpm build
```

Both must pass.

## Test plan

No new tests. The existing 104 unit tests verify runtime behaviour; the type
check verifies compilation. If type errors from Step 2 required code changes,
run the test suite again to confirm no regression.

## Done criteria

- [ ] `pnpm ls @types/react --depth=0` shows 19.x
- [ ] `pnpm ls @types/react-dom --depth=0` shows 19.x
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm test:unit` exits 0 (104/104)
- [ ] `pnpm build` exits 0
- [ ] Only `package.json` and potentially `pnpm-lock.yaml` were modified
      (plus any minimal type-fix code changes from Step 2)
- [ ] `plans/README.md` status row updated

## STOP conditions

- If upgrading causes more than 20 type errors across unrelated files: the
  actual type gap is bigger than expected. Stop and report the distribution.
- If `pnpm build` fails with errors that are not from this upgrade (leverage
  the drift check — might mean the codebase already has pre-existing issues).

## Maintenance notes

- Keep `@types/react` and `@types/react-dom` pinned to the same major version
  as `react` and `react-dom` from now on. Add a comment in `package.json`:
  `// must match react major version`
- After upgrade, validate that `skipLibCheck` can eventually be removed — or
  at least that the gap between types and runtime is closed.
