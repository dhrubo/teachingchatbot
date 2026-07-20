import { isTestEnvironment } from "../constants";

// Stable identifier, independent of the human-readable display name — same
// convention as ProviderId in ./providers.ts. Only one STT provider exists
// today (Groq Whisper), but this is a union (not a literal alias) so adding a
// second provider later doesn't require touching every call site.
export type SttProviderId = "groq";

export type SttCapabilities = {
  streaming: boolean;
  structuredOutput: boolean;
  tools: boolean;
  audioInput: boolean;
  audioOutput: boolean;
};

export type SttProviderCandidate = {
  id: SttProviderId;
  /** Human-readable, for logs/UI only — never compared against for matching. */
  displayName: string;
  modelName: string;
  capabilities: SttCapabilities;
};

export type TranscriptionResult = {
  text: string;
  /**
   * Confidence score for the transcription, or null if the provider doesn't
   * expose one.
   *
   * Groq Whisper genuinely has none to give: the AI SDK's public
   * `TranscriptionResult` type (in the "ai" package's transcribe-result.ts)
   * has no confidence field at all, and @ai-sdk/groq's own segment mapping
   * (its groq-transcription-model.ts) discards the raw `avg_logprob` /
   * `no_speech_prob` fields Groq's
   * verbose_json response includes per segment — only `text`, `startSecond`,
   * and `endSecond` survive. So there is nothing honest to report here. We
   * return null rather than fabricate a number, matching this repo's
   * best-effort-not-a-classifier honesty elsewhere (see
   * lib/ai/tutor-validator.ts's denylist comments).
   */
  confidence: number | null;
  /** Total audio duration in milliseconds, or null if the provider couldn't determine it. */
  durationMs: number | null;
};

const hasGroqKey = Boolean(process.env.GROQ_API_KEY);
// No default model hardcoded beyond this fallback — same "no default model"
// posture as providers.ts's OPENAI_MODEL, except here a sensible default
// genuinely exists (Groq's fast, cheap Whisper variant), so unlike OpenAI
// there's no account-eligibility ambiguity to avoid baking in.
const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo";

console.info(
  "[stt-config] groq=" +
    (hasGroqKey ? "SET ✓ model=" + GROQ_STT_MODEL : "unset")
);

// Whisper-style transcription models are request/response, not streamed
// token-by-token; they take audio in and only ever return text out, and they
// have no notion of tool calls or structured (JSON-schema) output.
const STT_CAPABILITIES: SttCapabilities = {
  streaming: false,
  structuredOutput: false,
  tools: false,
  audioInput: true,
  audioOutput: false,
};

/**
 * Returns the configured STT provider candidate, or null if GROQ_API_KEY is
 * unset. Never throws — callers (e.g. an API route) can use the null case to
 * produce a clear user-facing "voice input isn't configured" error rather
 * than an unhandled exception.
 */
export function getSttProviderCandidate(): SttProviderCandidate | null {
  if (!hasGroqKey) {
    return null;
  }

  return {
    id: "groq",
    displayName: "Groq (Whisper)",
    modelName: GROQ_STT_MODEL,
    capabilities: STT_CAPABILITIES,
  };
}

const SETUP_ERROR = [
  "Voice input isn't configured.",
  "",
  "Add a Groq API key to your .env.local:",
  "",
  "GROQ_API_KEY",
  "  https://console.groq.com/keys",
].join("\n");

/**
 * Transcribes raw audio bytes via Groq Whisper. Model id configurable via
 * GROQ_STT_MODEL (default "whisper-large-v3-turbo").
 *
 * Never logs the audio bytes themselves, and never includes GROQ_API_KEY (or
 * any part of it) in a returned value, thrown error, or log line — this app
 * serves children, and voice recordings are exactly the kind of payload that
 * must never end up in application logs.
 *
 * In test environments (see isTestEnvironment in ../constants) this returns
 * a deterministic mock instead of making a real network call, mirroring
 * getTutorProviderCandidates' isTestEnvironment branch in ./providers.ts —
 * so tests never depend on real credentials or network access.
 */
export async function transcribeAudio(audio: {
  data: ArrayBuffer | Uint8Array;
  mimeType: string;
}): Promise<TranscriptionResult> {
  if (isTestEnvironment) {
    return {
      text: "mock transcription",
      confidence: null,
      durationMs: 1000,
    };
  }

  // Deliberately checked here, at call time, rather than at module load —
  // other parts of the app (and this module's own exports) must keep working
  // when voice input isn't configured; only an actual transcription attempt
  // should fail.
  if (!hasGroqKey) {
    throw new Error(SETUP_ERROR);
  }

  const { experimental_transcribe: transcribe } = require("ai");
  const { groq } = require("@ai-sdk/groq");

  const bytes =
    audio.data instanceof Uint8Array ? audio.data : new Uint8Array(audio.data);

  // Note: the AI SDK's transcribe() does not take an explicit media-type
  // parameter — it sniffs the real container format from the audio's magic
  // bytes (node_modules/ai/src/util/detect-media-type.ts) rather than
  // trusting a caller-supplied MIME string, which is the right call for
  // arbitrary uploaded audio. `audio.mimeType` is accepted here for callers'
  // bookkeeping/logging, not forwarded to the provider.
  const result = await transcribe({
    model: groq.transcription(GROQ_STT_MODEL),
    audio: bytes,
  });

  return {
    text: result.text,
    confidence: null,
    durationMs:
      typeof result.durationInSeconds === "number"
        ? Math.round(result.durationInSeconds * 1000)
        : null,
  };
}
