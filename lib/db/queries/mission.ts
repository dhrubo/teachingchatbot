import "server-only";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatbotError } from "@/lib/errors";
import { missionProgress, type MissionProgress } from "../schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export async function getMissionProgress(
  studentId: string,
  missionId: string
): Promise<MissionProgress | null> {
  try {
    const rows = await db
      .select()
      .from(missionProgress)
      .where(
        and(eq(missionProgress.studentId, studentId), eq(missionProgress.missionId, missionId))
      )
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Failed to get mission progress:", error);
    throw new ChatbotError("bad_request:database");
  }
}

export async function getStudentMissionProgress(
  studentId: string
): Promise<MissionProgress[]> {
  try {
    return await db
      .select()
      .from(missionProgress)
      .where(eq(missionProgress.studentId, studentId));
  } catch (error) {
    console.error("Failed to get student mission progress:", error);
    throw new ChatbotError("bad_request:database");
  }
}

export async function upsertMissionProgress(
  studentId: string,
  missionId: string,
  data: Partial<
    Pick<MissionProgress, "status" | "phase" | "score" | "challengesDone" | "challengesTotal" | "conceptCardsViewed" | "lastLessonAt" | "completedAt">
  >
): Promise<MissionProgress> {
  try {
    const [row] = await db
      .insert(missionProgress)
      .values({ studentId, missionId, ...data })
      .onConflictDoUpdate({
        target: [missionProgress.studentId, missionProgress.missionId],
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return row;
  } catch (error) {
    console.error("Failed to upsert mission progress:", error);
    throw new ChatbotError("bad_request:database");
  }
}
