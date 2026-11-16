import { z } from "zod";

export const switchLearnerSchema = z.object({
  learnerId: z.string().uuid(),
});

export type SwitchLearnerRequest = z.infer<typeof switchLearnerSchema>;
