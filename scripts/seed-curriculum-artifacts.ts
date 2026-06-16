import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  curriculumArtifact,
  mission,
  lesson,
  conceptCard,
  skill,
  questionArchetype,
} from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";

config({ path: ".env.local" });

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("POSTGRES_URL not set");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log("Seeding curriculum artifacts from existing data...");

  // Check if already seeded
  const existingCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curriculumArtifact);

  if (existingCount[0].count > 0) {
    console.log(
      `CurriculumArtifact already has ${existingCount[0].count} rows — skipping seed.`
    );
    await client.end();
    return;
  }

  const missions = await db.select().from(mission);
  const lessons = await db.select().from(lesson);
  const conceptCards = await db.select().from(conceptCard);
  const skills = await db.select().from(skill);
  const archetypes = await db.select().from(questionArchetype);

  const artifacts: (typeof curriculumArtifact.$inferInsert)[] = [];

  for (const m of missions) {
    artifacts.push({
      subject: m.subject,
      yearGroup: m.yearGroup,
      topic: m.title,
      artifactType: "mission",
      contentJson: m as unknown as Record<string, unknown>,
      status: "approved",
      version: 1,
    });
  }

  for (const l of lessons) {
    const parent = missions.find((m) => m.id === l.missionId);
    artifacts.push({
      subject: parent?.subject ?? "maths",
      yearGroup: parent?.yearGroup ?? 8,
      topic: l.title,
      artifactType: "lesson",
      contentJson: l as unknown as Record<string, unknown>,
      status: "approved",
      version: 1,
    });
  }

  for (const c of conceptCards) {
    const parentLesson = lessons.find((l) => l.id === c.lessonId);
    const parentMission = parentLesson
      ? missions.find((m) => m.id === parentLesson.missionId)
      : undefined;
    artifacts.push({
      subject: parentMission?.subject ?? "maths",
      yearGroup: parentMission?.yearGroup ?? 8,
      topic: c.title,
      artifactType: "concept_card",
      contentJson: c as unknown as Record<string, unknown>,
      status: "approved",
      version: 1,
    });
  }

  for (const s of skills) {
    artifacts.push({
      subject: s.subject,
      yearGroup: 8,
      topic: s.name,
      skillSlug: s.slug,
      artifactType: "skill",
      contentJson: s as unknown as Record<string, unknown>,
      status: "approved",
      version: 1,
    });
  }

  for (const a of archetypes) {
    artifacts.push({
      subject: a.subject,
      yearGroup: a.yearGroup,
      topic: a.skillSlug,
      skillSlug: a.skillSlug,
      artifactType: "question_archetype",
      contentJson: a as unknown as Record<string, unknown>,
      status: "approved",
      version: 1,
    });
  }

  if (artifacts.length > 0) {
    await db.insert(curriculumArtifact).values(artifacts);
    console.log(`Seeded ${artifacts.length} curriculum artifacts.`);
  } else {
    console.log("No data found to seed.");
  }

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
