// lib/ai/tools/get-curriculum-topics.ts

import { tool } from "ai";
import { z } from "zod";
import { year8MathsCurriculum } from "../curriculum";

// A tool the model can call to fetch the in-scope curriculum.
// It takes no input and returns the curriculum text.
export const getCurriculumTopics = tool({
  description:
    "Get the list of Year 8 Maths curriculum topics the tutor is allowed to teach. Call this to check whether a student's question is in scope.",
  inputSchema: z.object({}),
  execute: async () => {
    return year8MathsCurriculum;
  },
});
