// lib/app-config.ts
// Reads env vars at module load. Never re-reads (env vars are stable across
// a deployment). Every consumer reads from this single module.

export type AppMode = "FREE" | "PREMIUM";

export type AppConfig = {
  mode: AppMode;
  freeChatRetentionHours: number;
  guestDailyQuestionLimit: number;
  voiceEnabled: boolean;
  voiceSessionTtlMinutes: number;
  voiceMaxAudioDurationMs: number;
  voiceMaxAudioFileBytes: number;
  voiceSilenceStopMs: number;
  voiceMinimumSpeechMs: number;
  voiceRequestsPerHour: number;
};

let cached: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (cached) return cached;
  cached = {
    mode: (process.env.APP_MODE as AppMode) ?? "FREE",
    freeChatRetentionHours: Number(process.env.FREE_CHAT_RETENTION_HOURS) || 24,
    guestDailyQuestionLimit:
      Number(process.env.GUEST_DAILY_QUESTION_LIMIT) || 5,
    // Off by default: voice is a new, credential-dependent (Groq Whisper)
    // surface — an operator must opt in once STT is actually configured,
    // rather than the feature silently appearing the moment this code ships.
    voiceEnabled: process.env.VOICE_ENABLED === "1",
    // Voice MVP limits — see docs/privacy.md's voice section. Deliberately
    // conservative defaults (tap-to-speak, one short utterance at a time),
    // all overridable so an operator can tune without a code change.
    voiceSessionTtlMinutes: Number(process.env.VOICE_SESSION_TTL_MINUTES) || 30,
    voiceMaxAudioDurationMs: Number(process.env.VOICE_MAX_AUDIO_DURATION_MS) || 30_000,
    voiceMaxAudioFileBytes: Number(process.env.VOICE_MAX_AUDIO_FILE_BYTES) || 5_242_880,
    voiceSilenceStopMs: Number(process.env.VOICE_SILENCE_STOP_MS) || 1200,
    voiceMinimumSpeechMs: Number(process.env.VOICE_MINIMUM_SPEECH_MS) || 250,
    voiceRequestsPerHour: Number(process.env.VOICE_REQUESTS_PER_HOUR) || 60,
  };
  return cached;
}
