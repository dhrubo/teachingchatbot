import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getStudentProfile } from "@/lib/db/queries/student";
import { getTutorProviderCandidates } from "@/lib/ai/providers";
import { buildTutorPrompt, TUTOR_PROMPT_VERSION } from "@/lib/ai/prompts-tutor";
import { runTutorTurn } from "@/lib/ai/tutor-validator";
import { recordAiCall } from "@/lib/ai/ai-call-log";
import { notifyHighRiskMessage } from "@/lib/privacy/escalation";
import { getApprovalStatus } from "@/lib/db/queries/admin";
import { cookies } from "next/headers";
import { streamTextWithFallback } from "@/lib/ai/stream-with-provider-fallback";
import { logAICall } from "@/lib/db/queries/analytics";
import { checkQuota, invalidateQuotaCache } from "@/lib/ai/quota-monitor";

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

    // Quota check — degrade gracefully when near limit
    const quota = await checkQuota("hint");
    if (!quota.allowed) {
      return NextResponse.json({
        hint: "Think about what the question is really asking. Break it into smaller steps and see what you know for sure.",
      });
    }

    const effectiveCandidates = quota.preferLite
      ? getTutorProviderCandidates(false)
      : candidates;

    const promptContext = `Question: ${questionPrompt}${
      studentAnswer ? `\nStudent's Answer so far: ${studentAnswer}` : ""
    }`;

    const startedAt = Date.now();
    let lastModel = "unknown";
    let lastProvider = "unknown";
    let lastRequestId = "unknown";
    let promptTokens = 0;
    let completionTokens = 0;

    const generate = async (systemPrompt: string): Promise<string> => {
      const { result, model, provider, requestId } = await streamTextWithFallback(
        effectiveCandidates,
        {
          system: systemPrompt,
          messages: [{ role: "user", content: promptContext }],
        },
        undefined,
        "hint",
        undefined,
        TUTOR_PROMPT_VERSION
      );
      lastModel = model;
      lastProvider = provider;
      lastRequestId = requestId;
      const text = await result.text;
      const usage = (await result.usage) as { inputTokens?: number; outputTokens?: number };
      promptTokens += usage?.inputTokens ?? 0;
      completionTokens += usage?.outputTokens ?? 0;
      return text;
    };

    // Deliberately no finalAnswer in context — hint mode must never receive
    // the answer, so there's nothing for the model to leak even if it tried.
    const turn = await runTutorTurn({
      mode: "hint",
      basePrompt: buildTutorPrompt("hint", { currentTopic: skillSlug ?? null }),
      validation: { mode: "hint", finalAnswer: null },
      generate,
    });

    recordAiCall(lastProvider, lastModel, "hint", lastRequestId, {
      promptVersion: TUTOR_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      repairStatus: turn.repairStatus,
      violations: turn.violations,
    });
    if (turn.repairStatus === "fallback") {
      notifyHighRiskMessage({
        studentId: studentProfile?.id,
        mode: "hint",
        violations: turn.violations,
      }).catch(() => {
        /* best-effort — never block or fail the response */
      });
    }

    // Log AI call metrics
    await logAICall({
      studentId: studentProfile?.id ?? null,
      purpose: "hint",
      modelUsed: lastModel,
      promptTokens,
      completionTokens,
    });
    invalidateQuotaCache();

    return NextResponse.json({ hint: turn.text });
  } catch (error) {
    console.error("[api/ai/hint] error:", error);
    return NextResponse.json(
      { error: "Failed to generate hint" },
      { status: 500 }
    );
  }
}
