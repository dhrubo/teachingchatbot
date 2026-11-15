import { type NextRequest, NextResponse } from "next/server";
import { transcribeAudioWithGroq } from "@/lib/ai/providers";
import { ChatbotError } from "@/lib/errors";
import { ensureLearnerCookie } from "@/lib/learner-session";
import { checkRateLimit } from "@/lib/ratelimit";

export const maxDuration = 30;

const MAX_AUDIO_BYTES = 6 * 1024 * 1024; // 6 MB

export async function POST(request: NextRequest) {
  const learnerId = await ensureLearnerCookie();
  const limit = checkRateLimit(`stt:${learnerId}`, 40, 60_000);
  if (!limit.allowed) {
    return new ChatbotError("rate_limit:voice").toResponse();
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new ChatbotError(
      "bad_request:voice",
      "Expected audio FormData"
    ).toResponse();
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return new ChatbotError(
      "bad_request:voice",
      "Missing or empty audio recording"
    ).toResponse();
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return new ChatbotError(
      "bad_request:voice",
      "Recording exceeds maximum size limit"
    ).toResponse();
  }

  try {
    const buffer = await audio.arrayBuffer();
    const result = await transcribeAudioWithGroq({
      data: buffer,
      mimeType: audio.type || "audio/webm",
    });

    return NextResponse.json({
      transcript: result.text,
      durationMs: result.durationMs,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "GROQ_API_KEY_MISSING") {
      return new ChatbotError(
        "offline:voice",
        "Add a free GROQ_API_KEY in .env.local for Whisper STT, or continue with browser voice."
      ).toResponse();
    }
    return new ChatbotError(
      "bad_request:voice",
      err instanceof Error ? err.message : "Audio transcription failed"
    ).toResponse();
  }
}
