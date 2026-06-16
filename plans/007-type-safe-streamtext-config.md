# Plan 007: Type-safe `streamText` config — remove `as any`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- lib/ai/stream-with-provider-fallback.ts`
> Read the current function signature and the `(config as any)` line to confirm.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

The `config` parameter in `streamTextWithFallback` is typed as
`Omit<Parameters<typeof streamText>[0], "model" | "maxRetries">` — a perfectly
good type that captures every valid option for `streamText`. But at the call
site (`lib/ai/stream-with-provider-fallback.ts:56`), the spread is cast through
`(config as any)`, completely bypassing TypeScript's checking. A misspelled,
renamed, or removed property in the config object compiles cleanly and only
fails at runtime. This already caused regressions in earlier phases when tool
names changed.

## Current state

`lib/ai/stream-with-provider-fallback.ts:36-59`:
```typescript
export async function streamTextWithFallback(
  candidates: ProviderCandidate[],
  config: Omit<Parameters<typeof streamText>[0], "model" | "maxRetries">,
  onModelSwitch?: (name: string) => void,
  reason: AiCallReason = "lesson_bundle",
  overrideRequestId?: string
): Promise<{...}> {
  // ...
  for (const candidate of candidates) {
    try {
      const result = streamText({
        ...(config as any),  // ← type safety bypass
        model: candidate.model,
        maxRetries: 0,
      });
```

The function parameter `config` already has a complete type definition. The
`as any` cast adds zero value and removes all verification. The fix is simply
to remove the cast.

## Commands you will need

| Purpose   | Command               | Expected on success |
|-----------|-----------------------|---------------------|
| Typecheck | `npx tsc --noEmit`    | exit 0, no errors   |
| Tests     | `pnpm test:unit`      | 104/104 pass        |
| Build     | `pnpm build`          | exit 0              |

## Scope

**In scope**:
- `lib/ai/stream-with-provider-fallback.ts` (one line changed)

**Out of scope**:
- Changing the function signature
- Adding or removing any other `as any` casts elsewhere in the codebase

## Git workflow

- Branch: `advisor/007-streamtext-typesafe`
- Single commit: `fix: remove as any cast in streamTextWithFallback to restore type safety`

## Steps

### Step 1: Remove the `as any` cast

Open `lib/ai/stream-with-provider-fallback.ts`. Change line 56:
```typescript
        ...(config as any),
```
to:
```typescript
        ...config,
```

### Step 2: Verify type safety

```bash
npx tsc --noEmit
```

Must exit 0. If it doesn't, the config type has drifted from `streamText`'s
actual parameter type. The fix is likely that `config` needs a more permissive
type (`Record<string, unknown>` with specific overrides) or the `streamText`
function signature has changed. Do NOT re-add `as any` — fix the type properly.

### Step 3: Verify no regression

```bash
pnpm test:unit
pnpm build
```

Both must pass.

## Test plan

No new tests. The existing suite confirms the function still works.

## Done criteria

- [ ] `lib/ai/stream-with-provider-fallback.ts` no longer contains `as any`
- [ ] `grep -n "as any" lib/ai/stream-with-provider-fallback.ts` returns no matches
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm test:unit` exits 0 (104/104)
- [ ] `pnpm build` exits 0
- [ ] Only `lib/ai/stream-with-provider-fallback.ts` was modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- If removing `as any` reveals type errors: stop and report the exact errors.
  Do NOT add `@ts-expect-error` as a workaround — the errors indicate a real
  type mismatch that may need a broader fix.
- If `streamText`'s parameter type is too complex to reference directly
  (e.g., circular or recursive types), use `Parameters<typeof streamText>[0]`
  as a base type and adjust with `Omit`.

## Maintenance notes

- After this fix, any future change to the `streamText` API that affects
  config shape will surface as a type error at compile time in this file.
  That's the desired behaviour.
- If a new option needs passing that `streamText` doesn't officially support
  (should be rare), use a focused type assertion on just that one property
  rather than casting the entire config.
