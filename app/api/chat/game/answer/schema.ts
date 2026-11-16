import { z } from "zod";

export const answerTopicGameSchema = z.object({
  attemptId: z.string().uuid(),
  action: z.enum(["submit", "hint"]),
  answer: z.string().max(180).optional(),
  comboBefore: z.number().int().min(0).max(20).default(0),
  timeTakenMs: z.number().int().min(0).max(3_600_000).optional(),
});

export type AnswerTopicGameRequest = z.infer<typeof answerTopicGameSchema>;
