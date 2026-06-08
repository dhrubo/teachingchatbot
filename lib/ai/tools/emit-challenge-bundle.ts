import { tool } from "ai";
import { z } from "zod";

// Emits a bundle of 3-5 challenges in one tool call. The client stores the
// bundle and presents challenges one at a time, grading locally without extra
// LLM calls. Only after all challenges are exhausted does the student's next
// message trigger a fresh LLM turn.
export const emitChallengeBundle = tool({
  description: `Generate a bundle of 3 graded practice challenges for the student.

Call this ONCE per lesson instead of calling askQuestion many times.
Include the lesson intro + the full set of challenges in one go.
The app will present them one at a time and grade correct/incorrect locally.

Rules:
- Generate exactly 3 challenges at varying difficulty (easy/medium/hard).
- Keep each challenge short — one line for the prompt, concise options.
- Always include correctAnswer for every challenge (so the app can grade locally).
- For multiple_choice, provide 4 options.
- For short_text, provide acceptableAnswers for flexible matching.
- Always include a helpful hint and a clear explanation.
- The lessonIntro is shown before the first challenge.`,
  inputSchema: z.object({
    topic: z.string().describe("The topic this bundle covers."),
    lessonIntro: z
      .string()
      .describe(
        "A short 2-3 line intro to the concept (shown before the first challenge). Use visuals (⬛ ⬜ fraction bars)."
      ),
    challenges: z.array(
      z.object({
        id: z.string().describe("Unique identifier for this challenge."),
        prompt: z.string().describe("The question shown to the student."),
        type: z
          .enum(["multiple_choice", "short_text"])
          .describe(
            "multiple_choice = 4 radio options; short_text = typed answer."
          ),
        options: z
          .array(z.string())
          .length(4)
          .optional()
          .describe("4 answer choices for multiple_choice."),
        correctAnswer: z
          .string()
          .describe(
            "The exact correct answer. For short_text, the primary accepted form."
          ),
        acceptableAnswers: z
          .array(z.string())
          .optional()
          .describe(
            "Alternative accepted forms for short_text (e.g. synonyms, different word orders)."
          ),
        hint: z
          .string()
          .describe("A short hint shown after a wrong answer."),
        explanation: z
          .string()
          .describe(
            "A clear explanation of the right answer and why the common wrong answer is wrong."
          ),
        difficulty: z
          .enum(["easy", "medium", "hard", "boss"])
          .describe("How hard this challenge is."),
      })
    ),
  }),
  execute: ({ topic, lessonIntro, challenges }) => ({
    topic,
    lessonIntro,
    challenges,
  }),
});
