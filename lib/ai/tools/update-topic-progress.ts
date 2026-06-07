import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  getStudentsByUserId,
  getTopicProgressByStudentId,
  upsertTopicProgress,
} from "@/lib/db/queries";

type Props = { session: Session };

// Records progress for one topic after a student practises it. Maps the
// 0–5 score onto a status when one is not given.
export const updateTopicProgress = ({ session }: Props) =>
  tool({
    description:
      "Record a student's progress on one curriculum topic after they practise it. Call this whenever a topic has been worked on so progress persists between sessions. Provide the student's id (from getStudentProgress), the topic name, and the latest score out of 5.",
    inputSchema: z.object({
      studentId: z.string().describe("The student's id from getStudentProgress."),
      topic: z
        .string()
        .describe("Curriculum topic name, e.g. 'Percentages' or 'Basic algebra'."),
      score: z
        .number()
        .int()
        .min(0)
        .max(5)
        .describe("Mastery score 0–5 (0 not started … 5 mastered)."),
      status: z
        .enum(["not_started", "introduced", "practising", "secure", "mastered"])
        .optional()
        .describe("Override the status; inferred from score if omitted."),
      confidence: z.enum(["low", "medium", "high"]).optional(),
      gotItRight: z
        .boolean()
        .optional()
        .describe("True to increment successful attempts, false for support-needed."),
    }),
    execute: async (input) => {
      const userId = session.user?.id;
      if (!userId) {
        return { error: "No signed-in user." };
      }

      const students = await getStudentsByUserId({ userId });
      const student = students.find((s) => s.id === input.studentId);
      if (!student) {
        return { error: "No matching student for this account." };
      }

      const status = input.status ?? inferStatusFromScore(input.score);

      const current = (
        await getTopicProgressByStudentId({ studentId: input.studentId })
      ).find((t) => t.topic === input.topic);

      const successfulAttempts =
        (current?.successfulAttempts ?? 0) +
        (input.gotItRight === true ? 1 : 0);
      const supportNeededAttempts =
        (current?.supportNeededAttempts ?? 0) +
        (input.gotItRight === false ? 1 : 0);

      const row = await upsertTopicProgress({
        studentId: input.studentId,
        topic: input.topic,
        data: {
          score: input.score,
          status,
          ...(input.confidence && { confidence: input.confidence }),
          successfulAttempts,
          supportNeededAttempts,
          lastPractisedAt: new Date(),
        },
      });

      return { updated: true, progress: row };
    },
  });

function inferStatusFromScore(
  score: number
): "not_started" | "introduced" | "practising" | "secure" | "mastered" {
  if (score >= 5) {
    return "mastered";
  }
  if (score === 4) {
    return "secure";
  }
  if (score >= 2) {
    return "practising";
  }
  if (score === 1) {
    return "introduced";
  }
  return "not_started";
}
