import "server-only";

import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatbotError } from "@/lib/errors";
import { type StudentSkillMastery, studentSkillMastery } from "../schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

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
