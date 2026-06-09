import { tool } from "ai";
import { z } from "zod";

// Poses ANY question that needs a response — a graded quiz question OR a
// non-graded prompt (e.g. name, year, "which topic?", "continue or switch?").
// The frontend renders the answer controls (radios / dropdown / text box) in a
// panel above the chat input so the student NEVER has to type the answer in the
// main chat box. For graded quiz questions, include correctAnswer for instant
// feedback; omit it for non-graded prompts (no grading/animation, just collects
// the answer).
export const askQuestion = tool({
  description:
    "Ask the student a NON-GRADED prompt only — their name, their year, which topic to start, or continue-or-switch. NEVER ask a maths/quiz/challenge/test question with this tool: graded questions are handled exclusively by the app's full-screen Challenge Mode after the student explicitly accepts. The app shows the answer controls (multiple choice / dropdown / text box) above the chat input and the student answers THERE, never in the main chat box. Do NOT include correctAnswer — any question carrying a correctAnswer is treated as a premature challenge and will be suppressed by the app.",
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
      .optional()
      .describe(
        "The correct answer, for GRADED quiz questions only (must match an option for choices). Omit for non-graded prompts like names or topic choices."
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
    correctAnswer: correctAnswer ?? "",
    explanation: explanation ?? "",
  }),
});
