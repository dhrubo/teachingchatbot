import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getStudentProfile } from "@/lib/db/queries/student";
import { getTutorProviderCandidates } from "@/lib/ai/providers";
import { getApprovalStatus } from "@/lib/db/queries/admin";
import { cookies } from "next/headers";
import { streamTextWithFallback } from "@/lib/ai/stream-with-provider-fallback";
import { logAICall } from "@/lib/db/queries/analytics";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { questionPrompt, studentAnswer, skillSlug } = body as {
      questionPrompt?: string;
      studentAnswer?: string;
      skillSlug?: string;
    };

    if (!questionPrompt) {
      return NextResponse.json(
        { error: "questionPrompt is required" },
        { status: 400 }
      );
    }

    const userType = session.user.type;
    const cookieStore = await cookies();
    const activeStudentId = cookieStore.get("active_student_id")?.value;

    const [studentProfile, approvalStatus] = await Promise.all([
      getStudentProfile(session.user.id, activeStudentId),
      userType === "guest"
        ? Promise.resolve(null)
        : getApprovalStatus(session.user.id),
    ]);

    const isPremiumUser = userType !== "guest" && approvalStatus === "approved";
    const candidates = getTutorProviderCandidates(isPremiumUser);

    const promptContext = `Question: ${questionPrompt}${
      studentAnswer ? `\nStudent's Answer so far: ${studentAnswer}` : ""
    }${skillSlug ? `\nSkill: ${skillSlug}` : ""}`;

    const { result, model } = await streamTextWithFallback(
      candidates,
      {
        system:
          "You are SARA, an encouraging GCSE tutor. Provide a highly concise, warm, supportive, Socratic hint for the following question. Do NOT solve the question or reveal the final answer. Give the student a clue or ask a guidance question. Keep it under 2 sentences.",
        messages: [
          {
            role: "user",
            content: promptContext,
          },
        ],
      },
      undefined,
      "hint"
    );

    const text = await result.text;
    const finalUsage = (await result.usage) as any;

    // Log AI call metrics
    await logAICall({
      studentId: studentProfile?.id ?? null,
      purpose: "hint",
      modelUsed: model,
      promptTokens: finalUsage?.promptTokens ?? 0,
      completionTokens: finalUsage?.completionTokens ?? 0,
    });

    return NextResponse.json({ hint: text });
  } catch (error) {
    console.error("[api/ai/hint] error:", error);
    return NextResponse.json(
      { error: "Failed to generate hint" },
      { status: 500 }
    );
  }
}
