import { z } from "zod";

export const startTopicGameSchema = z.object({
  topicSlug: z.string().trim().min(2).max(96),
});

export type StartTopicGameRequest = z.infer<typeof startTopicGameSchema>;
