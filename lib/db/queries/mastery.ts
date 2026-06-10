import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ChatbotError } from "@/lib/errors";
import { type StudentSkillMastery, studentSkillMastery } from "../schema";

export async function getSkillMasteryByStudentId({
  studentId,
}: {
  studentId: string;
}): Promise<StudentSkillMastery[]> {
  try {
    return await db
      .select()
      .from(studentSkillMastery)
      .where(eq(studentSkillMastery.studentId, studentId))
      .orderBy(desc(studentSkillMastery.masteryScore));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get skill mastery"
    );
  }
}
