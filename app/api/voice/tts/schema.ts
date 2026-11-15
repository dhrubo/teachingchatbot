import { z } from "zod";

export const voiceTtsPostSchema = z.object({
  text: z.string().min(1).max(1200),
  speed: z.enum(["0.85", "1.0", "1.15"]).optional(),
});

export type VoiceTtsPostBody = z.infer<typeof voiceTtsPostSchema>;
