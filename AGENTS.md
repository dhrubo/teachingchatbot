# AGENTS.md

Operating guide for AI agents (OpenCode, Claude Code, Cursor, Codex) and human
contributors working in this repository. Read this before making changes.

> The chronological development log formerly kept here now lives in
> [`docs/agents-log.md`](docs/agents-log.md). This file is the durable
> **project standards** document.

---

## 1. Project overview

**GCSE Mastery / TeachingChatbot** is a personalized, Duolingo-style GCSE
learning platform and Socratic AI tutor for secondary-school students (Year 8–9
Maths and Science), with a parent/guardian insight dashboard.

Design goals that shape almost every decision:

- **Free-tier first.** The app is built to run on free AI provider tiers
  (Google Gemini, Groq, OpenRouter). Prefer deterministic, template-based logic
  over LLM calls wherever correctness allows (e.g. the archetype question
  engine and deterministic chat titles).
- **Socratic, safe tutoring.** The AI scaffolds and hints; it does not hand over
  answers. Persona and curriculum scope are enforced in `lib/ai/prompts-tutor`.
- **Guardian oversight.** Parents manage multiple student profiles, set goals,
  and view mastery analytics.

## 2. Technology stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack dev, React Compiler) |
| UI | React 19, Tailwind CSS 4, Radix UI, shadcn-style components, Framer Motion |
| Language | TypeScript 5.6, strict mode, ESM |
| AI | Vercel AI SDK v6 (`ai`), providers: Google Gemini, Groq, OpenRouter |
| Database | PostgreSQL (Neon) via `postgres` + Drizzle ORM |
| Auth | NextAuth v5 (beta) |
| Lint/format | **Biome + Ultracite** (`biome.jsonc`) — *not* ESLint/Prettier |
| Tests | Vitest (unit), Playwright (e2e) |
| Package manager | **pnpm** (see `packageManager` in `package.json`) |
| Deploy | Vercel (`vercel.json`, region `lhr1`) |

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the system design and data flow.

## 3. Folder conventions

```
app/                 Next.js App Router (route groups + API routes)
  (auth)/            Authentication (login, register, NextAuth handlers)
  (chat)/            Chat UI + chat/lesson/model API routes
  (parent)/          Guardian dashboard, admin, and admin agent routes
  api/               Cross-cutting APIs (ai hints, guardian, profiles, ...)
components/          React components (ui/, ai-elements/, chat/, brand/)
lib/
  ai/                Provider config, prompts, tools/, agents/, curriculum
  adaptive/          Adaptive challenge engine
  learning-science/  Spaced-repetition / mastery / misconception logic
  questions/         Question archetype engine
  db/                Drizzle schema, migrations, queries/
  artifacts/         Artifact document handlers
  editor/            ProseMirror / CodeMirror editor glue
data/                Curriculum + question-archetype JSON (seed inputs)
docs/                Product, developer, provider & curriculum docs
scripts/             Seed scripts (curriculum, archetypes, artifacts)
tests/               Playwright e2e (tests/e2e), page objects, fixtures
```

Rules:

- **Path alias:** import from `@/…` (maps to repo root). Do not use long
  relative chains (`../../../`).
- **Server-only modules** (DB client, secrets) must `import "server-only"`.
- Database access goes through `lib/db/queries/*` — do **not** build ad-hoc
  Drizzle queries inside route handlers or components.
- AI tools live in `lib/ai/tools/`; multi-step AI "agents" live in
  `lib/ai/agents/` with a matching admin route under
  `app/(parent)/api/admin/agents/`.

## 4. Naming conventions

- **Files:** kebab-case (`get-curriculum-topics.ts`, `stream-with-provider-fallback.ts`).
- **React components:** PascalCase export; file kebab-case.
- **DB tables:** PascalCase table names in `schema.ts` (e.g. `User`), columns
  camelCase.
- **Env vars:** SCREAMING_SNAKE_CASE, documented in `.env.example`.
- **Route folders:** lowercase; grouping folders in parentheses `(group)`.

## 5. Coding standards

- TypeScript **strict**; prefer explicit types on public/exported surfaces.
  `noExplicitAny` is disabled in Biome but avoid `any` in new code.
- Follow existing patterns — do **not** introduce a new styling/state/query
  convention when one already exists.
- Keep AI tools **model-agnostic**: no hard-coded provider assumptions; route
  through `lib/ai/providers` and `streamTextWithFallback`.
- Prefer deterministic logic over an LLM call when the result can be computed
  (respects the free-tier goal).
- 2-space indentation, spaces not tabs (enforced by Biome + `.editorconfig`).

## 6. State management

- **Server state / data fetching:** React Server Components + Server Actions;
  client-side reads use **SWR** (`swr`).
- **Streaming AI UI:** AI SDK `@ai-sdk/react` (`useChat`) with
  `createUIMessageStream` on the server; resumable streams via
  `resumable-stream` + Redis.
- **Local UI state:** React hooks and `usehooks-ts`; avoid adding a global
  store unless a clear need arises.
- **Theming:** `next-themes`.

## 7. API conventions

- API routes are Next.js Route Handlers under `app/**/api/**/route.ts`.
- **Validate every request body with Zod.** Co-locate the schema as
  `schema.ts` next to the route (see `app/(chat)/api/chat/schema.ts`).
- Authenticate with `auth()` from `@/app/(auth)/auth`; check entitlements via
  `lib/ai/entitlements` and rate limits via `lib/ratelimit`.
- Long-running AI routes set `export const maxDuration = …`.
- Return `Response.json(...)`; for streaming use the AI SDK stream helpers.

## 8. Error handling

- Throw the typed `ChatbotError` from `@/lib/errors` using an
  `ErrorCode` of the form `` `${type}:${surface}` `` (e.g. `unauthorized:chat`,
  `rate_limit:api`).
- Convert to an HTTP response with `error.toResponse()`. The status code is
  derived from the type, and the message/visibility from the surface.
- Surfaces marked `"log"` (e.g. `database`) are logged server-side and return a
  generic message — never leak internal detail to the client.
- Do not invent new ad-hoc error shapes; extend `ErrorType`/`Surface` in
  `lib/errors.ts` if a new category is genuinely needed.

## 9. Testing standards

- **Unit:** Vitest (`pnpm test:unit`, watch: `pnpm test:unit:watch`).
  Co-locate unit tests near source or under `lib/__tests__`.
- **E2E:** Playwright (`pnpm test`) under `tests/e2e`, using the page objects in
  `tests/pages` and helpers in `tests/fixtures.ts` / `tests/helpers.ts`.
- Add or update tests with every behavioral change. Deterministic engines
  (archetypes, mastery scoring) should have unit coverage.
- Do not commit `test-results/` or `playwright-report/` (gitignored).

## 10. Local workflow

```bash
pnpm install
cp .env.example .env.local   # set POSTGRES_URL, AUTH_SECRET, a provider key
pnpm db:migrate
pnpm dev                      # http://localhost:3000
pnpm check                    # Biome/Ultracite lint (pnpm fix to autofix)
pnpm test:unit
```

Note: `pnpm build` runs DB migrate + seed scripts before `next build`, so it
requires a reachable `POSTGRES_URL`.

## 11. Pull request checklist

- [ ] Scope is one logical change; commits are small and descriptive.
- [ ] `pnpm check` passes (Biome/Ultracite) with no new warnings.
- [ ] `pnpm test:unit` passes; relevant e2e tests updated.
- [ ] New request bodies are Zod-validated; errors use `ChatbotError`.
- [ ] DB access goes through `lib/db/queries/*`; migrations generated if the
      schema changed (`pnpm db:generate`).
- [ ] No secrets committed; new env vars documented in `.env.example`.
- [ ] AI tools remain model-agnostic; deterministic paths preferred.
- [ ] Docs updated (`README.md` / `docs/` / this file) when behavior or setup
      changes.
- [ ] The development log in `docs/agents-log.md` is updated for notable
      milestones.

## 12. MCP & AI tooling

MCP servers are configured in [`opencode.json`](opencode.json) (OpenCode) and
[`.mcp.json`](.mcp.json) (Claude Code / Cursor): Context7, GitHub, Playwright,
Sequential Thinking, Filesystem, and PostgreSQL. Project-specific OpenCode
skills live in `.opencode/skills/`. See [`docs/opencode.md`](docs/opencode.md)
for the skill catalogue and [`SKILLS.md`](SKILLS.md) for reusable engineering
workflows.
