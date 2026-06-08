// lib/app-config.ts
// Reads env vars at module load. Never re-reads (env vars are stable across
// a deployment). Every consumer reads from this single module.

export type AppMode = "FREE" | "PREMIUM";

export type AppConfig = {
  mode: AppMode;
  freeChatRetentionHours: number;
  guestDailyQuestionLimit: number;
};

let cached: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (cached) return cached;
  cached = {
    mode: (process.env.APP_MODE as AppMode) ?? "FREE",
    freeChatRetentionHours: Number(process.env.FREE_CHAT_RETENTION_HOURS) || 24,
    guestDailyQuestionLimit: Number(process.env.GUEST_DAILY_QUESTION_LIMIT) || 5,
  };
  return cached;
}
