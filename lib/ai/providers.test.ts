import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// providers.ts reads provider env vars into module-level constants at import
// time, so each scenario needs a fresh module graph with its own env — hence
// vi.resetModules() + dynamic import per test rather than a static import.
const ENV_KEYS = [
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY_PREMIUM",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "AI_PROVIDER_ORDER",
  "USE_VERCEL_AI_GATEWAY",
  "AI_GATEWAY_API_KEY",
  "PLAYWRIGHT",
  "PLAYWRIGHT_TEST_BASE_URL",
  "CI_PLAYWRIGHT",
];

async function loadProviders(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    vi.stubEnv(key, undefined as unknown as string);
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      vi.stubEnv(key, value);
    }
  }
  return await import("./providers");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getTutorProviderCandidates", () => {
  it("returns no candidates when no provider is configured (missing configuration)", async () => {
    const { getTutorProviderCandidates } = await loadProviders({});
    expect(getTutorProviderCandidates()).toEqual([]);
  });

  it("skips the OpenAI candidate when OPENAI_API_KEY is set but OPENAI_MODEL is not", async () => {
    const { getTutorProviderCandidates } = await loadProviders({
      OPENAI_API_KEY: "sk-test",
    });
    expect(getTutorProviderCandidates().some((c) => c.id === "openai")).toBe(
      false
    );
  });

  it("includes the OpenAI candidate once both OPENAI_API_KEY and OPENAI_MODEL are set", async () => {
    const { getTutorProviderCandidates } = await loadProviders({
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-4o-mini",
    });
    const ids = getTutorProviderCandidates().map((c) => c.id);
    expect(ids).toContain("openai");
  });

  it("orders candidates by AI_PROVIDER_ORDER using stable ids, not display names", async () => {
    const { getTutorProviderCandidates } = await loadProviders({
      GOOGLE_GENERATIVE_AI_API_KEY: "g-key",
      GROQ_API_KEY: "groq-key",
      AI_PROVIDER_ORDER: "groq,gemini-free",
    });
    const ids = getTutorProviderCandidates().map((c) => c.id);
    expect(ids).toEqual(["groq", "gemini-free"]);
  });

  it("matches AI_PROVIDER_ORDER case-insensitively and trims whitespace", async () => {
    const { getTutorProviderCandidates } = await loadProviders({
      GOOGLE_GENERATIVE_AI_API_KEY: "g-key",
      GROQ_API_KEY: "groq-key",
      AI_PROVIDER_ORDER: " GROQ , Gemini-Free ",
    });
    const ids = getTutorProviderCandidates().map((c) => c.id);
    expect(ids).toEqual(["groq", "gemini-free"]);
  });

  it("appends candidates not named in AI_PROVIDER_ORDER after the ordered ones", async () => {
    const { getTutorProviderCandidates } = await loadProviders({
      GOOGLE_GENERATIVE_AI_API_KEY: "g-key",
      GROQ_API_KEY: "groq-key",
      OPENROUTER_API_KEY: "or-key",
      AI_PROVIDER_ORDER: "openrouter",
    });
    const ids = getTutorProviderCandidates().map((c) => c.id);
    expect(ids[0]).toBe("openrouter");
    expect(new Set(ids)).toEqual(
      new Set(["openrouter", "gemini-free", "groq"])
    );
  });

  it("throws the setup error from getTutorModel when nothing is configured", async () => {
    const { getTutorModel } = await loadProviders({});
    expect(() => getTutorModel()).toThrow(/No AI provider configured/);
  });
});

describe("getLanguageModel", () => {
  it("resolves a known static model id", async () => {
    const { getLanguageModel } = await loadProviders({
      GOOGLE_GENERATIVE_AI_API_KEY: "g-key",
    });
    // Should not throw, and should return something model-shaped.
    const model = getLanguageModel("gemini-3.1-flash-lite");
    expect(model).toBeDefined();
  });

  it("throws for an unknown model id when the gateway is not active", async () => {
    const { getLanguageModel } = await loadProviders({});
    expect(() => getLanguageModel("not-a-real-model")).toThrow(/Unknown model id/);
  });

  it("throws for an OpenAI model id when OPENAI_API_KEY is not set", async () => {
    const { getLanguageModel } = await loadProviders({});
    expect(() => getLanguageModel("openai/gpt-oss-20b")).toThrow(
      /requires the AI Gateway/
    );
  });
});

describe("isQuotaError", () => {
  it("classifies 429 / RESOURCE_EXHAUSTED / rate-limit errors as quota errors", async () => {
    const { isQuotaError } = await loadProviders({});
    expect(isQuotaError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isQuotaError(new Error("RESOURCE_EXHAUSTED"))).toBe(true);
    expect(isQuotaError(new Error("Rate limit exceeded"))).toBe(true);
  });

  it("does not classify unrelated errors as quota errors", async () => {
    const { isQuotaError } = await loadProviders({});
    expect(isQuotaError(new Error("API key not valid"))).toBe(false);
  });
});

describe("streamTextWithFallback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("falls back to the next candidate on a quota error from the first", async () => {
    const streamTextMock = vi.fn();
    vi.doMock("ai", () => ({ streamText: streamTextMock }));

    const { streamTextWithFallback } = await import(
      "./stream-with-provider-fallback"
    );

    streamTextMock
      .mockImplementationOnce(() => {
        throw new Error("429 quota exceeded");
      })
      .mockImplementationOnce(() => ({ fake: "stream-result" }));

    const candidates = [
      { id: "openai", displayName: "OpenAI", model: {} as never, modelName: "gpt-x" },
      { id: "groq", displayName: "Groq", model: {} as never, modelName: "llama" },
    ] as never;

    const result = await streamTextWithFallback(candidates, {
      messages: [],
    } as never);

    expect(streamTextMock).toHaveBeenCalledTimes(2);
    expect(result.provider).toBe("groq");
    vi.doUnmock("ai");
  });

  it("does not fall back on a non-quota error — it propagates immediately", async () => {
    const streamTextMock = vi.fn(() => {
      throw new Error("API key not valid");
    });
    vi.doMock("ai", () => ({ streamText: streamTextMock }));

    const { streamTextWithFallback } = await import(
      "./stream-with-provider-fallback"
    );

    const candidates = [
      { id: "openai", displayName: "OpenAI", model: {} as never, modelName: "gpt-x" },
      { id: "groq", displayName: "Groq", model: {} as never, modelName: "llama" },
    ] as never;

    await expect(
      streamTextWithFallback(candidates, { messages: [] } as never)
    ).rejects.toThrow(/API key not valid/);
    expect(streamTextMock).toHaveBeenCalledTimes(1);
    vi.doUnmock("ai");
  });

  it("throws once every candidate is exhausted by quota errors", async () => {
    const streamTextMock = vi.fn(() => {
      throw new Error("429 quota exceeded");
    });
    vi.doMock("ai", () => ({ streamText: streamTextMock }));

    const { streamTextWithFallback } = await import(
      "./stream-with-provider-fallback"
    );

    const candidates = [
      { id: "openai", displayName: "OpenAI", model: {} as never, modelName: "gpt-x" },
    ] as never;

    await expect(
      streamTextWithFallback(candidates, { messages: [] } as never)
    ).rejects.toThrow(/quota exceeded/);
    vi.doUnmock("ai");
  });
});
