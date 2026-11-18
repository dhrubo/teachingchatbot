import "server-only";
import { DEFAULT_PODCAST_VOICE, wrapPcm16InWav } from "./podcast-script";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

type CatalogVoiceItem = {
  id?: string;
  display_name?: string;
  language_code?: string;
  accent?: string;
  contexts?: string[];
};

let cachedJoriVoiceId: string | null = null;
let cachedJoriCheckedAt = 0;

function getGeminiApiKey(): string | null {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();
  return key && key.length > 5 ? key : null;
}

function podcastStyleForSpeed(speed: string): string {
  if (speed === "0.85") {
    return "warm, engaging English podcast host, relaxed and unhurried conversational pace";
  }
  if (speed === "1.15") {
    return "warm, upbeat English podcast host, lively and crisp conversational pace";
  }
  return "warm, natural, engaging English podcast host";
}

/**
 * Resolves the exact voice identifier for "Jori" from Google's Extended Voice Library
 * (`GET /v1beta/voices?search=Jori`), preferring an English + Podcast/Conversational entry.
 * Cached in memory for fast subsequent turns.
 */
async function resolveJoriVoiceId(apiKey: string): Promise<string> {
  const now = Date.now();
  if (cachedJoriVoiceId && now - cachedJoriCheckedAt < 3_600_000) {
    return cachedJoriVoiceId;
  }

  try {
    const url = `${GEMINI_API_BASE}/voices?search=Jori&page_size=50`;
    const res = await fetch(url, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(3200),
    });

    if (res.ok) {
      const data = (await res.json()) as { voices?: CatalogVoiceItem[] };
      const voices = data.voices ?? [];
      const candidates = voices.filter((v) => {
        const name = (v.display_name ?? "").toLowerCase();
        const id = (v.id ?? "").toLowerCase();
        return name.includes("jori") || id.includes("jori");
      });

      if (candidates.length > 0) {
        const scored = [...candidates].sort((a, b) => {
          const scoreVoice = (v: CatalogVoiceItem) => {
            let s = 0;
            if ((v.display_name ?? "").toLowerCase() === "jori") {
              s += 10;
            }
            if ((v.language_code ?? "").toLowerCase().startsWith("en")) {
              s += 8;
            }
            const ctx = (v.contexts ?? []).join(" ").toLowerCase();
            if (ctx.includes("podcast")) {
              s += 6;
            } else if (ctx.includes("conversational")) {
              s += 4;
            }
            return s;
          };
          return scoreVoice(b) - scoreVoice(a);
        });

        const winnerId = scored[0]?.id?.trim();
        if (winnerId) {
          cachedJoriVoiceId = winnerId;
          cachedJoriCheckedAt = now;
          return winnerId;
        }
      }
    }
  } catch {
    // Fall back to passing "Jori" directly
  }

  cachedJoriVoiceId = DEFAULT_PODCAST_VOICE;
  cachedJoriCheckedAt = now;
  return DEFAULT_PODCAST_VOICE;
}

type InteractionsResponse = {
  output_audio?: { data?: string };
  steps?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      data?: string;
    }>;
  }>;
};

async function tryGeminiInteractionsTts(params: {
  apiKey: string;
  model: string;
  voice: string;
  text: string;
  style: string;
}): Promise<Buffer | null> {
  const res = await fetch(`${GEMINI_API_BASE}/interactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": params.apiKey,
    },
    body: JSON.stringify({
      model: params.model,
      input: [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text: params.text,
              annotations: [
                {
                  type: "speech_metadata",
                  style: params.style,
                },
              ],
            },
          ],
        },
      ],
      response_format: {
        type: "audio",
      },
      generation_config: {
        speech_config: [{ voice: params.voice }],
      },
    }),
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as InteractionsResponse;
  let base64Audio = data.output_audio?.data;

  if (!base64Audio && Array.isArray(data.steps)) {
    for (const step of data.steps) {
      if (step.type === "model_output" && Array.isArray(step.content)) {
        for (const item of step.content) {
          if (item.type === "audio" && item.data) {
            base64Audio = item.data;
          }
        }
      }
    }
  }

  if (!base64Audio) {
    return null;
  }

  const rawBytes = Buffer.from(base64Audio, "base64");
  if (rawBytes.length < 64) {
    return null;
  }
  return wrapPcm16InWav(rawBytes, 24_000);
}

type GenerateContentTtsResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
};

async function tryGeminiGenerateContentTts(params: {
  apiKey: string;
  model: string;
  voiceName: string;
  text: string;
  style: string;
}): Promise<Buffer | null> {
  const res = await fetch(
    `${GEMINI_API_BASE}/models/${params.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": params.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Speak in English in a ${params.style} style: ${params.text}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: params.voiceName,
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(9000),
    }
  );

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as GenerateContentTtsResponse;
  const base64Audio =
    data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    return null;
  }

  const pcmBytes = Buffer.from(base64Audio, "base64");
  if (pcmBytes.length < 64) {
    return null;
  }
  return wrapPcm16InWav(pcmBytes, 24_000);
}

export type GeminiPodcastSynthesisResult = {
  audioBuffer: Buffer;
  mimeType: "audio/wav";
  engine: string;
  voiceUsed: string;
};

/**
 * Synthesizes English podcast-mode speech with the "Jori" voice via Gemini TTS.
 * Uses `GOOGLE_GENERATIVE_AI_API_KEY` already configured in the environment.
 */
export async function synthesizeWithGeminiJoriPodcast(
  text: string,
  speed = "1.0"
): Promise<GeminiPodcastSynthesisResult | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const style = podcastStyleForSpeed(speed);
  const joriVoiceId = await resolveJoriVoiceId(apiKey);
  const candidateVoices =
    joriVoiceId === "Sulafat" ? [joriVoiceId] : [joriVoiceId, "Sulafat"];

  // 1. Primary: Gemini 3.8 TTS Interactions API (Jori in English Podcast Mode)
  for (const model of ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"]) {
    for (const voice of candidateVoices) {
      try {
        const wav = await tryGeminiInteractionsTts({
          apiKey,
          model,
          voice,
          text,
          style,
        });
        if (wav) {
          return {
            audioBuffer: wav,
            mimeType: "audio/wav",
            engine: `gemini-interactions:${model}`,
            voiceUsed: voice,
          };
        }
      } catch {
        // Continue to next model/voice candidate
      }
    }
  }

  // 2. Secondary: Gemini generateContent AUDIO endpoint (3.1 / 2.5 preview TTS)
  for (const model of [
    "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-preview-tts",
  ]) {
    for (const voiceName of candidateVoices) {
      try {
        const wav = await tryGeminiGenerateContentTts({
          apiKey,
          model,
          voiceName,
          text,
          style,
        });
        if (wav) {
          return {
            audioBuffer: wav,
            mimeType: "audio/wav",
            engine: `gemini-generateContent:${model}`,
            voiceUsed: voiceName,
          };
        }
      } catch {
        // Continue to next candidate
      }
    }
  }

  return null;
}
