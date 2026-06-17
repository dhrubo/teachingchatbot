# Quota-Aware Fallback Layer

## Problem

The app uses Google Gemini free-tier API keys for AI features (hints, error
explanations, parent reports, curriculum generation). Free-tier limits are
roughly 10–15 RPM / 250k TPM / 250–1500 RPD depending on model. When quota
is exhausted, the AI features fail silently or throw quota errors.

The learning loop (questions, grading, mastery updates, retrieval practice) is
already 100% deterministic and unaffected. But hints, explanations, and reports
become unavailable with no graceful degradation.

## Design

### One module: `lib/ai/quota-monitor.ts`

No new DB tables. Reuses the existing `AiCall` table which already logs every
LLM call with `purpose`, `modelUsed`, `promptTokens`, `completionTokens`,
and `createdAt`.

### Three criticality tiers

| Tier | Purposes | Behaviour near limit |
|---|---|---|
| 🔴 Critical | `chat`, `hint` | Never blocked. Uses cheapest available model when amber. |
| 🟡 Important | `explanation`, `open_answer_grading` | Skipped with cached/default response when amber. |
| 🟢 Deferrable | `parent_report`, `misconception_map`, `summary` | Queued / skipped entirely when amber. |

### Quota thresholds

Queried from `AiCall` table — counts today's calls across the whole project:

| State | Usage | Calls remaining (est.) | Behaviour |
|---|---|---|---|
| Green | < 60% | > 600 | Normal operation |
| Amber | 60–80% | 100–600 | Skip deferrable, use Flash-Lite for important, degrade hints |
| Red | > 80% | < 100 | Critical-only, everything else deferred/queued |

The monitor caches quota state for 60 seconds to avoid pounding the DB on
every request.

### Runtime gate

Every AI route calls `checkQuota(purpose)` before calling the LLM:

```ts
const { action, reason } = await checkQuota("explanation");
if (action !== "proceed") {
  // action is "defer" or "prefer_lite"
  return fallbackResponse(action, reason);
}
```

### Fallback responses per purpose

| Purpose | Amber fallback | Red fallback |
|---|---|---|
| `hint` | "Think about what the question is asking." | Same |
| `explanation` | Deterministic tag-only (no LLM) | Same |
| `parent_report` | "Report generation queued" | Skipped |
| `misconception_map` | Skipped (batch deterministic already runs) | Same |
| `summary` | Deferred | Skipped |
| `curriculum_gen` | Admin-only, blocked early | Blocked |

### Files changed

- `lib/ai/quota-monitor.ts` — new (quota state + runtime gate)
- `app/api/ai/hint/route.ts` — wire gate before LLM call
- `app/api/ai/explain-error/route.ts` — wire gate before LLM call
- `lib/ai/agents/guardian-insight.ts` — wire gate before LLM call
- `lib/ai/agents/curriculum-builder.ts` — wire gate (block early when not green)
- `lib/ai/agents/misconception-agent.ts` — wire gate (always skip when not green)
- `lib/__tests__/quota-monitor.test.ts` — tests for quota state + gate
