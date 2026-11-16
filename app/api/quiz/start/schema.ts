import { z } from "zod";

export const quizStartSchema = z.object({
  topicSlug: z.string().trim().min(2).max(96),
});

export type QuizStartRequest = z.infer<typeof quizStartSchema>;
