# Plan 010: Regenerate Drizzle snapshots for migrations 0008–0010

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- lib/db/schema.ts lib/db/migrations/`
> Read the `_journal.json` and verify that idx 8, 9, 10 exist but their
> snapshots are missing from `meta/`.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

Migrations 0008, 0009, and 0010 were applied manually (the SQL files exist in
`lib/db/migrations/` and the journal tracks them), but their corresponding
snapshot files are missing from `lib/db/migrations/meta/`. The snapshot is the
source of truth Drizzle uses to detect schema drift. Without it:
- `pnpm db:generate` reports false-positive diffs against the stale 0007 snapshot
- Anyone joining the project cannot rebuild the DB from scratch using
  `db:migrate` — the seed scripts are the only reliable path
- CI pipelines that verify migration integrity produce noise

## Current state

`lib/db/migrations/meta/_journal.json` has entries for idx 0–10 (all 11
migrations registered). But `ls lib/db/migrations/meta/` shows snapshot files
only for idx 0–7:

```
_journal.json
0001_snapshot.json  0002_snapshot.json  0003_snapshot.json
0004_snapshot.json  0005_snapshot.json  0006_snapshot.json
0007_snapshot.json
```

Missing: `0008_snapshot.json`, `0009_snapshot.json`, `0010_snapshot.json`.

The Drizzle schema (`lib/db/schema.ts`) defines all tables from all 11
migrations. The current `pnpm db:migrate` script at `lib/db/migrate.ts`
applies all SQL files in order.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Test      | `pnpm test:unit`         | 104/104 pass        |
| Migrate   | `pnpm db:migrate`        | exit 0              |
| Generate  | `drizzle-kit generate`   | exit 0              |

## Scope

**In scope**:
- `lib/db/migrations/meta/` — create missing snapshot files
- `lib/db/migrations/meta/_journal.json` — update if needed

**Out of scope**:
- Modifying any migration SQL files
- Changing `lib/db/schema.ts`
- Changing `lib/db/migrate.ts`
- Creating new migrations

## Git workflow

- Branch: `advisor/010-drizzle-snapshots`
- Single commit: `chore: regenerate Drizzle snapshots for migrations 0008-0010`

## Steps

### Step 1: Snapshot the current schema against the DB

Option A (if a dev DB is available at `POSTGRES_URL`):
```bash
# Ensure the dev DB has all migrations applied
pnpm db:migrate

# Generate a new migration — this produces a fresh snapshot
drizzle-kit generate
```

This will create a new migration `0011_*.sql` AND update the snapshot for
idx 8–10 by regenerating `_journal.json` and the snapshot files. The
generated `0011_*.sql` will be empty (no schema changes), which is what
we want — confirm the SQL file has no DDL statements. If it does, the
DB schema and the schema.ts don't match — that's a STOP condition.

Then delete the empty `0011_*.sql` since it adds nothing, keeping only
the updated meta files.

Option B (if no dev DB is available):
Create the snapshot files manually by copying the `0007_snapshot.json`
and updating the version/tag fields. This is fragile — prefer Option A.

**Verify**: Run Option A:

```bash
drizzle-kit generate 2>&1
```

If it outputs "No schema changes" and creates an empty `0011_*.sql`, proceed.

```bash
# Confirm migration is empty
cat lib/db/migrations/0011_*.sql
# Should output "/* empty */" or similar
```

If the migration SQL contains actual DDL statements (ALTER TABLE, CREATE
TABLE, etc.), that means the schema has drifted. **STOP and report** — do
not apply it.

### Step 2: Clean up the empty migration

Delete the empty `0011_*.sql` file that `drizzle-kit generate` created:

```bash
rm lib/db/migrations/0011_*.sql
```

Also remove its entry from `_journal.json` if `drizzle-kit` added one (it
should have updated the existing entries, not added a new one — verify).

**Verify**: `ls lib/db/migrations/0011_*.sql` returns nothing.

### Step 3: Verify the snapshots exist

```bash
ls lib/db/migrations/meta/0008_snapshot.json
ls lib/db/migrations/meta/0009_snapshot.json
ls lib/db/migrations/meta/0010_snapshot.json
```

All three must exist. Also verify `_journal.json` is still consistent
(has entries 0–10, no duplicates).

### Step 4: Full verification

```bash
pnpm db:migrate
npx tsc --noEmit
pnpm test:unit
pnpm build
```

All must pass.

## Test plan

No new tests. Verification is manual: `ls` confirms the files exist, and
`pnpm db:migrate` confirms the journal is valid.

## Done criteria

- [ ] `lib/db/migrations/meta/0008_snapshot.json` exists
- [ ] `lib/db/migrations/meta/0009_snapshot.json` exists
- [ ] `lib/db/migrations/meta/0010_snapshot.json` exists
- [ ] The `_journal.json` has entries for idx 0–10 (unchanged — or updated
      consistently by `drizzle-kit`)
- [ ] No new migration SQL files were left behind (`.sql` count matches the
      original 11 + the journal)
- [ ] `pnpm db:migrate` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm test:unit` exits 0 (104/104)
- [ ] `pnpm build` exits 0
- [ ] Only files under `lib/db/migrations/meta/` were modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- If `drizzle-kit generate` produces a non-empty migration (with DDL):
  the schema has drifted from the DB state. Stop and report the differences.
  Resolution requires reconciling `schema.ts` with the live DB before
  snapshots can be regenerated.
- If no dev DB is available: Option A can't run. Attempt Option B (manual
  snapshot construction) but flag it as a temporarily fragile fix —
  recommend a follow-up with DB access to verify.
- If `drizzle-kit` updates the journal in a way that drops existing entries:
  stop immediately and restore from git.

## Maintenance notes

- After this fix, `pnpm db:generate` will produce accurate incremental
  migrations without false-positive diffs.
- All future migrations should be created via `drizzle-kit generate` (which
  auto-creates the snapshot) or the SQL must be paired with a manual snapshot
  update in the same commit.
- If existing migrations need to be reordered or squashed, this is the
  prerequisite work.
