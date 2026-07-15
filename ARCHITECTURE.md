# ARCHITECTURE.md

System architecture for **GCSE Mastery / TeachingChatbot**. For coding
standards and conventions see [`AGENTS.md`](AGENTS.md); for reusable workflows
see [`SKILLS.md`](SKILLS.md).

---

## 1. System architecture

A single Next.js 16 (App Router) application deployed on Vercel, backed by
serverless PostgreSQL (Neon) and Redis, calling free-tier LLM providers through
the Vercel AI SDK.

```
┌──────────────────────────── Browser (React 19) ────────────────────────────┐
│  Student chat UI · Learning map · Quizzes · Guardian dashboard              │
└───────────────┬──────────────────────────────────────────────┬─────────────┘
                │ SWR / Server Actions / streamed UI messages    │
┌───────────────▼──────────────────────────────────────────────▼─────────────┐
│                       Next.js App Router (Vercel)                            │
│  Route groups:  (auth)   (chat)   (parent)        app/api/*                  │
│  Route Handlers → auth() · Zod validation · entitlements · rate limit        │
│                                                                              │
│  lib/ai         providers + fallback, prompts, tools/, agents/               │
│  lib/questions  deterministic archetype engine (no LLM)                      │
│  lib/adaptive · lib/learning-science   mastery / spaced repetition           │
│  lib/db         Drizzle schema + queries/*                                   │
└───────┬───────────────────────┬──────────────────────────┬──────────────────┘
        │                       │                          │
 ┌──────▼──────┐        ┌───────▼────────┐         ┌───────▼─────────┐
 │ Neon Postgres│       │  Redis          │         │ LLM providers    │
 │ (Drizzle ORM)│       │ (resumable      │         │ Gemini / Groq /  │
 │              │       │  streams, cache)│         │ OpenRouter       │
 └──────────────┘       └────────────────┘         └──────────────────┘
```

## 2. Folder responsibilities

| Path | Responsibility |
|---|---|
| `app/(auth)` | Login/register pages + NextAuth route handlers |
| `app/(chat)` | Chat UI and the core chat/lesson/model/document APIs |
| `app/(parent)` | Guardian dashboard, admin UI, and admin **agent** routes |
| `app/api` | Cross-cutting APIs: AI hints/explain-error, guardian goals, profiles, learning-science, retrieval-practice |
| `components` | Presentational + interactive React (`ui/`, `ai-elements/`, `chat/`, `brand/`) |
| `lib/ai` | Provider selection & fallback, tutor prompts, model-agnostic `tools/`, multi-step `agents/`, curriculum, entitlements |
| `lib/questions` | Deterministic GCSE archetype question generator (zero-LLM) |
| `lib/adaptive` | Adaptive challenge selection by weakest skill / difficulty band |
| `lib/learning-science` | Mastery scoring, misconception tracking, spaced repetition |
| `lib/db` | Drizzle `schema.ts`, `migrations/`, `queries/*`, `client.ts`, `migrate.ts` |
| `lib/artifacts`, `lib/editor` | Artifact documents + ProseMirror/CodeMirror editing |
| `data`, `docs/*.json` | Seed inputs: curriculum + question archetypes |
| `scripts` | Seed scripts run during `pnpm build` and `pnpm seed` |
| `tests` | Playwright e2e (`e2e/`, `pages/`, fixtures/helpers) |

## 3. Data flow

**Chat / tutoring (LLM path)**

1. Client `useChat` POSTs to `app/(chat)/api/chat/route.ts`.
2. Route: `botid` check → `auth()` → Zod parse (`schema.ts`) → entitlements →
   IP rate limit.
3. Provider candidates resolved in `lib/ai/providers`; `streamTextWithFallback`
   tries providers in order with the tutor system prompt + curriculum-aware
   tools (`lib/ai/tools/*`).
4. Response streamed via `createUIMessageStream`; long generations use
   `resumable-stream` (Redis) so reloads can resume.
5. Messages/chat persisted through `lib/db/queries/*`; analytics via
   `logAICall`.

**Practice / quizzes (deterministic path — no LLM)**

1. Adaptive challenge & archetype routes call `lib/adaptive` + `lib/questions`.
2. Questions are generated from JSON archetype templates; answers scored by
   `lib/learning-science` mastery logic.
3. Mastery, misconceptions, XP/streaks upserted via `lib/db/queries/*`.

**Guardian / admin**

1. `app/(parent)` reads mastery/analytics via queries.
2. Admin **agents** (`lib/ai/agents/*` + `app/(parent)/api/admin/agents/*`) run
   batch LLM tasks: curriculum builder, quiz builder, artifact validator,
   misconception analysis, guardian insight.

## 4. State management

- **Server state:** RSC + Server Actions; client reads via **SWR**.
- **AI streaming:** `@ai-sdk/react` `useChat` ⇄ `createUIMessageStream`;
  resumable via Redis.
- **Local UI:** React hooks + `usehooks-ts`; theming via `next-themes`. No
  global store by default.

## 5. API design

- Route Handlers under `app/**/api/**/route.ts`.
- Contract: `botid` (where applicable) → `auth()` → **Zod** body validation →
  entitlements → rate limit → handler.
- Errors: typed `ChatbotError` (`` `${type}:${surface}` ``) →
  `error.toResponse()`; `"log"` surfaces return generic messages.
- Data access is centralized in `lib/db/queries/*` (no inline Drizzle in
  handlers).

## 6. Build pipeline

`pnpm build` (see `package.json`) runs, in order:

1. `tsx lib/db/migrate` — apply Drizzle migrations.
2. Seed scripts — `seed-all-curriculum`, `seed-question-archetypes`,
   `seed-curriculum-artifacts`, `seed-six-card-topic-pack`.
3. `next build`.

⇒ A reachable `POSTGRES_URL` is required at build time. Lint/format is Biome +
Ultracite (`pnpm check` / `pnpm fix`); types via `tsc` (Next). Migrations are
generated with drizzle-kit (`pnpm db:generate`).

## 7. Deployment

- **Platform:** Vercel, framework preset `nextjs`, region `lhr1`
  (`vercel.json`).
- **Cron:** `/api/cron/cleanup-guests` daily at 03:00 (guest chat retention),
  guarded by `CRON_SECRET`.
- **Runtime services:** Neon Postgres, Redis, Vercel Blob, plus LLM provider
  keys — all via environment variables (`.env.example` documents them).
- **Modes:** `APP_MODE=FREE` (default) limits guests (5 questions/day, 24h
  retention, no history); `PREMIUM` gates admin/approval features. Provider
  routing is independent of `APP_MODE`.
- No repository CI workflows today; quality gates run locally / in review. See
  the follow-up recommendations in the upgrade summary.
