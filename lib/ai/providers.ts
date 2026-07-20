import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { gateway } from "ai";
import { isTestEnvironment } from "../constants";
import { chatModels } from "./models";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const googlePremium = process.env.GOOGLE_GENERATIVE_AI_API_KEY_PREMIUM
  ? createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY_PREMIUM,
    })
  : null;

const hasGeminiKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const hasPremiumGeminiKey = Boolean(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_PREMIUM
);
const hasGroqKey = Boolean(process.env.GROQ_API_KEY);
const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY);
const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
// No default model: complimentary/free-tier token eligibility is an OpenAI
// account-level decision (balance- and eligibility-based, and it excludes
// tool use — see docs/providers.md), not something this app should silently
// assume by hardcoding a "free" model id. If the key is set but the model
// isn't, the candidate is skipped rather than guessing.
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const useGateway =
  process.env.USE_VERCEL_AI_GATEWAY === "1" &&
  Boolean(process.env.AI_GATEWAY_API_KEY);

const GEMINI_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-3.1-flash-lite";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3-0324:free";

console.info("[ai-config] model=" + GEMINI_MODEL);
console.info(
  "[ai-config] keys: free=" +
    (hasGeminiKey ? "SET ✓" : "unset") +
    " premium=" +
    (hasPremiumGeminiKey ? "SET ✓" : "unset") +
    " groq=" +
    (hasGroqKey ? "SET ✓" : "unset") +
    " openrouter=" +
    (hasOpenRouterKey ? "SET ✓" : "unset") +
    " openai=" +
    (hasOpenAiKey ? (OPENAI_MODEL ? "SET ✓" : "SET but OPENAI_MODEL missing — skipped") : "unset") +
    " gateway=" +
    (useGateway ? "SET ✓" : "unset")
);

export function isUsingGateway(): boolean {
  return useGateway;
}

export function currentProvider(): string {
  if (useGateway) return "vercel-ai-gateway";
  if (hasGeminiKey) return "gemini-free";
  if (hasOpenAiKey && OPENAI_MODEL) return "openai";
  if (hasGroqKey) return "groq";
  if (hasOpenRouterKey) return "openrouter";
  return "none";
}

function getGroqModel() {
  const { groq } = require("@ai-sdk/groq");
  return groq(GROQ_MODEL);
}

function getOpenRouterModel() {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  return openrouter.chat(OPENROUTER_MODEL);
}

function getOpenAiModel(modelId: string) {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai(modelId);
}

// Stable identifiers, independent of the human-readable display name — safe
// to compare, log, and match against AI_PROVIDER_ORDER without caring how the
// name is formatted for humans.
export type ProviderId =
  | "openai"
  | "gemini-free"
  | "gemini-premium"
  | "groq"
  | "openrouter"
  | "vercel-ai-gateway"
  | "mock";

export type ProviderCapabilities = {
  tools: boolean;
  streaming: boolean;
  structuredOutputs: boolean;
};

export type ProviderCandidate = {
  id: ProviderId;
  /** Human-readable, for logs/UI only — never compared against for matching. */
  displayName: string;
  model: LanguageModel;
  modelName: string;
  capabilities: ProviderCapabilities;
};

const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  tools: true,
  streaming: true,
  structuredOutputs: true,
};

export function getTutorProviderCandidates(
  isPremium?: boolean
): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [];

  if (isTestEnvironment) {
    const { chatModel } = require("./models.mock");
    candidates.push({
      id: "mock",
      displayName: "mock",
      model: chatModel,
      modelName: "mock",
      capabilities: DEFAULT_CAPABILITIES,
    });
    return candidates;
  }

  if (useGateway) {
    const modelName =
      process.env.AI_GATEWAY_MODEL ?? "google/gemini-3.1-flash-lite";
    candidates.push({
      id: "vercel-ai-gateway",
      displayName: "Vercel AI Gateway",
      model: gateway.languageModel(modelName),
      modelName,
      capabilities: DEFAULT_CAPABILITIES,
    });
  }

  // Premium Gemini key for signed-in users and admins. Falls back to the
  // free key if no premium key is configured.
  if (isPremium && hasPremiumGeminiKey) {
    candidates.push({
      id: "gemini-premium",
      displayName: "Gemini (premium key)",
      model: googlePremium!(GEMINI_MODEL),
      modelName: GEMINI_MODEL,
      capabilities: { tools: true, streaming: true, structuredOutputs: true },
    });
  }

  if (hasGeminiKey) {
    candidates.push({
      id: "gemini-free",
      displayName: "Gemini (free key)",
      model: google(GEMINI_MODEL),
      modelName: GEMINI_MODEL,
      capabilities: { tools: true, streaming: true, structuredOutputs: true },
    });
  }

  if (hasOpenAiKey && OPENAI_MODEL) {
    candidates.push({
      id: "openai",
      displayName: "OpenAI",
      model: getOpenAiModel(OPENAI_MODEL),
      modelName: OPENAI_MODEL,
      capabilities: { tools: true, streaming: true, structuredOutputs: true },
    });
  }

  if (hasGroqKey) {
    candidates.push({
      id: "groq",
      displayName: "Groq",
      model: getGroqModel(),
      modelName: GROQ_MODEL,
      capabilities: { tools: true, streaming: true, structuredOutputs: true },
    });
  }

  if (hasOpenRouterKey) {
    candidates.push({
      id: "openrouter",
      displayName: "OpenRouter",
      model: getOpenRouterModel(),
      modelName: OPENROUTER_MODEL,
      capabilities: { tools: true, streaming: true, structuredOutputs: false },
    });
  }

  // Respect AI_PROVIDER_ORDER if set (comma-separated stable provider ids —
  // e.g. "openai,gemini-free,groq" — NOT display names).
  const order = process.env.AI_PROVIDER_ORDER;
  if (order) {
    const preferred = order.split(",").map((s) => s.trim().toLowerCase());
    const ordered: ProviderCandidate[] = [];
    for (const id of preferred) {
      const idx = candidates.findIndex((c) => c.id.toLowerCase() === id);
      if (idx !== -1) {
        ordered.push(candidates[idx]);
        candidates.splice(idx, 1);
      }
    }
    // Append any remaining candidates not in the order list.
    ordered.push(...candidates);
    return ordered;
  }

  return candidates;
}

export function getTutorModel() {
  const candidates = getTutorProviderCandidates();

  if (candidates.length === 0) {
    throw new Error(SETUP_ERROR);
  }

  return candidates[0].model;
}

export function isQuotaError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.name}\n${error.message}\n${error.stack ?? ""}`
      : JSON.stringify(error);

  return (
    text.includes("429") ||
    text.includes("RESOURCE_EXHAUSTED") ||
    text.toLowerCase().includes("quota") ||
    text.toLowerCase().includes("rate limit") ||
    text.toLowerCase().includes("rate_limit") ||
    text.toLowerCase().includes("too many requests")
  );
}

/**
 * Resolve a specific model id to a LanguageModel — actually resolves it
 * (via the AI Gateway when active, or the static chatModels table
 * otherwise), rather than ignoring the argument and returning whatever the
 * default tutor candidate happens to be.
 */
export function getLanguageModel(modelId: string): LanguageModel {
  if (useGateway) {
    return gateway.languageModel(modelId);
  }

  const known = chatModels.find((m) => m.id === modelId);
  if (!known) {
    throw new Error(
      `[getLanguageModel] Unknown model id "${modelId}" — not found in chatModels and the AI Gateway is not active.`
    );
  }

  // Models with a gatewayOrder are only ever meant to be routed through the
  // AI Gateway (e.g. "openai/gpt-oss-20b") — their id isn't a valid direct
  // provider-SDK model name, regardless of what `provider` says.
  if (known.gatewayOrder) {
    throw new Error(
      `[getLanguageModel] Model "${modelId}" requires the AI Gateway, which is not active.`
    );
  }

  switch (known.provider) {
    case "google":
      return google(modelId);
    case "openai":
      if (!hasOpenAiKey) {
        throw new Error(
          `[getLanguageModel] Model "${modelId}" requires OPENAI_API_KEY, which is not set.`
        );
      }
      return getOpenAiModel(modelId);
    default:
      throw new Error(
        `[getLanguageModel] Model "${modelId}" (provider "${known.provider}") requires the AI Gateway, which is not active.`
      );
  }
}

export function getTitleModel(): LanguageModel {
  if (isTestEnvironment) {
    const { titleModel } = require("./models.mock");
    return titleModel;
  }

  const candidates = getTutorProviderCandidates();
  if (candidates.length === 0) {
    throw new Error(SETUP_ERROR);
  }

  return candidates[0].model;
}

const SETUP_ERROR = [
  "No AI provider configured.",
  "",
  "Add one of these provider keys to your .env.local:",
  "",
  "GOOGLE_GENERATIVE_AI_API_KEY (recommended — free tier)",
  "  https://aistudio.google.com/apikey",
  "",
  "GROQ_API_KEY",
  "  https://console.groq.com/keys",
  "",
  "OPENROUTER_API_KEY",
  "  https://openrouter.ai/settings/keys",
  "",
  "OPENAI_API_KEY + OPENAI_MODEL (both required — no default model)",
  "  https://platform.openai.com/api-keys",
].join("\n");
