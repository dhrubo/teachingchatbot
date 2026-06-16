# Plan 008: Replace `new Function` with sandboxed evaluator

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- lib/questions/`
> Read the current `evaluateExpression` function and confirm the `new Function`
> call still exists.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

`lib/questions/generate-from-archetype.ts:67-71` evaluates archetype expressions
via `new Function(...HELPER_NAMES, ...aliasedNames, '"use strict"; return (${aliased});')`.
While the current data path is narrow (expressions come from seed data), this
is an RCE primitive: if an admin account is compromised, a DB injection occurs,
or a future feature allows user-created archetypes, an attacker can execute
arbitrary Node.js code server-side. The code's own comment acknowledges this is
"never user input" but provides no sandbox — defence-in-depth requires the
evaluator itself to be safe even with untrusted expressions.

## Current state

`lib/questions/generate-from-archetype.ts:56-73`:
```typescript
function evaluateExpression(
  expression: string,
  scope: Record<string, unknown>
): unknown {
  const scopeNames = Object.keys(scope);
  const aliasedNames = scopeNames.map(safeName);
  const scopeValues = Object.values(scope);
  const aliased = aliasExpression(expression, scopeNames);
  const fn = new Function(
    ...HELPER_NAMES,
    ...aliasedNames,
    `"use strict"; return (${aliased});`
  );
  return fn(...HELPER_VALUES, ...scopeValues);
}
```

The `ANSWER_HELPERS` whitelist (`lib/questions/answer-helpers.ts`) contains
math utility functions (`simplifyFraction`, `simplifyRatio`, `round2`, etc.).
The expressions are arithmetic, string templates, and simple comparisons.

Expression examples from the archetype seed data (`data/question-archetypes/`):
- `` `${a} + ${b}` `` (string template)
- `a * b` (multiplication)
- `a > b ? a : b` (comparison)
- `simplifyFraction(a, b)` (whitelisted helper call)

All are math-only — none require Node.js globals, file I/O, or network access.

## Commands you will need

| Purpose   | Command                        | Expected on success |
|-----------|--------------------------------|---------------------|
| Install   | `pnpm add mathjs`              | exit 0              |
| Typecheck | `npx tsc --noEmit`             | exit 0, no errors   |
| Tests     | `pnpm test:unit`               | 104/104 pass        |
| Build     | `pnpm build`                   | exit 0              |

## Scope

**In scope**:
- `lib/questions/generate-from-archetype.ts` (rewrite `evaluateExpression`)
- `lib/questions/answer-helpers.ts` (may need to expose helpers as a scope object)
- `lib/questions/evaluate-expression.test.ts` (new — characterisation tests)
- `package.json` (add `mathjs` dependency)

**Out of scope**:
- Changing the archetype JSON schema or seed data
- Changing `evaluateTemplate` or `resolveVariables` (they call `evaluateExpression`)
- Adding support for non-math expressions (the data doesn't need it)

## Git workflow

- Branch: `advisor/008-sandboxed-evaluator`
- Two commits:
  1. `security: replace new Function with mathjs.evaluate for sandboxed expression evaluation`
  2. `test: add characterisation tests for evaluateExpression`

## Steps

### Step 1: Install `mathjs`

```bash
pnpm add mathjs
```

`mathjs.evaluate()` evaluates a string expression against a scope object
using its own parser — no `new Function`, no access to Node.js globals,
no prototype pollution. It handles arithmetic, comparisons, string ops,
and function calls to whitelisted helpers.

**Verify**:
```bash
node -e "const {evaluate} = require('mathjs'); console.log(evaluate('2+2'))"
```
Must print `4`.

### Step 2: Rewrite `evaluateExpression`

Replace `lib/questions/generate-from-archetype.ts`'s imports and the
`evaluateExpression` function:

1. Add import at the top:
   ```typescript
   import { evaluate } from "mathjs";
   ```

2. Remove the `HELPER_NAMES`, `HELPER_VALUES` constants (lines 18-19) and
   the `safeName`, `aliasExpression`, `evaluateExpression` functions
   (lines 41-73). These all exist solely to support the `new Function` pattern.

3. Replace with:
   ```typescript
   function evaluateExpression(
     expression: string,
     scope: Record<string, unknown>
   ): unknown {
     return evaluate(expression, { ...ANSWER_HELPERS, ...scope });
   }
   ```

That's it. `mathjs.evaluate` takes a scope object and evaluates the expression
against it — no `Function` constructor, no global access, no file system.

**Also update `evaluateTemplate`** (lines 76-81):
```typescript
function evaluateTemplate(expression: string, scope: Record<string, unknown>): string {
  return String(evaluate(expression, { ...ANSWER_HELPERS, ...scope }));
}
```

**Also update `resolveVariables`** (line 117): the `evaluateExpression` call
there will automatically use the new sandboxed version — no change needed.

**Verify**:
```bash
npx tsc --noEmit
```
Must exit 0.

### Step 3: Run existing tests

```bash
pnpm test:unit
```

The existing `generate-from-archetype.test.ts` self-grades all 39 archetypes
(×8 random instances each). All must pass. If any fail, the `mathjs.evaluate()`
syntax differs slightly from JavaScript expressions. Common differences:
- `mathjs` uses `^` for exponentiation (same as JS `**`), but may parse `^`
  differently in some contexts
- String concatenation with `+` works the same
- Template literals like `` `${a} + ${b}` `` are JS syntax, not `mathjs` syntax
  — these will need different handling.

If template-literal expressions fail, handle them separately:
```typescript
function evaluateExpression(expression: string, scope: Record<string, unknown>): unknown {
  // Template literals (backtick strings) are JS syntax — evaluate as before
  // but through mathjs for non-template expressions.
  if (expression.startsWith("`") && expression.endsWith("`")) {
    // Use a limited template evaluation: substitute ${...} parts
    return expression.replace(/\$\{([^}]+)\}/g, (_, expr) =>
      String(evaluate(expr, { ...ANSWER_HELPERS, ...scope }))
    );
  }
  return evaluate(expression, { ...ANSWER_HELPERS, ...scope });
}
```

**Verify**: `pnpm test:unit` exits 0 (104/104).

### Step 4: Add characterisation tests

Create `lib/__tests__/evaluate-expression.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
// Import the actual archetype-generate function and a sample archetype
// to verify real-world expressions evaluate sandboxed.

describe("evaluateExpression sandbox", () => {
  it("rejects access to Node.js globals", () => {
    // mathjs.evaluate does not have access to `process`, `require`, etc.
    // This test confirms the sandbox holds.
    expect(() => evaluate("process.exit()", {})).toThrow();
    expect(() => evaluate("require('fs')", {})).toThrow();
  });

  it("evaluates arithmetic correctly", () => {
    expect(evaluate("2 + 3 * 4", {})).toBe(14);
  });

  it("evaluates expressions with scoped variables", () => {
    expect(evaluate("a * b", { a: 3, b: 5 })).toBe(15);
  });

  it("calls whitelisted helpers from scope", () => {
    const helpers = { simplifyFraction: (a: number, b: number) => `${a}/${b}` };
    expect(evaluate('simplifyFraction(x, y)', { ...helpers, x: 2, y: 4 })).toBe("2/4");
  });
});
```

**Run**: `pnpm test:unit`

**Verify**: All tests pass including the new file.

### Step 5: Full build

```bash
pnpm build
```

Must exit 0.

## Test plan

- **Existing**: `generate-from-archetype.test.ts` self-grades all 39 archetypes
  ×8 instances. These must still pass, confirming the sandboxed evaluator
  produces the same results as `new Function` for all production expressions.
- **New**: `evaluate-expression.test.ts` with sandbox tests (globals rejected,
  arithmetic correct, scoped variables, helper calls).

## Done criteria

- [ ] `pnpm add mathjs` installed successfully
- [ ] `lib/questions/generate-from-archetype.ts` no longer imports `HELPER_NAMES`, `HELPER_VALUES`
- [ ] `new Function` no longer appears in `lib/questions/generate-from-archetype.ts`
      (`grep -n "new Function" lib/questions/` returns empty)
- [ ] `evaluateExpression` uses `mathjs.evaluate()` with `ANSWER_HELPERS` in scope
- [ ] `pnpm test:unit` exits 0 (104/104 + new tests)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm build` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- If `mathjs.evaluate()` cannot handle any of the 39 archetypes' expressions
  (e.g., template literal syntax or JS-specific operators), use the fallback
  in Step 3 (regex-based template substitution) and add a characterisation
  test for each expression type.
- If `mathjs` evaluates an expression differently from native JS (e.g., `^`
  parsed as XOR vs exponentiation), freeze the behaviour with a characterisation
  test and update the archetype seed data if needed.
- If `mathjs.evaluate()` cannot be made to work after reasonable effort,
  fall back to `expr-eval` (a simpler expression parser) or `jexl` — same
  sandbox principle, different syntax.

## Maintenance notes

- All new archetype expressions are automatically sandboxed — no extra work
  when adding question content.
- The `ANSWER_HELPERS` whitelist is still the right mechanism for
  domain-specific math functions passed to the evaluator.
- Reviewers should check that `new Function` doesn't reappear if someone
  finds a case `mathjs` doesn't handle — prefer fixing the expression or
  expanding helpers rather than re-introducing the sandbox bypass.
