import { afterEach, describe, expect, it, vi } from "vitest";

// stt-providers.ts reads GROQ_API_KEY / GROQ_STT_MODEL into module-level
// constants at import time, so each scenario needs a fresh module graph with
// its own env — hence vi.resetModules() + dynamic import per test, same
// pattern as lib/ai/providers.test.ts.
const ENV_KEYS = [
  "GROQ_API_KEY",
  "GROQ_STT_MODEL",
  "PLAYWRIGHT",
  "PLAYWRIGHT_TEST_BASE_URL",
  "CI_PLAYWRIGHT",
];

async function loadSttProviders(env: Record<string, string | undefined>) {
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
  return await import("./stt-providers");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getSttProviderCandidate", () => {
  it("returns null when GROQ_API_KEY is unset (missing configuration)", async () => {
    const { getSttProviderCandidate } = await loadSttProviders({});
    expect(getSttProviderCandidate()).toBeNull();
  });

  it("returns a valid candidate once GROQ_API_KEY is set", async () => {
    const { getSttProviderCandidate } = await loadSttProviders({
      GROQ_API_KEY: "groq-test-key",
    });
    const candidate = getSttProviderCandidate();
    expect(candidate).not.toBeNull();
    expect(candidate?.id).toBe("groq");
    expect(candidate?.modelName).toBe("whisper-large-v3-turbo");
  });

  it("uses GROQ_STT_MODEL to override the default model id", async () => {
    const { getSttProviderCandidate } = await loadSttProviders({
      GROQ_API_KEY: "groq-test-key",
      GROQ_STT_MODEL: "whisper-large-v3",
    });
    expect(getSttProviderCandidate()?.modelName).toBe("whisper-large-v3");
  });

  it("never leaks the API key value into the candidate", async () => {
    const { getSttProviderCandidate } = await loadSttProviders({
      GROQ_API_KEY: "super-secret-groq-key",
    });
    const candidate = getSttProviderCandidate();
    expect(JSON.stringify(candidate)).not.toContain("super-secret-groq-key");
  });

  it("reports capability metadata matching an audio-in, text-out, non-streaming model", async () => {
    const { getSttProviderCandidate } = await loadSttProviders({
      GROQ_API_KEY: "groq-test-key",
    });
    expect(getSttProviderCandidate()?.capabilities).toEqual({
      streaming: false,
      structuredOutput: false,
      tools: false,
      audioInput: true,
      audioOutput: false,
    });
  });
});

describe("transcribeAudio", () => {
  it("returns a deterministic mock result in test mode, without a real network call", async () => {
    const { transcribeAudio } = await loadSttProviders({
      PLAYWRIGHT: "1",
    });
    const result = await transcribeAudio({
      data: new Uint8Array([1, 2, 3]),
      mimeType: "audio/webm",
    });
    expect(result).toEqual({
      text: "mock transcription",
      confidence: null,
      durationMs: 1000,
    });
  });

  it("is honest that confidence is null — Groq Whisper exposes no confidence score", async () => {
    const { transcribeAudio } = await loadSttProviders({
      PLAYWRIGHT: "1",
    });
    const result = await transcribeAudio({
      data: new ArrayBuffer(4),
      mimeType: "audio/wav",
    });
    expect(result.confidence).toBeNull();
  });

  it("throws a clear, specific error when GROQ_API_KEY is missing and a real call is attempted", async () => {
    // isTestEnvironment is false here (no Playwright env vars stubbed), so
    // transcribeAudio falls through to the real-call branch and should fail
    // fast on the missing key rather than attempting a network call.
    const { transcribeAudio } = await loadSttProviders({});
    await expect(
      transcribeAudio({ data: new Uint8Array([1]), mimeType: "audio/webm" })
    ).rejects.toThrow(/Voice input isn't configured/);
  });

  it("never includes an API key value in the missing-key setup error", async () => {
    const { transcribeAudio } = await loadSttProviders({});
    let caught: unknown;
    try {
      await transcribeAudio({
        data: new Uint8Array([1]),
        mimeType: "audio/webm",
      });
    } catch (error) {
      caught = error;
    }
    expect(String(caught)).not.toMatch(/GROQ_API_KEY=\S/);
  });
});
