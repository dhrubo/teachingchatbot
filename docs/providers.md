# AI Provider Configuration

This document explains how AI providers work in the tutor app.

## Provider Fallback System

The app supports multiple AI providers with **automatic fallback**. If the primary provider hits a quota/rate-limit error, it transparently retries with the next configured provider.

**Provider priority (top wins):**

1. **Vercel AI Gateway** — if `USE_VERCEL_AI_GATEWAY=1` and `AI_GATEWAY_API_KEY` is set
2. **Google Gemini** — if `GOOGLE_GENERATIVE_AI_API_KEY` is set
3. **Groq** — if `GROQ_API_KEY` is set
4. **OpenRouter** — if `OPENROUTER_API_KEY` is set

If the first provider returns a quota error (429, RESOURCE_EXHAUSTED, rate-limit), the app tries the next one automatically. Non-quota errors (invalid key, model not found) fail immediately.

## Why Gemini is the default

- **Free tier available** — no credit card required
- **Instant setup** — one API key, no billing, no account upgrade
- **Generous limits** — enough for daily family use
- **Tool use support** — works with interactive quizzes and topic tracking

## Setting up Gemini (recommended)

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
GOOGLE_GENERATIVE_AI_MODEL=gemini-3.1-flash-lite
```

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Get API key"
3. Copy the key to your `.env.local`

### Available Gemini models

| Model | Tools | Vision | Reasoning |
|---|---|---|---|
| `gemini-3.1-flash-lite` | ✅ | ✅ | ❌ |
| `gemini-2.5-flash` | ✅ | ✅ | ❌ |
| `gemini-2.5-pro` | ✅ | ✅ | ✅ |

## Setting up Fallback Providers

### Groq (fast open-source models)

```env
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

Get a key at [console.groq.com](https://console.groq.com).

### OpenRouter (many free models)

```env
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324:free
```

Get a key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys).

OpenRouter's `:free` models have no cost. Popular free models:
- `deepseek/deepseek-chat-v3-0324:free`
- `google/gemini-2.5-flash-lite-preview-05-06:free`
- `meta-llama/llama-4-maverick:free`

## Using Vercel AI Gateway (advanced)

Unified access to many model providers (OpenAI, Anthropic, etc.).

```env
USE_VERCEL_AI_GATEWAY=1
AI_GATEWAY_API_KEY=your_gateway_key_here
AI_GATEWAY_MODEL=google/gemini-3.1-flash-lite
```

- On Vercel deployments, the gateway authenticates via OIDC automatically
- On other platforms, provide `AI_GATEWAY_API_KEY`
- Models are configured in `lib/ai/models.ts` with per-model provider routing

## How Quota Fallback Works

1. The app collects all configured providers as **candidates**
2. It calls `streamText` with the highest-priority candidate
3. If the candidate returns a quota/rate-limit error, the app logs a warning and retries with the next candidate
4. If all candidates are exhausted, the user sees: "All my AI providers are currently overloaded or out of quota"
5. `maxRetries: 0` is set on all LLM calls — no internal retries waste your quota

## Adding a new provider

This app uses the [AI SDK](https://ai-sdk.dev) which supports [many providers](https://ai-sdk.dev/providers/ai-sdk-providers):

- OpenAI
- Anthropic
- Mistral
- Cohere
- And more

To add a new provider:

1. Install the provider package (e.g. `pnpm add @ai-sdk/openai`)
2. Add the key check and model setup in `lib/ai/providers.ts`
3. Add the provider to the `getTutorProviderCandidates()` array

## Troubleshooting

**"No AI provider configured"**

You haven't set any API keys. Add `GOOGLE_GENERATIVE_AI_API_KEY` to your `.env.local`.

**"API key not valid"**

Your API key is incorrect or expired. Generate a new one at [Google AI Studio](https://aistudio.google.com/apikey).

**"All providers exhausted"**

All configured providers hit quota limits simultaneously. Add a new provider key (e.g. Groq or OpenRouter) or wait for quota to reset.

**Provider keeps timing out**

Try a faster model like `gemini-3.1-flash-lite`. If you're using Groq, check their status page for outages.

**Gateway credit card error**

You've enabled the AI Gateway but haven't added a billing method. Either add a card to your Vercel account, or disable the gateway by removing `USE_VERCEL_AI_GATEWAY=1`.

**Logs show gemini-2.5-flash-lite instead of gemini-3.1-flash-lite**

Your app is still using the old model default. Check:

1. `.env.local` — set `GOOGLE_GENERATIVE_AI_MODEL=gemini-3.1-flash-lite`
2. `lib/ai/models.ts` — `DEFAULT_CHAT_MODEL` and `DEFAULT_GEMINI_MODEL` must default to `"gemini-3.1-flash-lite"`
3. Vercel Environment Variables — same fix

Restart the dev server after changing env vars.

**For local development, prefer Groq first:**

```env
AI_PROVIDER_ORDER=groq,gemini,openrouter
```

This tries Groq first, then Gemini, then OpenRouter — useful when testing fallback or avoiding Gemini quota limits.
