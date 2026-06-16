# Plan 004: Exclude `.superpowers/` from lint checks

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- biome.jsonc`
> If the file changed, read the current `files.ignore` section before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

Running `ultracite check` (or `pnpm lint`) reports ~96 errors today, of which
~80 come from `.superpowers/` — an auto-generated cache directory containing
brainstorm HTML mockups with `useButtonType` and similar violations. This makes
the lint signal useless: developers and agents learn to ignore it, and real
lint issues in active code get buried in the noise.

## Current state

`biome.jsonc:12-21`:
```jsonc
"files": {
  "includes": [
    "**/*",
    "!components/ai-elements",
    "!components/elements",
    "!components/ui",
    "!lib/utils.ts",
    "!hooks/use-mobile.ts"
  ]
}
```

`.superpowers/` is not excluded. The existing exclusions are for generated or
third-party UI components.

## Commands you will need

| Purpose   | Command               | Expected on success |
|-----------|-----------------------|---------------------|
| Lint      | `pnpm lint`           | exit 0 (or at most the same real errors as before) |
| Typecheck | `npx tsc --noEmit`    | exit 0              |
| Tests     | `pnpm test:unit`      | 104/104 pass        |

## Scope

**In scope**:
- `biome.jsonc` (add one exclusion entry)

**Out of scope**:
- Any other changes to lint config, rules, or exclusions
- Removing existing exclusions

## Git workflow

- Branch: `advisor/004-exclude-superpowers`
- Single commit: `dx: exclude .superpowers/ from lint checks`

## Steps

### Step 1: Add `.superpowers/` to lint exclusions

Open `biome.jsonc`. Add `"!.superpowers"` to the `files.includes` array, placed
alphabetically (after the existing entries):

```jsonc
"files": {
  "includes": [
    "**/*",
    "!components/ai-elements",
    "!components/elements",
    "!components/ui",
    "!hooks/use-mobile.ts",
    "!lib/utils.ts",
    "!.superpowers"
  ]
}
```

### Step 2: Verify the error count drops

```bash
pnpm lint 2>&1 | tail -5
```

The error count should drop by roughly 80 (from ~96 to ~16 real errors).
If the remaining errors are all from excluded files, double-check the
`!.superpowers` syntax is correct (the leading `!` negates the include).

**Verify** by checking that `.superpowers/` files are no longer flagged:
```bash
pnpm lint 2>&1 | grep -i ".superpowers" | wc -l
```
Should be 0.

### Step 3: Verify no regression

```bash
npx tsc --noEmit
pnpm test:unit
```

Both must pass.

## Test plan

No new tests. Only verify the lint count.

## Done criteria

- [ ] `biome.jsonc` has `"!.superpowers"` in the `files.includes` array
- [ ] `pnpm lint` no longer reports errors from `.superpowers/` files
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm test:unit` exits 0 (104/104)
- [ ] Only `biome.jsonc` was modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- If `pnpm lint` breaks with a Biome config parsing error, the array syntax
  may be wrong. Validate JSONC is strictly correct.
- If `.superpowers/` doesn't exist (was deleted or renamed), still add the
  exclusion — it's defensive and costs nothing.

## Maintenance notes

- If the linter tool changes or `.superpowers/` is moved, this exclusion
  should be updated to match.
- The remaining ~16 lint errors (from real source code) are worth addressing
  separately.
