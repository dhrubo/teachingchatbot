import { type NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  selectNextQuestionForLesson,
  selectNextQuestionForMission,
  submitAnswerForInstance,
} from "@/lib/adaptive/engine";
import { getAppConfig } from "@/lib/app-config";
import { countGuestAttemptsSince } from "@/lib/db/queries/questions";
import { getStudentProfile } from "@/lib/db/queries/student";
import { upsertConfidence } from "@/lib/db/queries/learning-science";
import { tryBatchAnalysis } from "@/lib/learning-science/batch-misconception-analysis";

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

    // `next` is already a sanitised DTO (lib/adaptive/question-instance.ts) —
    // it contains no correctAnswer, grading rules or misconception tags. The
    // canonical QuestionInstance row was already persisted server-side by the
    // engine before this response was built.
    return NextResponse.json({ question: next });
  }

  if (action === "submit-answer") {
    const { questionInstanceId, studentAnswer, timeTakenMs, confidence, idempotencyKey } =
      body as {
        questionInstanceId?: string;
        studentAnswer?: string;
        timeTakenMs?: unknown;
        confidence?: unknown;
        idempotencyKey?: string;
      };

    if (!questionInstanceId || typeof studentAnswer !== "string") {
      return NextResponse.json(
        { error: "questionInstanceId and studentAnswer are required" },
        { status: 400 }
      );
    }

    const result = await submitAnswerForInstance({
      questionInstanceId,
      studentAnswer,
      timeTakenMs,
      confidence,
      idempotencyKey: idempotencyKey ?? null,
      studentId: "studentId" in caller ? caller.studentId : undefined,
      guestSessionId: caller.isGuest ? caller.guestSessionId : undefined,
    });

    switch (result.status) {
      case "not_found":
        return NextResponse.json(
          { error: "Question not found or already expired." },
          { status: 404 }
        );
      case "forbidden":
        return NextResponse.json(
          { error: "This question was not issued to you." },
          { status: 403 }
        );
      case "expired":
        return NextResponse.json(
          { error: "This question has expired. Request a new one." },
          { status: 410 }
        );
      case "duplicate":
        return NextResponse.json(
          { error: "This question has already been answered." },
          { status: 409 }
        );
      case "ok": {
        // Defer batch misconception analysis past the response instead of
        // leaving an untracked promise — Next.js keeps the function alive
        // until this resolves, without delaying the client's response.
        const analysisStudentId =
          "studentId" in caller ? caller.studentId : undefined;
        if (analysisStudentId) {
          after(() => tryBatchAnalysis(analysisStudentId));
        }
        return NextResponse.json({
          isCorrect: result.isCorrect,
          correctAnswer: result.correctAnswer,
          explanation: result.explanation,
          mastery: result.mastery,
        });
      }
      default:
        return NextResponse.json({ error: "Unknown error." }, { status: 500 });
    }
  }

  if (action === "record-confidence") {
    const { subject, skillSlug, confidence, topic } = body as {
      subject?: string;
      skillSlug: string;
      confidence: number;
      topic?: string;
    };

    if (!skillSlug || typeof confidence !== "number") {
      return NextResponse.json(
        { error: "skillSlug and confidence are required" },
        { status: 400 }
      );
    }

    if (!caller.isGuest && "studentId" in caller) {
      await upsertConfidence({
        studentId: caller.studentId,
        subject: subject ?? "maths",
        skillSlug,
        topic,
        confidence,
      });
    }

    return NextResponse.json({ recorded: true });
  }

  return NextResponse.json(
    { error: `Invalid action: ${action}` },
    { status: 400 }
  );
}
