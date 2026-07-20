import type { VoiceSession } from "@/lib/db/schema";

// Pure helpers over a VoiceSession row — mirrors
// lib/adaptive/question-instance.ts's checkOwnership/isExpired pattern so the
// same reviewed security logic (owner + not expired + not terminated) is
// reused rather than re-derived ad hoc in the voice routes.

export type VoiceSessionCaller = { studentId?: string; guestSessionId?: string };

export function checkVoiceSessionOwnership(
  session: VoiceSession,
  caller: VoiceSessionCaller
): boolean {
  if (session.studentId) {
    return Boolean(caller.studentId) && caller.studentId === session.studentId;
  }
  if (session.guestSessionId) {
    return (
      Boolean(caller.guestSessionId) &&
      caller.guestSessionId === session.guestSessionId
    );
  }
  return false;
}

export function isVoiceSessionActive(
  session: Pick<VoiceSession, "expiresAt" | "terminatedAt">,
  now: Date = new Date()
): boolean {
  if (session.terminatedAt) {
    return false;
  }
  return session.expiresAt.getTime() > now.getTime();
}
