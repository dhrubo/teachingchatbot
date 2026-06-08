import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { gateway } from "ai";
import { isTestEnvironment } from "../constants";

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
const useGateway =
  process.env.USE_VERCEL_AI_GATEWAY === "1" &&
  Boolean(process.env.AI_GATEWAY_API_KEY);

const GEMINI_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-3.1-flash-lite";
const GROQ_MODEL =
  process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3-0324:free";

console.info("[ai-config] model=" + GEMINI_MODEL);
console.info("[ai-config] keys: free=" + (hasGeminiKey ? "SET ✓" : "unset") + " premium=" + (hasPremiumGeminiKey ? "SET ✓" : "unset") + " groq=" + (hasGroqKey ? "SET ✓" : "unset") + " openrouter=" + (hasOpenRouterKey ? "SET ✓" : "unset") + " gateway=" + (useGateway ? "SET ✓" : "unset"));

export function isUsingGateway(): boolean {
  return useGateway;
}

export function currentProvider(): string {
  if (useGateway) return "gateway";
  if (hasGeminiKey) return "gemini";
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

export type ProviderCandidate = {
  name: string;
  model: LanguageModel;
  modelName: string;
};

export function getTutorProviderCandidates(
  isPremium?: boolean
): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [];

  if (isTestEnvironment) {
    const { chatModel } = require("./models.mock");
    candidates.push({
      name: "mock",
      model: chatModel,
      modelName: "mock",
    });
    return candidates;
  }

  if (useGateway) {
    const modelName =
      process.env.AI_GATEWAY_MODEL ?? "google/gemini-3.1-flash-lite";
    candidates.push({
      name: "vercel-ai-gateway",
      model: gateway.languageModel(modelName),
      modelName,
    });
  }

  // Premium Gemini key for signed-in users and admins. Falls back to the
  // free key if no premium key is configured.
  if (isPremium && hasPremiumGeminiKey) {
    candidates.push({
      name: "gemini-premium(GOOGLE_GENERATIVE_AI_API_KEY_PREMIUM)",
      model: googlePremium!(GEMINI_MODEL),
      modelName: GEMINI_MODEL,
    });
  }

  if (hasGeminiKey) {
    candidates.push({
      name: "gemini-free(GOOGLE_GENERATIVE_AI_API_KEY)",
      model: google(GEMINI_MODEL),
      modelName: GEMINI_MODEL,
    });
  }

  if (hasGroqKey) {
    candidates.push({
      name: "groq",
      model: getGroqModel(),
      modelName: GROQ_MODEL,
    });
  }

  if (hasOpenRouterKey) {
    candidates.push({
      name: "openrouter",
      model: getOpenRouterModel(),
      modelName: OPENROUTER_MODEL,
    });
  }

  // Respect AI_PROVIDER_ORDER if set (comma-separated provider names).
  const order = process.env.AI_PROVIDER_ORDER;
  if (order) {
    const preferred = order.split(",").map((s) => s.trim().toLowerCase());
    const ordered: ProviderCandidate[] = [];
    for (const name of preferred) {
      const idx = candidates.findIndex((c) => c.name === name);
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

export function getLanguageModel(_modelId?: string): LanguageModel {
  return getTutorModel();
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
  "Add one of these free provider keys to your .env.local:",
  "",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "  (recommended) https://aistudio.google.com/apikey",
  "",
  "GROQ_API_KEY",
  "  https://console.groq.com/keys",
  "",
  "OPENROUTER_API_KEY",
  "  https://openrouter.ai/settings/keys",
].join("\n");
