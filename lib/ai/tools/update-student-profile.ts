import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  createStudent,
  getStudentsByUserId,
  updateStudentProfile as updateStudentProfileQuery,
} from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type Props = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

// Creates a student profile or updates an existing one. Use to set the
// student's name, school year, exam date, and to award XP / streak / badges
// or save confidence and parent-report notes.
export const updateStudentProfile = ({ session, dataStream }: Props) =>
  tool({
    description:
      "Create or update a student profile. Omit studentId to create a new student (name required). Provide studentId to update an existing one. Use this to set school year (8 or 9), an exam date, to award XP, update the streak, add a badge, or save confidence / parent-report notes.",
    inputSchema: z.object({
      studentId: z
        .string()
        .optional()
        .describe("Existing student's id. Omit to create a new student."),
      name: z.string().optional().describe("Student's name (required to create)."),
      schoolYear: z.enum(["8", "9"]).optional(),
      examDate: z
        .string()
        .optional()
        .describe("Exam date as an ISO date string, e.g. 2026-06-15."),
      xp: z.number().int().optional().describe("Set the absolute XP total."),
      streak: z.number().int().optional(),
      addBadge: z
        .string()
        .optional()
        .describe("A badge to add, e.g. 'Percentages Pro'."),
      confidenceNotes: z.string().optional(),
      parentReportNotes: z.string().optional(),
    }),
    execute: async (input) => {
      const userId = session.user?.id;
      if (!userId) {
        return { error: "No signed-in user." };
      }

      const students = await getStudentsByUserId({ userId });

      // Create path
      if (!input.studentId) {
        if (!input.name) {
          return { error: "A name is required to create a new student." };
        }
        const created = await createStudent({
          userId,
          name: input.name,
          schoolYear: input.schoolYear,
        });
        // Apply any further fields in a follow-up update.
        return { created: true, student: created };
      }

      // Update path — verify ownership
      const existing = students.find((s) => s.id === input.studentId);
      if (!existing) {
        return { error: "No matching student for this account." };
      }

      const badges = input.addBadge
        ? Array.from(new Set([...existing.badges, input.addBadge]))
        : undefined;

      const updated = await updateStudentProfileQuery({
        studentId: input.studentId,
        userId,
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.schoolYear !== undefined && {
            schoolYear: input.schoolYear,
          }),
          ...(input.examDate !== undefined && {
            examDate: new Date(input.examDate),
          }),
          ...(input.xp !== undefined && { xp: input.xp }),
          ...(input.streak !== undefined && { streak: input.streak }),
          ...(badges !== undefined && { badges }),
          ...(input.confidenceNotes !== undefined && {
            confidenceNotes: input.confidenceNotes,
          }),
          ...(input.parentReportNotes !== undefined && {
            parentReportNotes: input.parentReportNotes,
          }),
          lastSessionAt: new Date(),
        },
      });

      // Surface live XP / streak / badges to the UI.
      if (updated) {
        dataStream.write({
          type: "data-xp-streak",
          data: {
            xp: updated.xp,
            streak: updated.streak,
            badges: updated.badges,
          },
        });
        // If a brand-new badge was just earned, fire an achievement toast.
        if (input.addBadge && !existing.badges.includes(input.addBadge)) {
          dataStream.write({
            type: "data-achievement",
            data: { label: input.addBadge, kind: "badge" },
          });
        }
      }

      return { updated: true, student: updated };
    },
  });
