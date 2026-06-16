# Plan 006: Fix guest email collision with random suffix

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- lib/db/queries/auth.ts`
> Read the current `createGuestUser` function to confirm the email line matches.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

`createGuestUser` in `lib/db/queries/auth.ts:33` generates guest emails as
`guest-${Date.now()}` — millisecond-precision only. Under concurrent signups
(e.g., a classroom all loading the app at once), two requests in the same
millisecond produce the same email. The DB has a unique constraint on
`User.email`, so the second insert throws a primary-key/unique violation,
surfacing as a 500 error page to the student.

## Current state

`lib/db/queries/auth.ts:32-58`:
```typescript
export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());
  // ... insert ...
}
```

The `generateUUID()` helper already exists in `lib/utils.ts` and is used
elsewhere for chat/message IDs, but curiously not for guest emails.

## Commands you will need

| Purpose   | Command               | Expected on success |
|-----------|-----------------------|---------------------|
| Typecheck | `npx tsc --noEmit`    | exit 0, no errors   |
| Tests     | `pnpm test:unit`      | 104/104 pass        |

## Scope

**In scope**:
- `lib/db/queries/auth.ts` (single-line change)

**Out of scope**:
- Changing the `generateUUID` function
- Changing how guest users are identified elsewhere (the `guest-` prefix is
  used by cleanup queries — preserve it)

## Git workflow

- Branch: `advisor/006-guest-email-suffix`
- Single commit: `fix: add random suffix to guest email to prevent collision under concurrency`

## Steps

### Step 1: Update the email generation

Open `lib/db/queries/auth.ts`. Change line 33 from:
```typescript
const email = `guest-${Date.now()}`;
```
to:
```typescript
const email = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
```

This appends a 6-character alphanumeric suffix, making collision probability
negligible even within the same millisecond. The `guest-` prefix is preserved
so `deleteExpiredGuestChats` and admin filtering still work.

**Verify** by reading the updated line:
```bash
grep -n "const email" lib/db/queries/auth.ts
```
Must show the new pattern with the random suffix.

### Step 2: Verify no regression

```bash
npx tsc --noEmit
pnpm test:unit
```

Both must pass.

## Test plan

No new tests — the change is a one-line string template. The existing 104 unit
tests must pass.

## Done criteria

- [ ] `lib/db/queries/auth.ts` line 33 has the random suffix pattern
- [ ] `grep -n "guest-.*Date.now" lib/db/queries/auth.ts` shows `Math.random` suffix
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm test:unit` exits 0 (104/104)
- [ ] Only `lib/db/queries/auth.ts` was modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- If `generateUUID` is a better fit (already imported in the same file), feel
  free to use it instead: ``const email = `guest-${generateUUID()}`;`` — this is
  equally valid and uses an existing utility. The key constraint is preserving
  the `guest-` prefix.

## Maintenance notes

- The `guest-` prefix is load-bearing: admin user filtering uses
  `email NOT LIKE 'guest-%'`, and the cleanup cron queries by `email like 'guest-%'`.
  Do not change the prefix.
- If guest user cleanup ever needs to identify sessions by email format, the
  suffix is informational only — use the `id` column as the primary key.
