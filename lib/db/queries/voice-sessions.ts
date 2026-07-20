import "server-only";

import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { type VoiceSession, voiceSession } from "../schema";

export async function createVoiceSession(values: {
  studentId?: string | null;
  guestSessionId?: string | null;
  ttlMs: number;
}): Promise<VoiceSession> {
  const now = new Date();
  const rows = await db
    .insert(voiceSession)
    .values({
      studentId: values.studentId ?? null,
      guestSessionId: values.guestSessionId ?? null,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + values.ttlMs),
    })
    .returning();
  return rows[0];
}

export async function getVoiceSessionById(
  id: string
): Promise<VoiceSession | null> {
  const rows = await db
    .select()
    .from(voiceSession)
    .where(eq(voiceSession.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Bump lastActivityAt — called on every transcribe request against a live session. */
export async function touchVoiceSession(id: string): Promise<void> {
  await db
    .update(voiceSession)
    .set({ lastActivityAt: new Date() })
    .where(eq(voiceSession.id, id));
}

export async function terminateVoiceSession(id: string): Promise<VoiceSession | null> {
  const rows = await db
    .update(voiceSession)
    .set({ terminatedAt: new Date() })
    .where(and(eq(voiceSession.id, id), isNull(voiceSession.terminatedAt)))
    .returning();
  return rows[0] ?? null;
}

/** Purge guest-only voice sessions older than `olderThanHours` — same retention
 * window and guest-only scope as deleteExpiredGuestQuestionData. No audio is
 * ever stored here, so this is just bookkeeping cleanup, not a privacy control
 * in itself. */
export async function deleteExpiredGuestVoiceSessions({
  olderThanHours,
}: {
  olderThanHours: number;
}): Promise<{ deletedVoiceSessions: number }> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const rows = await db
    .delete(voiceSession)
    .where(
      and(isNull(voiceSession.studentId), lt(voiceSession.createdAt, cutoff))
    )
    .returning({ id: voiceSession.id });
  return { deletedVoiceSessions: rows.length };
}
