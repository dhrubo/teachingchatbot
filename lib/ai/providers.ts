import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
} from "@ai-sdk/provider";
import { customProvider, gateway } from "ai";
import { isTestEnvironment } from "../constants";
import { GEMINI_FALLBACK_MODEL, titleModel } from "./models";

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const hasGeminiKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Set USE_GEMINI_ONLY=1 to bypass the AI Gateway entirely and use Gemini for
// every call (handy for local dev when the gateway is rate limited).
const useGeminiOnly = process.env.USE_GEMINI_ONLY === "1" && hasGeminiKey;

/**
 * Wraps a primary (gateway) language model so that if a call fails — most
 * commonly because the Vercel AI Gateway is rate limited / out of credits —
 * it transparently retries the same request against Gemini.
 *
 * Both streaming and non-streaming calls are covered. The fallback only kicks
 * in when a Gemini API key is configured; otherwise the original error is
 * rethrown so behaviour is unchanged.
 */
function withGeminiFallback(primary: LanguageModelV3): LanguageModelV3 {
  if (!hasGeminiKey) {
    return primary;
  }

  const fallback = google(GEMINI_FALLBACK_MODEL);

  // Gateway-specific provider options (e.g. `gateway.order`) are meaningless to
  // Gemini and can cause it to reject the request, so strip them on fallback.
  const sanitize = (
    options: LanguageModelV3CallOptions
  ): LanguageModelV3CallOptions => {
    const { gateway: _gateway, ...providerOptions } =
      options.providerOptions ?? {};
    return { ...options, providerOptions };
  };

  const logFallback = (error: unknown) => {
    console.warn(
      `[ai] Gateway model "${primary.modelId}" failed; falling back to Gemini "${GEMINI_FALLBACK_MODEL}".`,
      error instanceof Error ? error.message : error
    );
  };

  return {
    specificationVersion: primary.specificationVersion,
    provider: primary.provider,
    modelId: primary.modelId,
    supportedUrls: primary.supportedUrls,

    async doGenerate(options) {
      try {
        return await primary.doGenerate(options);
      } catch (error) {
        logFallback(error);
        return await fallback.doGenerate(sanitize(options));
      }
    },

    async doStream(options) {
      try {
        return await primary.doStream(options);
      } catch (error) {
        logFallback(error);
        return await fallback.doStream(sanitize(options));
      }
    },
  };
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  if (useGeminiOnly) {
    return google(GEMINI_FALLBACK_MODEL);
  }

  return withGeminiFallback(gateway.languageModel(modelId));
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  if (useGeminiOnly) {
    return google(GEMINI_FALLBACK_MODEL);
  }

  return withGeminiFallback(gateway.languageModel(titleModel.id));
}
