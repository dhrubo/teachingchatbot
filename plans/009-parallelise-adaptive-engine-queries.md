# Plan 009: Parallelise adaptive engine DB queries

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- lib/adaptive/engine.ts lib/db/queries/questions.ts`
> Read the current `selectFromSkills` and `recordAnswer` functions to confirm
> they match the description below.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001 (indexes) — beneficial but not required
- **Category**: perf
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

In `lib/adaptive/engine.ts`, the `selectFromSkills` function (called for every
question fetch) runs 4 independent DB queries sequentially:
1. `getSkillSlugsForMission` — skill → lesson mapping (can be PROMISE.all'd)
2. `getMasteryForSkills` — student's current mastery
3. `getArchetypesForSkillBand` — question templates for the chosen band
4. `getRecentAttempts` — archetype recency for dedup

None depends on the prior one's result. On Vercel serverless with a ~100ms
cold-start overhead, these serial round-trips add 200–400ms of wall-clock
latency per question. Over a 5-question challenge, that's 1-2 seconds of
avoidable waiting.

Additionally, `recordAnswer` fetches mastery again (a second `getMasteryForSkills`
call within the same request scope) when it could reuse the already-fetched data.

## Current state

`lib/adaptive/engine.ts:69-151`:
```typescript
async function selectFromSkills(params: {
  studentId?: string; guestSessionId?: string;
  skillSlugs: string[]; rng?: () => number;
}): Promise<NextQuestion | null> {
  // ...
  const masteryRows = params.studentId
    ? await getMasteryForSkills(params.studentId, skillSlugs)  // query 1
    : [];
  // ... builds masteryBySkill map ...
  const skillSlug = selectWeakestSkill(skillSlugs, masteryBySkill);
  const band = selectNextBand({ mastery: masteryBySkill.get(skillSlug), rng });
  const archetypes = await getArchetypesForSkillBand(skillSlug, band);  // query 2
  const recent = await getRecentAttempts({ ... });  // query 3
  // ... picks archetype, generates question ...
}
```

That's 3 queries (queries 1, 2, 3) — the subagent report said 4. The 4th
was `getSkillSlugsForMission` which runs before `selectFromSkills` is called
in the parent function. So the actual count in `selectFromSkills` is 3
sequential queries. Let me verify the `recordAnswer` path as well:

```typescript
export async function recordAnswer(params: { ... }) {
  // ... grade, detect misconception ...
  await recordAttempt({ ... });  // query
  if (!params.studentId) return { isCorrect, mastery: null };
  const existing = await getMasteryForSkills(params.studentId, [params.skillSlug]);  // query (redundant)
  // ... update mastery ...
  await upsertMastery(params.studentId, { ... });  // query
}
```

The `getMasteryForSkills` call in `recordAnswer` is redundant because
`selectFromSkills` already fetched it. The caller could pass the result
through, or the function could accept an optional `currentMastery` parameter.

## Commands you will need

| Purpose   | Command               | Expected on success |
|-----------|-----------------------|---------------------|
| Typecheck | `npx tsc --noEmit`    | exit 0, no errors   |
| Tests     | `pnpm test:unit`      | 104/104 pass        |
| Build     | `pnpm build`          | exit 0              |

## Scope

**In scope**:
- `lib/adaptive/engine.ts` — parallelise `selectFromSkills` queries, dedupe
  mastery fetch in `recordAnswer`
- `lib/db/queries/questions.ts` — optionally batch `getArchetypesForSkillBand`
  to return candidates for all bands in one query

**Out of scope**:
- Changing the adaptive challenge API route (`/api/adaptive-challenge`)
- Changing the question generation or grading logic
- Changing the Mastery model or update functions

## Git workflow

- Branch: `advisor/009-parallel-adaptive`
- Two commits:
  1. `perf: parallelise independent DB queries in selectFromSkills`
  2. `perf: reuse mastery data in recordAnswer to avoid redundant fetch`

## Steps

### Step 1: Parallelise `selectFromSkills` read queries

Replace the sequential await chain with `Promise.all`. The three independent
queries are:
- `getMasteryForSkills(studentId, skillSlugs)` — depends only on `skillSlugs`
  (already available from params)
- `getArchetypesForSkillBand(...)` — depends on `skillSlug` and `band`
- `getRecentAttempts(...)` — depends on studentId/guestSessionId

**Problem**: `getArchetypesForSkillBand(skillSlug, band)` and
`getRecentAttempts(...)` both depend on the result of `selectWeakestSkill`
and `selectNextBand`, which depend on `getMasteryForSkills`. So they can't
trivially be run in parallel with it.

The correct decomposition:
1. Fire `getMasteryForSkills` first (required to pick the weakest skill).
2. Then fire `getArchetypesForSkillBand` and `getRecentAttempts` in parallel
   (both depend on the skill selection from step 1).

```typescript
async function selectFromSkills(params: { ... }): Promise<NextQuestion | null> {
  // ... early returns for empty skillSlugs ...

  // Step 1: Fetch mastery (needed to pick weakest skill)
  const masteryRows = params.studentId
    ? await getMasteryForSkills(params.studentId, skillSlugs)
    : [];
  const masteryBySkill = new Map(/* ... build map ... */);
  const skillSlug = selectWeakestSkill(skillSlugs, masteryBySkill);
  if (!skillSlug) return null;
  const band = selectNextBand({ mastery: masteryBySkill.get(skillSlug), rng });

  // Step 2: These two are independent — parallelise them
  const [archetypes, recent] = await Promise.all([
    getArchetypesForSkillBand(skillSlug, band),
    getRecentAttempts({
      studentId: params.studentId,
      guestSessionId: params.guestSessionId,
      limit: 10,
    }),
  ]);

  // ... rest unchanged ...
}
```

**Verify**: `npx tsc --noEmit`, `pnpm test:unit`
Must exit 0.

### Step 2: Pass mastery into `recordAnswer` to avoid redundant fetch

Currently `recordAnswer` fetches mastery again:
```typescript
const existing = await getMasteryForSkills(params.studentId, [params.skillSlug]);
```

Add an optional `currentMastery` parameter to `recordAnswer` so the caller
(in `index.ts` of the adaptive module or the API route) can pass the mastery
it already fetched:

```typescript
export async function recordAnswer(params: {
  // ... existing params ...
  currentMastery?: MasteryState;  // NEW: optional, avoids redundant fetch
}): Promise<{ isCorrect: boolean; mastery: MasteryState | null }> {
  // ... grade, detect misconception, recordAttempt ...
  if (!params.studentId) return { isCorrect, mastery: null };

  const current: MasteryState = params.currentMastery
    ?? (await getMasteryForSkills(params.studentId, [params.skillSlug]))
      .find((m) => m.skillSlug === params.skillSlug)
    ?? emptyMastery();

  const next = updateMastery(current, { isCorrect, difficultyBand: params.difficultyBand });
  await upsertMastery(params.studentId, { ... });
  return { isCorrect, mastery: next };
}
```

Then update the caller (likely in the adaptive challenge API route or an
orchestrator) to pass the mastery data it already has.

**Find the caller(s)**:
```bash
grep -rn "recordAnswer" lib/ app/ --include="*.ts" --include="*.tsx"
```

For each caller, pass `currentMastery` if mastery was already fetched in the
same request scope.

**Verify**: `npx tsc --noEmit`, `pnpm test:unit`
Must exit 0.

### Step 3: Full verification

```bash
npx tsc --noEmit
pnpm test:unit
pnpm build
```

All must pass.

## Test plan

- **Existing**: `update-mastery.test.ts`, `select-next-question.test.ts`,
  `detect-misconception.test.ts` — all must pass unchanged (the leaf functions
  haven't changed).
- **Integration behaviour**: The `recordAnswer` flow with both `currentMastery`
  set and unset should be tested. Add a test case calling `recordAnswer` with
  `currentMastery` and verify no DB fetch occurs for mastery (observable via
  a spy on `getMasteryForSkills`). This is a new unit test.

## Done criteria

- [ ] `selectFromSkills` runs `getArchetypesForSkillBand` and `getRecentAttempts`
      in parallel via `Promise.all`
- [ ] `recordAnswer` accepts optional `currentMastery` parameter
- [ ] `recordAnswer` skips `getMasteryForSkills` when `currentMastery` is provided
- [ ] All callers of `recordAnswer` pass `currentMastery` when available
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm test:unit` exits 0 (104/104)
- [ ] `pnpm build` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- If the `recordAnswer` caller doesn't have mastery data in scope: don't
  force a larger refactor. The optional parameter gracefully falls back.
- If `Promise.all` with one rejected promise causes the other to be lost:
  the current error handling already wraps each query in its own try/catch
  pattern? Let me check... The queries don't have individual error handling.
  Add individual `.catch()` handlers so a single query failure doesn't sink
  the whole parallel batch.

## Maintenance notes

- If a new query is added to `selectFromSkills`, check whether it depends on
  the skill selection or can be fired in parallel.
- The parallelised queries still benefit from the indexes added in Plan 001
  — less contention means parallel queries finish faster.
