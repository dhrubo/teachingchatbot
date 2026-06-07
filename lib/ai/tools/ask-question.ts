import { tool } from "ai";
import { z } from "zod";

// Poses an interactive question to the student. The frontend renders the
// answer controls (radios / select / text box) in a panel above the chat
// input and grades the answer on the client, so ALWAYS provide correctAnswer.
export const askQuestion = tool({
  description:
    "Ask the student ONE interactive question. The app shows the answer controls (multiple choice / dropdown / text box) above the chat input and the student answers there — so do NOT also write the options as text. Use this for every 'YOUR TURN' question. Always include the correctAnswer so the app can give instant feedback.",
  inputSchema: z.object({
    prompt: z.string().describe("The question text shown to the student."),
    type: z
      .enum(["multiple_choice", "select", "text"])
      .describe(
        "multiple_choice = radio buttons; select = dropdown; text = free-text/number box."
      ),
    options: z
      .array(z.string())
      .optional()
      .describe(
        "Answer options for multiple_choice or select (omit for text)."
      ),
    correctAnswer: z
      .string()
      .describe(
        "The correct answer. For choices, must exactly match one option."
      ),
    explanation: z
      .string()
      .optional()
      .describe("A short why-it's-right note, used after answering."),
  }),
  // The tool itself just echoes the question; rendering + grading is client-side.
  execute: ({ prompt, type, options, correctAnswer, explanation }) => ({
    prompt,
    type,
    options: options ?? [],
    correctAnswer,
    explanation: explanation ?? "",
  }),
});
