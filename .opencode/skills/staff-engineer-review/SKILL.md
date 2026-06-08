---
name: staff-engineer-review
description: >
  Use before schema changes, AI architecture changes, provider changes, or
  onboarding redesigns. Reviews architecture, scaling, maintainability, and
  abstractions at a senior-engineer level.
---

# Staff Engineer Review

Use this skill before making significant architectural changes.

Triggering conditions:
- Database schema changes (`lib/db/schema.ts`)
- AI provider architecture changes (`lib/ai/providers.ts`, `lib/ai/models.ts`)
- Onboarding flow redesigns (`app/(auth)/`, `app/(chat)/`)
- New tools or tool infrastructure (`lib/ai/tools/`)
- Major dependency changes (`package.json`)

## Review Dimensions

### Architecture
- Is the change consistent with the existing architecture?
- Does it introduce unnecessary coupling?
- Are the boundaries between layers clean (routes → queries → tools)?
- Would the change survive a 10x increase in users?

### Scalability
- Are database queries efficient (indexed, paginated)?
- Are there any N+1 query patterns?
- Are background tasks properly isolated?
- Is streaming handled correctly for AI responses?

### Maintainability
- Would a new contributor understand the change in 5 minutes?
- Are there clear abstractions or is it leaky?
- Is there duplicated logic that should be shared?
- Are error states handled?

### Testing
- Are there tests for the new behaviour?
- Do existing tests need updating?
- Are edge cases covered (empty state, error state, loading state)?

### Free-Tier Compatibility
- Does the change work efficiently with Gemini 2.5 Flash Lite?
- Are token/cost implications considered?
- Could the change cause timeouts on slower models?

## Output

Provide a written review addressing each dimension above.
Flag concerns as **BLOCKING** or **NON-BLOCKING**.
