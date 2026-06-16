import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { checkAdminRateLimit } from "@/lib/ratelimit";
import { getRegularUsers, setUserApprovalStatus } from "@/lib/db/queries/admin";
import {
  getActiveMissionCount,
  getAllTopicRequests,
} from "@/lib/db/queries/topic-requests";
import { db } from "@/lib/db/client";
import { mission, lesson, conceptCard, questionArchetype } from "@/lib/db/schema";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "admin") {
    return null;
  }
  return session;
}

// Admin-only: curriculum overview, topic requests, signed-up users, and full collections.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [
    topicRequests,
    allMissions,
    missionCount,
    users,
    lessons,
    conceptCards,
    questionArchetypes,
  ] = await Promise.all([
    getAllTopicRequests(),
    db.select().from(mission),
    getActiveMissionCount(),
    getRegularUsers(),
    db.select().from(lesson),
    db.select().from(conceptCard),
    db.select().from(questionArchetype),
  ]);

  const sortedMissions = allMissions.sort((a, b) =>
    a.yearGroup === b.yearGroup
      ? a.title.localeCompare(b.title)
      : a.yearGroup - b.yearGroup
  );

  return NextResponse.json({
    topicRequests,
    missions: sortedMissions,
    missionCount,
    users,
    lessons,
    conceptCards,
    questionArchetypes,
  });
}

// Admin-only: approve / reject / reset a user's premium access, or create curriculum content.
export async function POST(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    await checkAdminRateLimit(adminSession.user.id);
  } catch {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const action = body.action || "set-user-status";

  try {
    if (action === "set-user-status") {
      const { userId, status } = body as {
        userId?: string;
        status?: string;
      };
      if (
        !userId ||
        !(status === "approved" || status === "rejected" || status === "pending")
      ) {
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
      }

      await setUserApprovalStatus(userId, status as "approved" | "rejected" | "pending");
      return NextResponse.json({ ok: true });
    }

    if (action === "create-mission") {
      const {
        slug,
        title,
        description,
        yearGroup,
        subject,
        gcseDomain,
        order,
        estimatedMinutes,
      } = body;

      if (!slug || !title || !description || yearGroup === undefined || !gcseDomain || order === undefined || estimatedMinutes === undefined) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      }

      await db.insert(mission).values({
        slug: String(slug).trim(),
        title: String(title).trim(),
        description: String(description).trim(),
        yearGroup: Number(yearGroup),
        subject: subject ? String(subject).trim() : "maths",
        gcseDomain: String(gcseDomain).trim(),
        order: Number(order),
        estimatedMinutes: Number(estimatedMinutes),
        isActive: true,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "create-lesson") {
      const {
        missionId,
        slug,
        title,
        summary,
        order,
        difficultyBand,
        estimatedMinutes,
      } = body;

      if (missionId === undefined || !slug || !title || !summary || order === undefined || !difficultyBand || estimatedMinutes === undefined) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      }

      await db.insert(lesson).values({
        missionId: Number(missionId),
        slug: String(slug).trim(),
        title: String(title).trim(),
        summary: String(summary).trim(),
        order: Number(order),
        difficultyBand: difficultyBand as "foundation" | "core" | "stretch" | "gcse_bridge",
        estimatedMinutes: Number(estimatedMinutes),
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "create-card") {
      const {
        lessonId,
        order,
        title,
        body: cardBody,
        visual,
        example,
        misconception,
      } = body;

      if (lessonId === undefined || order === undefined || !title || !cardBody) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      }

      await db.insert(conceptCard).values({
        lessonId: Number(lessonId),
        order: Number(order),
        title: String(title).trim(),
        body: String(cardBody).trim(),
        visual: visual ? String(visual).trim() : null,
        example: example ? String(example).trim() : null,
        misconception: misconception ? String(misconception).trim() : null,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "create-archetype") {
      const {
        slug,
        subject,
        yearGroup,
        missionSlug,
        lessonSlug,
        skillSlug,
        gcseDomain,
        difficultyBand,
        questionType,
        template,
        variableSchemaJson,
        answerExpression,
        acceptableAnswerRulesJson,
        hintTemplate,
        explanationTemplate,
        misconceptionTagsJson,
        calculatorAllowed,
      } = body;

      if (
        !slug ||
        yearGroup === undefined ||
        !missionSlug ||
        !lessonSlug ||
        !skillSlug ||
        !gcseDomain ||
        !difficultyBand ||
        !questionType ||
        !template ||
        !answerExpression
      ) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      }

      const parsedVariables = typeof variableSchemaJson === "string"
        ? JSON.parse(variableSchemaJson)
        : (variableSchemaJson || {});

      const parsedRules = typeof acceptableAnswerRulesJson === "string"
        ? JSON.parse(acceptableAnswerRulesJson)
        : (acceptableAnswerRulesJson || {});

      const parsedTags = typeof misconceptionTagsJson === "string"
        ? JSON.parse(misconceptionTagsJson)
        : (misconceptionTagsJson || []);

      await db.insert(questionArchetype).values({
        slug: String(slug).trim(),
        subject: subject ? String(subject).trim() : "maths",
        yearGroup: Number(yearGroup),
        missionSlug: String(missionSlug).trim(),
        lessonSlug: String(lessonSlug).trim(),
        skillSlug: String(skillSlug).trim(),
        gcseDomain: String(gcseDomain).trim(),
        difficultyBand: difficultyBand as "must" | "should" | "could" | "gcse_bridge",
        questionType: questionType as "short_text" | "multiple_choice" | "numeric" | "algebraic",
        template: String(template).trim(),
        variableSchemaJson: parsedVariables,
        answerExpression: String(answerExpression).trim(),
        acceptableAnswerRulesJson: parsedRules,
        hintTemplate: hintTemplate ? String(hintTemplate).trim() : null,
        explanationTemplate: explanationTemplate ? String(explanationTemplate).trim() : null,
        misconceptionTagsJson: parsedTags,
        calculatorAllowed: Boolean(calculatorAllowed),
        isActive: true,
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (err: any) {
    console.error("Admin action failed:", err);
    return NextResponse.json({ error: "server_error", details: err?.message }, { status: 500 });
  }
}
