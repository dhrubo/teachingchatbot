import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { auth } from "@/app/(auth)/auth";
import {
  getStudentProfile,
  recordStudentMisconception,
} from "@/lib/db/queries/student";
import { getTutorProviderCandidates, isQuotaError } from "@/lib/ai/providers";
import { getApprovalStatus } from "@/lib/db/queries/admin";
import { cookies } from "next/headers";
import { logAICall } from "@/lib/db/queries/analytics";

const explainSchema = z.object({
  misconception: z
    .string()
    .describe(
      "a very short label describing the error pattern (e.g., 'Sign Error', 'Inverse Op Mistake', 'Arithmetic Slip')"
    ),
  feedback: z
    .string()
    .describe(
      "a warm, kid-friendly, encouraging Socratic correction targeting this error (max 2 sentences)"
    ),
  confidence: z
    .number()
    .describe("a float between 0 and 1 representing model confidence"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      questionPrompt,
      studentAnswer,
      correctAnswer,
      explanation,
      skillSlug,
    } = body as {
      questionPrompt?: string;
      studentAnswer?: string;
      correctAnswer?: string;
      explanation?: string;
      skillSlug?: string;
    };

    if (!questionPrompt || !studentAnswer || !correctAnswer) {
      return NextResponse.json(
        {
          error:
            "questionPrompt, studentAnswer and correctAnswer are required",
        },
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

    const promptContext = `Question: ${questionPrompt}
Student's Wrong Answer: ${studentAnswer}
Correct Answer: ${correctAnswer}
Worked Solution: ${explanation ?? "None available"}`;

    let objectResult = null;
    let modelUsed = "";

    for (const candidate of candidates) {
      try {
        const result = await generateObject({
          model: candidate.model,
          schema: explainSchema,
          system:
            "Analyze the student's wrong answer against the correct answer and worked solution. Identify the exact misconception or error they made. Be highly Socratic and encouraging in feedback.",
          prompt: promptContext,
        });
        objectResult = result;
        modelUsed = candidate.modelName;
        break;
      } catch (error) {
        if (isQuotaError(error)) {
          continue;
        }
        throw error;
      }
    }

    if (!objectResult) {
      return NextResponse.json(
        { error: "All AI models exhausted" },
        { status: 500 }
      );
    }

    const { misconception, feedback, confidence } = objectResult.object;
    const finalUsage = objectResult.usage as any;

    // Log AI call
    await logAICall({
      studentId: studentProfile?.id ?? null,
      purpose: "explanation",
      modelUsed: modelUsed,
      promptTokens: finalUsage?.promptTokens ?? 0,
      completionTokens: finalUsage?.completionTokens ?? 0,
    });

    // Persist misconception if profile is valid and skillSlug exists
    if (studentProfile && skillSlug) {
      await recordStudentMisconception({
        studentId: studentProfile.id,
        skillSlug,
        misconception,
      });
    }

    return NextResponse.json({ misconception, feedback, confidence });
  } catch (error) {
    console.error("[api/ai/explain-error] error:", error);
    return NextResponse.json(
      { error: "Failed to explain error" },
      { status: 500 }
    );
  }
}
