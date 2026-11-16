import { z } from "zod";

export const askMathsPostSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, "Please type or speak a maths question")
    .max(600),
  explicitTopicSlug: z.string().trim().max(96).optional(),
  alternateLens: z.boolean().optional(),
});

export type AskMathsPostRequest = z.infer<typeof askMathsPostSchema>;
