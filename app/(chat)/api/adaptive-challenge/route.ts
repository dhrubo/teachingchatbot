import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  recordAnswer,
  selectNextQuestionForLesson,
  selectNextQuestionForMission,
} from "@/lib/adaptive/engine";
import { getAppConfig } from "@/lib/app-config";
import { countGuestAttemptsSince } from "@/lib/db/queries/questions";
import { getStudentProfile } from "@/lib/db/queries/student";

// Resolve the caller into either a logged-in studentId or a guestSessionId.
async function resolveCaller() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  if (session.user.type === "guest") {
    // Guests are not persisted as students; use their user id as a session key.
    return { guestSessionId: session.user.id, isGuest: true as const };
  }
  const studentProfile = await getStudentProfile(session.user.id);
  if (!studentProfile) {
    // Logged-in but no student profile yet — treat as guest-style session.
    return { guestSessionId: session.user.id, isGuest: true as const };
  }
  return { studentId: studentProfile.id, isGuest: false as const };
}

export async function POST(req: NextRequest) {
  const caller = await resolveCaller();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "next-question") {
    const { missionSlug, lessonSlug } = body as {
      missionSlug?: string;
      lessonSlug?: string;
    };
    if (!(missionSlug || lessonSlug)) {
      return NextResponse.json(
        { error: "missionSlug or lessonSlug is required" },
        { status: 400 }
      );
    }

    // Guest daily limit: never fetch another question past the limit, and
    // never call the LLM. (The adaptive engine itself is LLM-free.)
    if (caller.isGuest) {
      const limit = getAppConfig().guestDailyQuestionLimit;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const used = await countGuestAttemptsSince(caller.guestSessionId, since);
      if (used >= limit) {
        return NextResponse.json(
          {
            limitReached: true,
            message:
              "You've used today's free questions. Come back tomorrow, or create an account to save progress and continue learning.",
          },
          { status: 200 }
        );
      }
    }

    let next: Awaited<ReturnType<typeof selectNextQuestionForMission>> = null;
    try {
      next = lessonSlug
        ? await selectNextQuestionForLesson({
            studentId: "studentId" in caller ? caller.studentId : undefined,
            guestSessionId: caller.isGuest ? caller.guestSessionId : undefined,
            lessonSlug,
          })
        : await selectNextQuestionForMission({
            studentId: "studentId" in caller ? caller.studentId : undefined,
            guestSessionId: caller.isGuest ? caller.guestSessionId : undefined,
            missionSlug: missionSlug as string,
          });
    } catch (err) {
      console.error("[adaptive-challenge] engine error:", err, {
        missionSlug,
        isGuest: caller.isGuest,
      });
      return NextResponse.json(
        { error: "Failed to generate question." },
        { status: 500 }
      );
    }

    if (!next) {
      return NextResponse.json(
        { error: "No questions available for this lesson yet." },
        { status: 404 }
      );
    }

    // Never leak the answer key to guests? Local grading needs it client-side,
    // and these are low-stakes practice questions, so we return it for instant
    // feedback with zero round-trips.
    return NextResponse.json({ question: next });
  }

  if (action === "submit-answer") {
    const {
      archetypeId,
      skillSlug,
      difficultyBand,
      prompt,
      studentAnswer,
      correctAnswer,
      rules,
      misconceptionTags,
      timeTakenMs,
    } = body;

    if (!(archetypeId && skillSlug && difficultyBand)) {
      return NextResponse.json(
        { error: "archetypeId, skillSlug and difficultyBand are required" },
        { status: 400 }
      );
    }

    const result = await recordAnswer({
      studentId: "studentId" in caller ? caller.studentId : undefined,
      guestSessionId: caller.isGuest ? caller.guestSessionId : undefined,
      archetypeId,
      skillSlug,
      difficultyBand,
      prompt: prompt ?? "",
      studentAnswer: studentAnswer ?? "",
      correctAnswer: correctAnswer ?? "",
      rules,
      misconceptionTags,
      timeTakenMs,
    });

    return NextResponse.json({
      isCorrect: result.isCorrect,
      mastery: result.mastery,
    });
  }

  return NextResponse.json(
    { error: `Invalid action: ${action}` },
    { status: 400 }
  );
}
