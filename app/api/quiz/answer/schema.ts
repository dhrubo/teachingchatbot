import { z } from "zod";

export const quizAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  action: z.enum(["submit", "hint"]),
  answer: z.string().max(160).optional(),
  timeTakenMs: z.number().int().min(0).max(3_600_000).optional(),
  tabSwitchesDelta: z.number().int().min(0).max(50).default(0),
  pasteDelta: z.number().int().min(0).max(50).default(0),
});

export type QuizAnswerRequest = z.infer<typeof quizAnswerSchema>;
