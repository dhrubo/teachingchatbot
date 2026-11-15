import { z } from "zod";

export const learnerConfigPatchSchema = z.object({
  nickname: z.string().trim().min(1).max(48).optional(),
  tier: z.enum(["foundation", "higher"]).optional(),
  targetGrade: z.number().int().min(1).max(9).optional(),
  preferredLens: z
    .enum(["story", "visual", "pattern", "exam", "socratic"])
    .optional(),
  toneStyle: z.enum(["encouraging", "calm", "friendly", "direct"]).optional(),
  speechSpeed: z.enum(["0.85", "1.0", "1.15"]).optional(),
  dailyGoalMinutes: z.number().int().min(3).max(60).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderHour: z.number().int().min(0).max(23).optional(),
  reminderMinute: z.number().int().min(0).max(59).optional(),
  timezone: z.string().min(2).max(64).optional(),
});

export type LearnerConfigPatchBody = z.infer<typeof learnerConfigPatchSchema>;
