import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";
import { getStudentProfile } from "@/lib/db/queries/student";

// Extracted from app/api/voice/session/route.ts, now shared with
// app/api/voice/transcribe/route.ts — same caller-resolution shape as
// app/(chat)/api/adaptive-challenge/route.ts and app/api/ai/hint/route.ts: a
// logged-in student with a profile is `studentId`-scoped; everyone else
// (guest, or logged-in with no profile yet) is `guestSessionId`-scoped using
// their auth user id as the key. Kept in its own file (not
// lib/voice/voice-session.ts) since it does real I/O (auth, cookies, a DB
// query) — voice-session.ts stays pure helpers over an already-loaded row.
export type VoiceCaller =
  | { studentId: string; guestSessionId?: undefined; callerId: string }
  | { studentId?: undefined; guestSessionId: string; callerId: string };

export async function resolveVoiceCaller(): Promise<VoiceCaller | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  if (session.user.type === "guest") {
    return { guestSessionId: session.user.id, callerId: session.user.id };
  }
  const cookieStore = await cookies();
  const activeStudentId = cookieStore.get("active_student_id")?.value;
  const studentProfile = await getStudentProfile(session.user.id, activeStudentId);
  if (!studentProfile) {
    return { guestSessionId: session.user.id, callerId: session.user.id };
  }
  return { studentId: studentProfile.id, callerId: studentProfile.id };
}
