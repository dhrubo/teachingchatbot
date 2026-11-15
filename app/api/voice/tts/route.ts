import { Communicate } from "edge-tts-universal";
import type { NextRequest } from "next/server";
import { isTestEnvironment } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";
import { sanitizeForSpeech } from "@/lib/math/check-answer";
import { checkRateLimit } from "@/lib/ratelimit";
import { voiceTtsPostSchema } from "./schema";

export const maxDuration = 15;

const SPEED_TO_EDGE_RATE: Record<string, string> = {
  "0.85": "-15%",
  "1.0": "+0%",
  "1.15": "+15%",
};

function splitIntoShortChunks(text: string, maxLen = 185): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    if (sentence.length <= maxLen) {
      chunks.push(sentence);
      continue;
    }
    const words = sentence.split(/\s+/);
    let current = "";
    for (const word of words) {
      if (`${current} ${word}`.trim().length <= maxLen) {
        current = `${current} ${word}`.trim();
      } else {
        if (current) {
          chunks.push(current);
        }
        current = word;
      }
    }
    if (current) {
      chunks.push(current);
    }
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

async function synthesizeWithEdgeNeural(
  text: string,
  voice: string,
  rate: string
): Promise<Buffer> {
  const collectPromise = (async () => {
    const communicate = new Communicate(text, {
      voice,
      rate,
      connectionTimeout: 2500,
    });
    const audioChunks: Buffer[] = [];
    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        audioChunks.push(chunk.data);
      }
    }
    if (audioChunks.length === 0) {
      throw new Error("Empty Edge TTS stream");
    }
    return Buffer.concat(audioChunks);
  })();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Edge TTS timed out"));
    }, 2600);
  });

  try {
    return await Promise.race([collectPromise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function synthesizeWithFastGbHttp(text: string): Promise<Buffer> {
  const chunks = splitIntoShortChunks(text, 185);
  const buffers: Buffer[] = [];

  for (const piece of chunks) {
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en-GB&client=tw-ob&q=${encodeURIComponent(piece)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      throw new Error(`HTTP TTS returned ${res.status}`);
    }
    const arr = await res.arrayBuffer();
    buffers.push(Buffer.from(arr));
  }

  if (buffers.length === 0) {
    throw new Error("No HTTP TTS buffers generated");
  }
  return Buffer.concat(buffers);
}

export async function POST(request: NextRequest) {
  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return new ChatbotError(
      "bad_request:voice",
      "Invalid JSON body"
    ).toResponse();
  }

  const parsed = voiceTtsPostSchema.safeParse(rawJson);
  if (!parsed.success) {
    return new ChatbotError(
      "bad_request:voice",
      parsed.error.issues[0]?.message
    ).toResponse();
  }

  const learnerId = await resolveLearnerIdFromCookies();
  const limit = checkRateLimit(`tts:${learnerId}`, 60, 60_000);
  if (!limit.allowed) {
    return new ChatbotError("rate_limit:voice").toResponse();
  }

  if (isTestEnvironment) {
    return new Response(new Uint8Array([0x49, 0x44, 0x33]), {
      headers: { "Content-Type": "audio/mpeg" },
    });
  }

  const cleanSpoken = sanitizeForSpeech(parsed.data.text);
  const voice = process.env.TTS_VOICE?.trim() || "en-GB-SoniaNeural";
  const rate = SPEED_TO_EDGE_RATE[parsed.data.speed ?? "1.0"] ?? "+0%";
  const isVercelDatacenter = Boolean(process.env.VERCEL);

  try {
    // On Vercel AWS datacenters, Bing's consumer Edge WebSocket blocks connections;
    // go straight to the fast ~300ms British English HTTP MP3 synthesizer.
    const audioBuffer = isVercelDatacenter
      ? await synthesizeWithFastGbHttp(cleanSpoken)
      : await synthesizeWithEdgeNeural(cleanSpoken, voice, rate).catch(() =>
          synthesizeWithFastGbHttp(cleanSpoken)
        );

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=1800",
      },
    });
  } catch (err) {
    return new ChatbotError(
      "offline:voice",
      err instanceof Error ? err.message : "TTS temporarily unavailable"
    ).toResponse();
  }
}
