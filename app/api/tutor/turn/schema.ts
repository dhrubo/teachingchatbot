import { z } from "zod";

export const tutorTurnPostSchema = z.object({
  topicSlug: z.string().min(1).max(96),
  action: z.enum([
    "start_topic",
    "switch_lens",
    "explain_differently",
    "step_back_prerequisite",
    "start_test",
    "submit_answer",
    "hint",
    "ask",
  ]),
  targetLens: z
    .enum(["story", "visual", "pattern", "exam", "socratic"])
    .optional(),
  stage: z.string().max(32).optional(),
  learnerMessage: z.string().max(1500).optional(),
});

export type TutorTurnPostBody = z.infer<typeof tutorTurnPostSchema>;
