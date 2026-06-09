import { and, asc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { type NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { conceptCard, lesson, mission } from "@/lib/db/schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

// GET /api/lessons?year=8          → list missions
// GET /api/lessons?mission=X       → list lessons for a mission
// GET /api/lessons?lesson=Y        → get lesson + concept cards + randomized questions
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const missionSlug = searchParams.get("mission");
  const lessonSlug = searchParams.get("lesson");

  try {
    // List missions for a year group
    if (yearParam) {
      const year = Number.parseInt(yearParam, 10);
      const missions = await db
        .select()
        .from(mission)
        .where(and(eq(mission.yearGroup, year), eq(mission.isActive, true)))
        .orderBy(asc(mission.order));

      return NextResponse.json({ missions });
    }

    // List lessons for a mission
    if (missionSlug) {
      const missionRow = await db
        .select()
        .from(mission)
        .where(eq(mission.slug, missionSlug))
        .limit(1);

      if (missionRow.length === 0) {
        return NextResponse.json(
          { error: "Mission not found" },
          { status: 404 }
        );
      }

      const lessons = await db
        .select()
        .from(lesson)
        .where(eq(lesson.missionId, missionRow[0].id))
        .orderBy(asc(lesson.order));

      return NextResponse.json({ mission: missionRow[0], lessons });
    }

    // Get full lesson content + randomized questions
    if (lessonSlug) {
      const lessonRow = await db
        .select()
        .from(lesson)
        .where(eq(lesson.slug, lessonSlug))
        .limit(1);

      if (lessonRow.length === 0) {
        return NextResponse.json(
          { error: "Lesson not found" },
          { status: 404 }
        );
      }

      const conceptCards = await db
        .select()
        .from(conceptCard)
        .where(eq(conceptCard.lessonId, lessonRow[0].id))
        .orderBy(asc(conceptCard.order));

      return NextResponse.json({
        lesson: lessonRow[0],
        conceptCards,
        questions: [], // Return empty array, questions now come from adaptive engine
      });
    }

    // All concept cards for a mission (across its lessons), in order. Used by
    // the mission orchestrator to run the cards → gate → challenge flow.
    const missionCardsSlug = searchParams.get("missionCards");
    if (missionCardsSlug) {
      const missionRow = await db
        .select()
        .from(mission)
        .where(eq(mission.slug, missionCardsSlug))
        .limit(1);

      if (missionRow.length === 0) {
        return NextResponse.json({ cards: [] });
      }

      const lessons = await db
        .select()
        .from(lesson)
        .where(eq(lesson.missionId, missionRow[0].id))
        .orderBy(asc(lesson.order));

      const lessonIds = lessons.map((l) => l.id);
      const cards = lessonIds.length
        ? await db
            .select()
            .from(conceptCard)
            .where(inArray(conceptCard.lessonId, lessonIds))
            .orderBy(asc(conceptCard.lessonId), asc(conceptCard.order))
        : [];

      // Map DB rows → the UI ConceptCard shape (visual/example/explanation).
      const uiCards = cards.map((c) => ({
        id: `cc-${c.id}`,
        title: c.title,
        visual: c.visual ?? "",
        example: c.example ?? "",
        explanation: c.body,
      }));

      return NextResponse.json({ cards: uiCards });
    }

    return NextResponse.json(
      { error: "Specify ?year=8 or ?mission=X or ?lesson=Y or ?missionCards=X" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[api/lessons] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
