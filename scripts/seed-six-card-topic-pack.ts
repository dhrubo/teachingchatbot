import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { curriculumArtifact } from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

config({ path: ".env.local" });

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("POSTGRES_URL not set");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

interface CardData {
  id: string;
  artifactType: string;
  status: string;
  version: number;
  subject: string;
  yearGroup: number;
  examBoard: string;
  topic: string;
  missionSlug: string;
  gcseDomain: string;
  sequence: number;
  role: string;
  title: string;
  front: string;
  back: string;
  studentPrompt: string;
  visualHint: string;
  difficultyBand: string;
  estimatedTimeSeconds: number;
  contentJson: Record<string, unknown>;
  tags: string[];
}

async function seed() {
  console.log("Seeding GCSE six-card topic pack concept cards...");

  const filePath = path.resolve(
    __dirname,
    "../data/gcse_mastery_six_card_topic_pack/curriculum-artifacts/concept-cards/all-six-card-concept-cards.json"
  );
  const raw = fs.readFileSync(filePath, "utf-8");
  const cards: CardData[] = JSON.parse(raw);

  console.log(`Loaded ${cards.length} concept cards from file.`);

  // Fetch existing concept_card artifact contentJson IDs for idempotency
  const existing = await db
    .select({ contentJson: curriculumArtifact.contentJson })
    .from(curriculumArtifact)
    .where(eq(curriculumArtifact.artifactType, "concept_card"));

  const existingIds = new Set(
    existing.map((r) => (r.contentJson as Record<string, unknown>)?.id as string).filter(Boolean)
  );

  let inserted = 0;
  let skipped = 0;

  for (const card of cards) {
    if (existingIds.has(card.id)) {
      skipped++;
      continue;
    }

    await db.insert(curriculumArtifact).values({
      subject: card.subject.toLowerCase(),
      yearGroup: card.yearGroup,
      examBoard: card.examBoard,
      topic: card.topic,
      artifactType: "concept_card",
      status: card.status as "approved" | "draft" | "rejected",
      version: card.version ?? 1,
      contentJson: {
        id: card.id,
        missionSlug: card.missionSlug,
        gcseDomain: card.gcseDomain,
        sequence: card.sequence,
        role: card.role,
        difficultyBand: card.difficultyBand,
        estimatedTimeSeconds: card.estimatedTimeSeconds,
        tags: card.tags,
        ...card.contentJson,
      },
    });
    inserted++;
  }

  console.log(`Inserted ${inserted} new concept cards. Skipped ${skipped} already-existing.`);
  console.log(`Total concept_card artifacts in DB: ${existing.length + inserted}`);

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
