import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { auth } from "@/app/(auth)/auth";
import { getStudentProfile } from "@/lib/db/queries/student";
import { upsertWeakness } from "@/lib/db/queries/learning-science";
import { getTutorProviderCandidates, isQuotaError } from "@/lib/ai/providers";
import { buildTutorPrompt, TUTOR_PROMPT_VERSION } from "@/lib/ai/prompts-tutor";
import {
  buildRepairPrompt,
  validateTutorResponse,
  type ViolationCode,
} from "@/lib/ai/tutor-validator";
import { recordAiCall } from "@/lib/ai/ai-call-log";
import { notifyHighRiskMessage } from "@/lib/privacy/escalation";
import { getApprovalStatus } from "@/lib/db/queries/admin";
import { cookies } from "next/headers";
import { logAICall } from "@/lib/db/queries/analytics";
import { checkQuota, invalidateQuotaCache } from "@/lib/ai/quota-monitor";

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

type ExplainObject = z.infer<typeof explainSchema>;

const FALLBACK_FEEDBACK =
  "Let's look at the steps together — check each one carefully against the method we practised.";

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

    // Quota check — degrade to deterministic tag when quota is tight
    const quota = await checkQuota("explanation");
    if (!quota.allowed) {
      return NextResponse.json({
        misconception: "Error pattern detected",
        feedback:
          "Focus on the method — double-check each step carefully.",
        confidence: 0,
      });
    }

    const effectiveCandidates = quota.preferLite
      ? getTutorProviderCandidates(false)
      : candidates;

    const promptContext = `Question: ${questionPrompt}
Student's Wrong Answer: ${studentAnswer}
Correct Answer: ${correctAnswer}
Worked Solution: ${explanation ?? "None available"}`;

    let lastModel = "unknown";
    let lastProvider = "unknown";
    const startedAt = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;

    const generateAttempt = async (
      systemPrompt: string
    ): Promise<ExplainObject | null> => {
      for (const candidate of effectiveCandidates) {
        try {
          const result = await generateObject({
            model: candidate.model,
            schema: explainSchema,
            system: systemPrompt,
            prompt: promptContext,
          });
          lastModel = candidate.modelName;
          lastProvider = candidate.id;
          const usage = result.usage as {
            inputTokens?: number;
            outputTokens?: number;
          };
          promptTokens += usage?.inputTokens ?? 0;
          completionTokens += usage?.outputTokens ?? 0;
          return result.object;
        } catch (error) {
          if (isQuotaError(error)) {
            continue;
          }
          throw error;
        }
      }
      return null;
    };

    const basePrompt = buildTutorPrompt("mistake_explanation", {
      finalAnswer: correctAnswer,
      currentTopic: skillSlug ?? null,
    });

    const draft = await generateAttempt(basePrompt);
    if (!draft) {
      return NextResponse.json(
        { error: "All AI models exhausted" },
        { status: 500 }
      );
    }

    let final = draft;
    let repairStatus: "none" | "repaired" | "fallback" = "none";
    let remainingViolations: ViolationCode[] = [];

    const draftCheck = validateTutorResponse(draft.feedback, {
      mode: "mistake_explanation",
      finalAnswer: correctAnswer,
    });
    if (!draftCheck.valid) {
      // Exactly one repair attempt — never recursive.
      const repaired = await generateAttempt(
        buildRepairPrompt(basePrompt, draftCheck.violations)
      );
      const repairedCheck = repaired
        ? validateTutorResponse(repaired.feedback, {
            mode: "mistake_explanation",
            finalAnswer: correctAnswer,
          })
        : { valid: false as const, violations: draftCheck.violations };

      if (repaired && repairedCheck.valid) {
        final = repaired;
        repairStatus = "repaired";
      } else {
        // Keep the draft's misconception/confidence, but the feedback text
        // itself falls back to a fixed, safe string.
        final = { ...draft, feedback: FALLBACK_FEEDBACK };
        repairStatus = "fallback";
        remainingViolations = repairedCheck.valid
          ? []
          : repairedCheck.violations;
      }
    }

    const { misconception, feedback, confidence } = final;

    recordAiCall(lastProvider, lastModel, "explanation", `explain-${Date.now()}`, {
      promptVersion: TUTOR_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      repairStatus,
      violations: remainingViolations,
    });
    if (repairStatus === "fallback") {
      notifyHighRiskMessage({
        studentId: studentProfile?.id,
        mode: "mistake_explanation",
        violations: remainingViolations,
      }).catch(() => {
        /* best-effort — never block or fail the response */
      });
    }

    // Log AI call
    await logAICall({
      studentId: studentProfile?.id ?? null,
      purpose: "explanation",
      modelUsed: lastModel,
      promptTokens,
      completionTokens,
    });
    invalidateQuotaCache();

    // Record as TENTATIVE evidence, not a confirmed weakness — a single LLM
    // label is one data point, not a diagnosis. It's promoted to "confirmed"
    // by lib/learning-science/batch-misconception-analysis.ts only after
    // repeated, independent evidence accumulates (see misconception-status.ts).
    if (studentProfile && skillSlug) {
      await upsertWeakness({
        studentId: studentProfile.id,
        subject: "maths",
        skillSlug,
        misconception,
        confidence: Math.round(Math.min(1, Math.max(0, confidence)) * 5) || 1,
        evidence: { source: "explain_error_llm" },
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
