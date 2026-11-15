# 🦌 Mr. Ranedeer Maths — Voice-First Edexcel GCSE (`1MA1`) Tutor

A clean, 100% free-tier **Voice-First AI Mathematics Tutor** built on the pedagogical principles of [**Mr. Ranedeer AI Tutor**](https://github.com/JushBJJ/Mr.-Ranedeer-AI-Tutor), tailored exclusively to **Pearson Edexcel GCSE (9–1) Mathematics (`1MA1`)** across both **Foundation (Grades 1–5)** and **Higher (Grades 4–9)** tiers, with **Duolingo-style daily practice streaks and Web Push reminders**.

---

## ✨ Key Principles & Features

1. **Explain Every Concept in 5 Distinct Ways (Mr. Ranedeer Learning Styles)**
   - **Visual Diagram (`Visual + Intuitive`):** Interactive SVG Fraction Walls, Compound-Interest Multiplier Timelines, Area/Box Grids, Number Lines, Balance Scales, and Trigonometry Triangles drawn alongside KaTeX steps.
   - **Real-World Story (`Storytelling + Analogical`):** Snowball bank accounts, chocolate trays, and everyday UK contexts.
   - **Why It Works (`Inductive + Causal`):** Unpacks *why* rules like `invert and multiply` or `× 1.05^n` work so students never memorize blindly.
   - **Edexcel Exam Method (`Formal + Deductive`):** Exact `1MA1` Paper 1 (Non-Calc) and Paper 2/3 (Calc) `M1/A1` mark-scheme working.
   - **Socratic Guided Check (`Active + Socratic`):** Micro-step back-and-forth checks.
   - Say **"Explain it another way"** (or click the button) at any moment to rotate to an untried lens!

2. **Mr. Ranedeer Curriculum Ladder & `/config` Personalization**
   - **`0.1 → 0.x` Prerequisite Ladder:** Step back into foundational building blocks whenever a topic feels tough.
   - **`3/10 → 6/10 → 9/10` Mastery `/test` Ramp:** Deterministic GCSE answer checker (`lib/math/check-answer.ts`) handles fractions, decimals, currency rounding hints, ratios, and spoken-maths disambiguation (`lib/voice/spoken-maths.ts`) with zero LLM latency.
   - **`/config` Profile (`/settings`):** Configure `Foundation (1–5)` vs `Higher (4–9)`, Target Grade `1–9`, Default Explanation Lens, Tone Style, British Voice Speed (`0.85x / 1.0x / 1.15x`), and Daily Goal Minutes.

3. **100% Free Voice + LLM Stack**
   - **Speech-to-Text (STT):** Groq Free Tier `whisper-large-v3-turbo` (`POST /api/voice/stt`) with automatic client fallback to browser `SpeechRecognition` (`en-GB`).
   - **LLM Reasoning & Open Q&A:** Automatic fallback router (`lib/ai/providers.ts`) across **Groq Free Tier** (`qwen/qwen3-32b` → `llama-3.3-70b-versatile`) ⇄ **Google AI Studio Free Tier** (`gemini-3.1-flash-lite` → `gemini-2.5-flash`) ⇄ **OpenRouter `:free`** — plus **Zero-Key Curated Mode** so every topic, visual model, lens switch, and test works out of the box even before adding an API key!
   - **Text-to-Speech (TTS):** British Neural Voice (`en-GB-SoniaNeural` via `edge-tts-universal` at `POST /api/voice/tts`) with automatic browser `speechSynthesis` (`en-GB`) fallback.

4. **Duolingo-Style Daily Practice Streaks & Reminders**
   - **5-Minute Daily Voice Warmup (`/warmup`):** Picks 3 due spaced-repetition Edexcel checks.
   - **Streaks & Streak Freezes:** Tracks daily streaks, awards `+1` bonus Streak Freeze every 5 streak days (max 3), and automatically consumes a freeze if a single day is missed.
   - **Free Web Push Notifications:** Service Worker (`public/sw.js`) + VAPID (`web-push`) + daily cron (`GET /api/cron/daily-reminders`).

---

## 🚀 Quick Start (Zero-Config Local Run)

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open **http://localhost:3000** — the app runs immediately with **zero database setup** (automatically persisting to `.data/local-store.json` when `POSTGRES_URL` is omitted, and auto-generating local dev VAPID keys in `.data/vapid-dev.json`).

### Recommended Free API Keys (`.env.local`)

1. **Groq Free Tier** ([console.groq.com/keys](https://console.groq.com/keys)) — unlocks sub-second `whisper-large-v3-turbo` voice transcription + `qwen/qwen3-32b` & `llama-3.3-70b-versatile` Q&A:
   ```env
   GROQ_API_KEY=gsk_...
   ```
2. **Google AI Studio Free Tier** ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)) — unlocks `gemini-3.1-flash-lite` (`500 RPD` free) + `gemini-2.5-flash` structured whiteboard fallback:
   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=AIza...
   ```
3. **Production Neon Postgres & VAPID Keys (Optional for Vercel Deploy):**
   ```bash
   pnpm vapid:generate   # prints NEXT_PUBLIC_VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY
   pnpm db:migrate       # applies Drizzle schema when POSTGRES_URL is set
   ```

---

## 🧪 Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Next.js 16 (Turbopack) dev server on `http://localhost:3000` |
| `pnpm check` | Run Biome + Ultracite lint & format checks (`pnpm fix` to autofix) |
| `pnpm test:unit` | Run Vitest unit test suite (spoken maths, voice commands, Edexcel 1MA1, grading, streaks, Ranedeer engine) |
| `pnpm test` | Run Playwright end-to-end smoke tests |
| `pnpm build` | Production Next.js 16 build |
| `pnpm vapid:generate` | Generate free Web Push VAPID keypair |
