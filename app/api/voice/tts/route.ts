import { Communicate } from "edge-tts-universal";
import type { NextRequest } from "next/server";
import { isTestEnvironment } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";
import { sanitizeForSpeech } from "@/lib/math/check-answer";
import { checkRateLimit } from "@/lib/ratelimit";
import { voiceTtsPostSchema } from "./schema";

export const maxDuration = 25;

const SPEED_TO_EDGE_RATE: Record<string, string> = {
  "0.85": "-15%",
  "1.0": "+0%",
  "1.15": "+15%",
};

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

  try {
    const communicate = new Communicate(cleanSpoken, {
      voice,
      rate,
      connectionTimeout: 6000,
    });

    const audioChunks: Buffer[] = [];
    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        audioChunks.push(chunk.data);
      }
    }

    if (audioChunks.length === 0) {
      return new ChatbotError(
        "offline:voice",
        "No neural audio returned; fall back to browser speechSynthesis."
      ).toResponse();
    }

    const combined = Buffer.concat(audioChunks);
    return new Response(combined, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=1800",
      },
    });
  } catch (err) {
    return new ChatbotError(
      "offline:voice",
      err instanceof Error ? err.message : "Neural TTS temporarily unavailable"
    ).toResponse();
  }
}
