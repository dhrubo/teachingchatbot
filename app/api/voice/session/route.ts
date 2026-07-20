import { type NextRequest, NextResponse } from "next/server";
import { getAppConfig } from "@/lib/app-config";
import {
  createVoiceSession,
  getVoiceSessionById,
  terminateVoiceSession,
} from "@/lib/db/queries/voice-sessions";
import { ChatbotError } from "@/lib/errors";
import { checkVoiceRateLimit } from "@/lib/ratelimit";
import { resolveVoiceCaller } from "@/lib/voice/resolve-voice-caller";
import { checkVoiceSessionOwnership } from "@/lib/voice/voice-session";

/** Start (or resume-by-creating-a-new) tap-to-speak voice session. Never
 * exposes provider credentials — capabilities are booleans only. */
export async function POST(_request: NextRequest) {
  const config = getAppConfig();
  if (!config.voiceEnabled) {
    return new ChatbotError(
      "bad_request:voice",
      "Voice is not enabled on this deployment"
    ).toResponse();
  }

  const caller = await resolveVoiceCaller();
  if (!caller) {
    return new ChatbotError("unauthorized:voice").toResponse();
  }

  if (!checkVoiceRateLimit(caller.callerId, config.voiceRequestsPerHour)) {
    return new ChatbotError("rate_limit:voice").toResponse();
  }

  const created = await createVoiceSession({
    studentId: caller.studentId ?? null,
    guestSessionId: caller.guestSessionId ?? null,
    ttlMs: config.voiceSessionTtlMinutes * 60_000,
  });

  return NextResponse.json({
    voiceSessionId: created.id,
    expiresAt: created.expiresAt.toISOString(),
    capabilities: {
      // Server-side STT is only meaningfully "available" once a provider key
      // is configured — see lib/ai/stt-providers.ts. Checked by presence of
      // the env var here (not by importing the provider module) so this
      // route has no build-time dependency on which STT provider is chosen.
      sttAvailable: Boolean(process.env.GROQ_API_KEY),
      // Browser SpeechSynthesis — no server credential needed for the MVP.
      ttsAvailable: true,
    },
    limits: {
      maxDurationMs: config.voiceMaxAudioDurationMs,
      maxFileBytes: config.voiceMaxAudioFileBytes,
      silenceStopMs: config.voiceSilenceStopMs,
      minimumSpeechMs: config.voiceMinimumSpeechMs,
    },
  });
}

/** Explicit session termination — e.g. the student taps "end lesson" or
 * closes the voice UI. Idempotent: terminating an already-terminated or
 * unknown session both return a clean response, never a confusing error. */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const voiceSessionId = searchParams.get("id");
  if (!voiceSessionId) {
    return new ChatbotError("bad_request:voice", "id is required").toResponse();
  }

  const caller = await resolveVoiceCaller();
  if (!caller) {
    return new ChatbotError("unauthorized:voice").toResponse();
  }

  const existing = await getVoiceSessionById(voiceSessionId);
  if (!existing) {
    return NextResponse.json({ terminated: true });
  }
  if (!checkVoiceSessionOwnership(existing, caller)) {
    return new ChatbotError("forbidden:voice").toResponse();
  }

  await terminateVoiceSession(voiceSessionId);
  return NextResponse.json({ terminated: true });
}
