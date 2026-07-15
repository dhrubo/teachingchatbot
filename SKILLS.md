# SKILLS.md

Reusable engineering workflows for this repository. Each workflow lists the
concrete steps, the repo commands, and the OpenCode skills / MCP servers that
help. OpenCode skills load automatically or via `use skill tool to load <name>`;
the skill catalogue is in [`docs/opencode.md`](docs/opencode.md).

Standing rules (from `AGENTS.md`): follow existing conventions, keep AI tools
model-agnostic, prefer deterministic logic over LLM calls, validate inputs with
Zod, and raise typed `ChatbotError`s.

---

## Building a feature

1. **Clarify** the requirement (OpenCode `brainstorming`). Confirm scope,
   curriculum impact, and free-tier cost.
2. **Design** — locate the right layer: UI in `components/`, route in
   `app/**/api`, domain logic in `lib/*`, data access in `lib/db/queries/*`.
   Look up unfamiliar library APIs with the **Context7** MCP.
3. **Plan** small tasks (OpenCode `writing-plans`).
4. **Implement** behind the existing patterns; add a Zod schema for any new
   request body; go through `lib/db/queries/*` for data.
5. **Verify**: `pnpm check`, `pnpm test:unit`, and drive the flow with the
   **Playwright** MCP / `webapp-testing` skill.
6. **Document** in `README.md`/`docs/` and add a note to `docs/agents-log.md`.

## Fixing a bug

Use OpenCode `systematic-debugging`:

1. **Reproduce** deterministically (unit test or Playwright script).
2. **Observe** — read logs; use the **PostgreSQL** MCP to inspect data state.
3. **Hypothesise** the root cause (don't patch symptoms).
4. **Fix** at the root; keep the change minimal.
5. **Verify** the reproduction now passes and nothing regressed
   (`pnpm test:unit`, targeted e2e).
6. **Guard** with a regression test.

## Refactoring

1. **Pin behavior first** — ensure characterization tests exist before touching
   code; add them if missing.
2. Refactor in **small, behavior-preserving** steps; run `pnpm check` +
   `pnpm test:unit` after each.
3. Improve typing, naming, and structure without changing public APIs or
   observable behavior.
4. Prefer extracting to the correct `lib/*` module over inlining logic in
   routes/components.
5. Commit each safe step separately.

## Writing tests

1. **Unit (Vitest):** cover deterministic engines (archetypes, mastery,
   misconception, adaptive) and pure helpers. Co-locate near source or under
   `lib/__tests__`.
2. **E2E (Playwright):** use page objects in `tests/pages` and fixtures in
   `tests/fixtures.ts`; assert user-visible outcomes, not internals.
3. Test the **error paths** (`ChatbotError` codes, rate limits, auth gates).
4. Keep tests provider-independent; mock AI where possible so they run on
   free tiers / CI without keys.

## Reviewing a PR

1. Pull the branch; run `pnpm check` and `pnpm test:unit`.
2. Check against the **PR checklist** in `AGENTS.md`.
3. Verify: Zod validation on new inputs, `ChatbotError` usage, DB access via
   `lib/db/queries/*`, no secrets, model-agnostic AI.
4. Use the **GitHub** MCP to read the diff, comments, and CI status.
5. For architectural or schema changes, load `staff-engineer-review`; for
   security-sensitive changes, load `code-security-auditor`.

## Accessibility

1. Semantic HTML and ARIA roles; every interactive element is keyboard
   reachable and labelled.
2. Respect the design system (`docs/design/GCSE_MASTERY_DESIGN_SYSTEM.md`):
   colour contrast ≥ WCAG AA, visible focus states.
3. Honour reduced-motion for Framer Motion animations.
4. Validate with the **Playwright** MCP (keyboard nav, focus order) and the
   `webapp-testing` skill on mobile + desktop viewports.

## Performance

1. Prefer **Server Components**; keep `"use client"` boundaries small.
2. Avoid unnecessary LLM calls — reuse deterministic engines and cached/titled
   flows (`ENABLE_LLM_TITLE_GENERATION` defaults off).
3. Stream AI responses (`createUIMessageStream`) and use resumable streams.
4. Batch DB access in `lib/db/queries/*`; avoid N+1 queries (inspect with the
   **PostgreSQL** MCP).
5. Watch bundle size (React Compiler is on; don't defeat it with unstable
   props). Use the **Sequential Thinking** MCP to reason through hot paths.

## Security

Load `code-security-auditor` for anything sensitive.

1. **Never** commit secrets; all secrets come from env (`.env.local`) and are
   documented (not valued) in `.env.example`.
2. Validate and authorize every route: `auth()`, entitlements, `lib/ratelimit`,
   and `botid` where relevant.
3. Use parameterized Drizzle queries only; no string-built SQL.
4. Return sanitized errors — surfaces marked `"log"` must not leak internals.
5. Enforce tutor guardrails: the AI must not reveal answers or leave the
   curriculum scope (`lib/ai/prompts-tutor`).
6. Keep student/guardian data access scoped to the authenticated profile.
