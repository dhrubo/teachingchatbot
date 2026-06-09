import "server-only";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { missionProgress, type MissionProgress } from "../schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export async function getMissionProgress(
  studentId: string,
  missionId: string
): Promise<MissionProgress | null> {
  const rows = await db
    .select()
    .from(missionProgress)
    .where(
      and(eq(missionProgress.studentId, studentId), eq(missionProgress.missionId, missionId))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getStudentMissionProgress(
  studentId: string
): Promise<MissionProgress[]> {
  return db
    .select()
    .from(missionProgress)
    .where(eq(missionProgress.studentId, studentId));
}

export async function upsertMissionProgress(
  studentId: string,
  missionId: string,
  data: Partial<
    Pick<MissionProgress, "status" | "phase" | "score" | "challengesDone" | "challengesTotal" | "conceptCardsViewed" | "lastLessonAt" | "completedAt">
  >
) {
  await db
    .insert(missionProgress)
    .values({ studentId, missionId, ...data })
    .onConflictDoUpdate({
      target: [missionProgress.studentId, missionProgress.missionId],
      set: data,
    });
}
