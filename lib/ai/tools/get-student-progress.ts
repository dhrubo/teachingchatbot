import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  getGoalsByStudentId,
  getStudentsByUserId,
  getTopicProgressByStudentId,
} from "@/lib/db/queries";

type Props = { session: Session };

// Returns every student belonging to the account, plus their full progress
// record. The tutor should call this at the start of a session to recall
// who it is working with and what they have done before.
export const getStudentProgress = ({ session }: Props) =>
  tool({
    description:
      "Get the saved progress for the account's student(s): profile (name, school year, exam date, XP, streak, badges), per-topic progress (GCSE domain, status, confidence, score, attempts, last practised) and current short-term goals. Call this at the start of a session to recall prior progress and active goals, and whenever asked what a student has done, what they need to work on, for a summary, a parent report, or whether they are on track. If multiple students are returned, ask which one the session is about before continuing.",
    inputSchema: z.object({}),
    execute: async () => {
      const userId = session.user?.id;
      if (!userId) {
        return { error: "No signed-in user." };
      }

      const students = await getStudentsByUserId({ userId });
      if (students.length === 0) {
        return {
          students: [],
          note: "No student profiles yet. Ask the parent or child for the student's name and school year (8 or 9), then create one with updateStudentProfile.",
        };
      }

      const withProgress = await Promise.all(
        students.map(async (s) => ({
          id: s.id,
          name: s.name,
          schoolYear: s.schoolYear,
          examDate: s.examDate,
          xp: s.xp,
          streak: s.streak,
          badges: s.badges,
          confidenceNotes: s.confidenceNotes,
          parentReportNotes: s.parentReportNotes,
          lastSessionAt: s.lastSessionAt,
          topics: await getTopicProgressByStudentId({ studentId: s.id }),
          goals: await getGoalsByStudentId({ studentId: s.id }),
        }))
      );

      return { students: withProgress };
    },
  });
