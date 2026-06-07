import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  createGoal,
  getStudentsByUserId,
  updateGoal,
} from "@/lib/db/queries";

type Props = { session: Session };

// Creates or updates a short-term agreed learning goal for a student.
// Read existing goals via getStudentProgress.
export const manageGoals = ({ session }: Props) =>
  tool({
    description:
      "Create or update a student's short-term agreed goal (e.g. 'Practise percentages by 20 June'). Omit goalId to create a new goal; provide goalId to update an existing one (e.g. mark it achieved or needs_more_work). Agree 1–3 goals at the start of a session and update their status as the student progresses. Use getStudentProgress to read current goals.",
    inputSchema: z.object({
      studentId: z
        .string()
        .describe("The student's id from getStudentProgress."),
      goalId: z
        .string()
        .optional()
        .describe("Existing goal id. Omit to create a new goal."),
      description: z
        .string()
        .optional()
        .describe("Goal description (required when creating)."),
      topic: z
        .string()
        .optional()
        .describe("Related curriculum topic, if any."),
      targetDate: z
        .string()
        .optional()
        .describe("Target date as an ISO date string, e.g. 2026-06-20."),
      status: z
        .enum(["not_started", "in_progress", "achieved", "needs_more_work"])
        .optional(),
      confidence: z.enum(["low", "medium", "high"]).optional(),
      notes: z.string().optional(),
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

      const targetDate = input.targetDate
        ? new Date(input.targetDate)
        : undefined;

      // Create path
      if (!input.goalId) {
        if (!input.description) {
          return { error: "A description is required to create a goal." };
        }
        const created = await createGoal({
          studentId: input.studentId,
          description: input.description,
          topic: input.topic,
          targetDate,
          confidence: input.confidence,
          notes: input.notes,
        });
        return { created: true, goal: created };
      }

      // Update path
      const updated = await updateGoal({
        goalId: input.goalId,
        studentId: input.studentId,
        data: {
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.topic !== undefined && { topic: input.topic }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.confidence !== undefined && {
            confidence: input.confidence,
          }),
          ...(targetDate !== undefined && { targetDate }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });

      if (!updated) {
        return { error: "No matching goal for this student." };
      }
      return { updated: true, goal: updated };
    },
  });
