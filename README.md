# 🚀 GCSE Mastery: Gamified GCSE Learning App & AI Tutor

Build a personalized Duolingo-style GCSE learning platform for your child, complete with local template-based challenge engines, multi-student selector onboarding, and parent insight dashboards.

Powered by:

- [Next.js](https://nextjs.org) App Router
- [AI SDK](https://ai-sdk.dev) by Vercel
- [Gemini](https://ai.google.dev) by Google
- [Neon](https://neon.tech) Serverless Postgres
- [Tailwind CSS](https://tailwindcss.com)

## Features

- **Syllabus-Gated Learning Map** — Circular mission nodes (Duolingo-style) guiding students through the Year 8 & Year 9 Maths curriculum.
- **Adaptive GCSE-style Archetype Engine** — Generates thousands of unique, context-aware questions dynamically from JSON-defined skill templates with zero LLM API costs.
- **GCSE Subject Switcher** — Beautiful row cards toggling between GCSE Maths 📐 and a stunning GCSE Science 🧪 placeholder with keyframe glow animation.
- **Netflix-Style Multi-Student Selection** — Circular avatar switcher allowing parents of multiple children to manage profiles, paired with a 4-step onboarding stepper (Name -> Year -> Subjects -> Board).
- **Socratic AI Hints Drawer** — Pinned trigger card providing students with short, encouraging scaffolding clues *without* revealing mathematical solutions.
- **Socratic "Why Was I Wrong?" Explainer** — Structured feedback diagnosing the exact misconception committed on any incorrect answer and recording/upserting the error counts inside the database.
- **Syllabus Mastery Heatmap Grid** — Color-coded parent grid mapping student skill levels (Gold for Mastered $\ge 75$, Amber for Secure, Indigo for In-Progress, and Grey for Locked).
- **AI Efficiency Dashboard** — High-fidelity telemetry card metrics tracking questions served, cost per learner, and total prompt/completion tokens saved by using deterministic question templates.
- **Parent Goal-Setter** — Direct goal assigner permitting guardians to select any syllabus topic, enter descriptions, and push custom missions directly to children dashboards.
- **XP, Badges & Streaks** — Complete gamified motivation layer including local Web Audio sound effects (success/wrong) and floating achievements.
- **Deterministic Question Selection** — Selects the next question dynamically based on the student's weakest skills and current difficulty band.
- **Socrates Mastery Scoring** — Updates student skill mastery on a 0-100 scale mapping to must/should/could/gcse_bridge bands.
- **Interactive fullscreen quizzes** — 5-question fullscreen adaptive challenges with zero LLM calls.

## Free Mode Limitations

When `APP_MODE=FREE` (the default), guest users (not signed in) have limited
access:

- **5 questions per day** — after reaching the limit, guests are prompted to
  sign up or come back the next day.
- **1 conversation** — the current chat session; previous chats are not
  retained.
- **24-hour chat retention** — guest conversations are auto-cleaned after
  24 hours.
- **No history sidebar** — guests cannot browse previous conversations.
- **No admin or parent dashboards** — these features are available only in
  PREMIUM mode.

Set `APP_MODE=PREMIUM` in your environment to unlock all features for all
users (registered user features remain unchanged; guest limits still apply).

## Quick Start

### 1. Get a free Gemini API key

Visit [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.

No credit card required.

### 2. Clone and set up

```bash
git clone <your-repo-url>
cd teachingchatbot
pnpm install
```

### 3. Configure environment

Copy `.env.example` to `.env.local` and add your keys:

```bash
cp .env.example .env.local
```

The minimum required config:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here
GOOGLE_GENERATIVE_AI_MODEL=gemini-3.1-flash-lite
POSTGRES_URL=your_neon_database_url
AUTH_SECRET=your_random_secret
```

### 4. Set up the database

```bash
pnpm db:migrate
```

### 5. Run locally

```bash
pnpm dev
```

Open [localhost:3000](http://localhost:3000) and start teaching.

### 6. Deploy to Vercel

Import the repository into Vercel and add these environment variables:

- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GOOGLE_GENERATIVE_AI_MODEL`
- `POSTGRES_URL`
- `AUTH_SECRET`

Deploy. Done.

## AI Providers

The tutor works out-of-the-box with **Gemini** (free tier, no credit card needed). Add Groq and/or OpenRouter for **automatic fallback** when quota runs out.

| Provider | Requirement | Default Model |
|---|---|---|
| **Gemini** (default) | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-3.1-flash-lite` |
| **Groq** (fallback) | `GROQ_API_KEY` | `llama-3.3-70b-versatile` |
| **OpenRouter** (fallback) | `OPENROUTER_API_KEY` | `deepseek/deepseek-chat-v3-0324:free` |
| **Vercel AI Gateway** (advanced) | `USE_VERCEL_AI_GATEWAY=1` + `AI_GATEWAY_API_KEY` | configurable |

See [docs/providers.md](docs/providers.md) for details.

## FAQ

### Is Gemini free?

Yes. Google provides a generous free tier suitable for families, students, and hobby projects. Most tutoring deployments fit comfortably within it.

### Do I need a credit card?

No — Gemini requires no billing information.

### Do I need Vercel AI Gateway?

No. The default setup uses Gemini directly. AI Gateway is only needed if you want to route through multiple providers via a single endpoint.

### Can I use another model?

Yes — Gemini, Groq, OpenRouter, or any model accessible through Vercel AI Gateway are supported. The app automatically falls back to the next configured provider on quota errors.

### What is provider fallback?

If Gemini hits a rate limit or quota cap, the app transparently retries with Groq, then OpenRouter. No error message, no interruption. Just add the extra API keys.

### Do I need to deploy on Vercel?

No. The app runs anywhere that supports Node.js. Environment variables work the same on any platform.

## Built with Free AI Tools

This project can be developed entirely using **free tiers**:

| Tool | Free Tier Details |
|---|---|
| **Gemini** (model provider) | Free API key at [aistudio.google.com](https://aistudio.google.com/apikey) — no credit card |
| **OpenCode** (coding agent) | Open-source CLI — use with Gemini, Groq, or any OpenAI-compatible provider |
| **Obra Superpowers** (workflows) | Free, open-source — installs as an OpenCode plugin |
| **Neon** (database) | Free Postgres tier at [neon.tech](https://neon.tech) |
| **Vercel** (hosting) | Hobby plan — free for personal projects |

No paid AI subscriptions are required to build, test, or deploy this project.

See [docs/opencode.md](docs/opencode.md) for the full OpenCode development workflow and [CONTRIBUTING.md](CONTRIBUTING.md) for contributor guidance.

## Documentation

- [Provider setup guide](docs/providers.md) — switching models, enabling Gateway
- Curriculum and topics are configured in `lib/ai/curriculum.ts`
- System prompt lives in `lib/ai/prompts-tutor.ts`
- Mission and lesson content is configured in `lib/ai/missions.ts`
- Question archetypes are seeded into Postgres via `scripts/seed-question-archetypes.ts` from `data/question-archetypes/`
- REST endpoint at `/api/adaptive-challenge` serves dynamic adaptive questions from archetypes

## Running locally (full setup)

```bash
pnpm install
pnpm db:migrate
pnpm seed
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

> **Note:** `pnpm seed` populates the database with GCSE-style question archetypes and discrete skills. Without it, challenge modes and adaptive features will have no templates to generate questions from.

## Reducing Free AI Usage

This app is designed to minimise API calls so it works comfortably on free-tier AI providers.

A normal lesson, challenge, and grading flow uses:

- **0 AI calls** for lesson navigation, concept cards, and challenges
- **0 AI calls** for adaptive question selection (deterministic engine)
- **0 AI calls** for question generation (pure template-based substitution)
- **0 AI calls** for answer grading (deterministic string matching)
- **0 AI calls** for mastery scoring, streaks, and progress updates (computed in code)
- **0 AI calls** for chat titles (deterministic by default)

To keep usage low:

- Dynamic question selection is powered entirely by the deterministic Adaptive Mastery Engine (`lib/adaptive/engine.ts`)
- Questions are dynamically generated from JSON-defined question archetypes instead of querying an LLM
- Answers are graded locally via simple string comparison or algebraic solvers
- XP, streaks, badges, skill masteries, and progress are computed purely in code
- The LLM is **only** used for advanced tutoring features: explaining concepts differently, visual illustrations, open-ended dialogues, or when generating parent summaries.
- Chat titles are deterministic by default (first 40 characters of the first message)
- Set `ENABLE_LLM_TITLE_GENERATION=1` to restore LLM-generated titles

### Provider Fallback

If Gemini hits a quota limit, the app transparently falls back to Groq, then OpenRouter:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
```

No error message, no interruption — just add the extra API keys.

See [docs/providers.md](docs/providers.md) for the full provider setup guide.
