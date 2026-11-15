import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  generateObject,
  generateText,
  type LanguageModel,
  experimental_transcribe as transcribe,
} from "ai";
import type { z } from "zod";
import { isTestEnvironment } from "@/lib/constants";
import { isDatabaseConfigured } from "@/lib/db/client";

export type ProviderId =
  | "groq"
  | "groq-fallback"
  | "gemini-free"
  | "gemini-backup"
  | "openrouter";

export type ProviderCandidate = {
  id: ProviderId;
  displayName: string;
  modelName: string;
  model: LanguageModel;
  supportsStructuredObject: boolean;
};

export type AiSetupStatus = {
  anyLlmConfigured: boolean;
  groqConfigured: boolean;
  geminiConfigured: boolean;
  openRouterConfigured: boolean;
  serverSttConfigured: boolean;
  neuralTtsAvailable: boolean;
  databaseConfigured: boolean;
  vapidEnvConfigured: boolean;
  activePrimaryProvider: string;
};

function cleanKey(val: string | undefined): string | undefined {
  const trimmed = val?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function getAiSetupStatus(): AiSetupStatus {
  const groqKey = cleanKey(process.env.GROQ_API_KEY);
  const geminiKey = cleanKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const openRouterKey = cleanKey(process.env.OPENROUTER_API_KEY);
  const candidates = getProviderCandidates();

  return {
    anyLlmConfigured: candidates.length > 0,
    groqConfigured: Boolean(groqKey),
    geminiConfigured: Boolean(geminiKey),
    openRouterConfigured: Boolean(openRouterKey),
    serverSttConfigured: Boolean(groqKey),
    neuralTtsAvailable: true,
    databaseConfigured: isDatabaseConfigured(),
    vapidEnvConfigured: Boolean(
      cleanKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
        cleanKey(process.env.VAPID_PRIVATE_KEY)
    ),
    activePrimaryProvider: candidates[0]
      ? `${candidates[0].displayName} (${candidates[0].modelName})`
      : "Curated Local Mode (Add free Groq or Gemini key for open Q&A)",
  };
}

export function getProviderCandidates(): ProviderCandidate[] {
  const groqKey = cleanKey(process.env.GROQ_API_KEY);
  const geminiKey = cleanKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const openRouterKey = cleanKey(process.env.OPENROUTER_API_KEY);

  const groqPrimaryModel = process.env.GROQ_MODEL?.trim() || "qwen/qwen3-32b";
  const groqFallbackModel =
    process.env.GROQ_FALLBACK_MODEL?.trim() || "llama-3.3-70b-versatile";
  const geminiPrimaryModel =
    process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || "gemini-3.1-flash-lite";
  const openRouterModel =
    process.env.OPENROUTER_MODEL?.trim() ||
    "deepseek/deepseek-chat-v3-0324:free";

  const pool: ProviderCandidate[] = [];

  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    pool.push({
      id: "groq",
      displayName: "Groq Free Tier",
      modelName: groqPrimaryModel,
      model: groq(groqPrimaryModel),
      supportsStructuredObject: false,
    });
    if (groqFallbackModel !== groqPrimaryModel) {
      pool.push({
        id: "groq-fallback",
        displayName: "Groq Backup Bucket",
        modelName: groqFallbackModel,
        model: groq(groqFallbackModel),
        supportsStructuredObject: false,
      });
    }
  }

  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    pool.push({
      id: "gemini-free",
      displayName: "Google AI Studio (Gemini)",
      modelName: geminiPrimaryModel,
      model: google(geminiPrimaryModel),
      supportsStructuredObject: true,
    });
    if (geminiPrimaryModel !== "gemini-2.5-flash") {
      pool.push({
        id: "gemini-backup",
        displayName: "Google Gemini 2.5 Flash",
        modelName: "gemini-2.5-flash",
        model: google("gemini-2.5-flash"),
        supportsStructuredObject: true,
      });
    }
  }

  if (openRouterKey) {
    const openrouter = createOpenRouter({ apiKey: openRouterKey });
    pool.push({
      id: "openrouter",
      displayName: "OpenRouter Free",
      modelName: openRouterModel,
      model: openrouter.chat(openRouterModel),
      supportsStructuredObject: false,
    });
  }

  const orderRaw = cleanKey(process.env.AI_PROVIDER_ORDER);
  if (!orderRaw) {
    return pool;
  }

  const order = orderRaw.split(",").map((s) => s.trim().toLowerCase());
  const sorted: ProviderCandidate[] = [];
  const remaining = [...pool];

  for (const prefix of order) {
    for (let i = remaining.length - 1; i >= 0; i--) {
      // Match both exact id ("groq") and family ("groq-fallback")
      if (
        remaining[i].id === prefix ||
        remaining[i].id.startsWith(`${prefix}-`)
      ) {
        // Preserve primary before backup
      }
    }
    const matching = remaining.filter(
      (c) => c.id === prefix || c.id.startsWith(`${prefix}-`)
    );
    for (const m of matching) {
      sorted.push(m);
      const idx = remaining.indexOf(m);
      if (idx !== -1) {
        remaining.splice(idx, 1);
      }
    }
  }

  sorted.push(...remaining);
  return sorted;
}

function extractFirstJsonObject(raw: string): unknown {
  // Strip <think>...</think> blocks emitted by reasoning models such as Qwen3 / DeepSeek
  const withoutThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const withoutFence = withoutThink
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain a JSON object");
  }

  return JSON.parse(withoutFence.slice(start, end + 1));
}

export async function generateStructuredWithFallback<T>({
  system,
  prompt,
  schema,
  schemaHint,
}: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaHint: string;
}): Promise<{ data: T; providerUsed: string }> {
  const candidates = getProviderCandidates();
  if (candidates.length === 0) {
    throw new Error("NO_AI_PROVIDERS_CONFIGURED");
  }

  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      if (candidate.supportsStructuredObject) {
        const res = await generateObject({
          model: candidate.model,
          system,
          prompt,
          schema,
          maxRetries: 0,
        });
        return {
          data: res.object,
          providerUsed: `${candidate.displayName} (${candidate.modelName})`,
        };
      }

      const textRes = await generateText({
        model: candidate.model,
        system: `${system}\n\nIMPORTANT OUTPUT CONTRACT:\nReturn ONLY a single valid JSON object matching this exact structure (no markdown fences, no commentary outside JSON):\n${schemaHint}`,
        prompt,
        maxRetries: 0,
      });

      const rawJson = extractFirstJsonObject(textRes.text);
      const parsed = schema.parse(rawJson);
      return {
        data: parsed,
        providerUsed: `${candidate.displayName} (${candidate.modelName})`,
      };
    } catch (err) {
      lastError = err;
      console.warn(
        `[ai-fallback] Candidate ${candidate.id} (${candidate.modelName}) failed, trying next:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All configured AI providers failed or hit rate limits.");
}

export async function transcribeAudioWithGroq(audio: {
  data: ArrayBuffer | Uint8Array;
  mimeType: string;
}): Promise<{ text: string; durationMs: number | null }> {
  if (isTestEnvironment) {
    return { text: "explain it another way", durationMs: 800 };
  }

  const groqKey = cleanKey(process.env.GROQ_API_KEY);
  if (!groqKey) {
    throw new Error("GROQ_API_KEY_MISSING");
  }

  const sttModel =
    process.env.GROQ_STT_MODEL?.trim() || "whisper-large-v3-turbo";
  const groq = createGroq({ apiKey: groqKey });
  const bytes =
    audio.data instanceof Uint8Array ? audio.data : new Uint8Array(audio.data);

  const result = await transcribe({
    model: groq.transcription(sttModel),
    audio: bytes,
  });

  return {
    text: result.text.trim(),
    durationMs:
      typeof result.durationInSeconds === "number"
        ? Math.round(result.durationInSeconds * 1000)
        : null,
  };
}
