import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { questionArchetype } from "../lib/db/schema";

config({ path: ".env.local" });

const DATA_DIR = path.join(process.cwd(), "data/question-archetypes");

type ArchetypeSeed = {
  slug: string;
  subject: string;
  yearGroup: number;
  missionSlug: string;
  lessonSlug: string;
  skillSlug: string;
  gcseDomain: string;
  difficultyBand: "must" | "should" | "could" | "gcse_bridge";
  questionType: "short_text" | "multiple_choice" | "numeric" | "algebraic";
  template: string;
  variableSchemaJson: Record<string, unknown>;
  answerExpression: string;
  acceptableAnswerRulesJson?: Record<string, unknown>;
  hintTemplate?: string;
  explanationTemplate?: string;
  misconceptionTagsJson?: string[];
  sourceStyle?: string;
  calculatorAllowed?: boolean;
};

const REQUIRED: (keyof ArchetypeSeed)[] = [
  "slug",
  "yearGroup",
  "missionSlug",
  "lessonSlug",
  "skillSlug",
  "gcseDomain",
  "difficultyBand",
  "template",
  "answerExpression",
];

function validate(item: ArchetypeSeed, file: string) {
  for (const key of REQUIRED) {
    if (item[key] === undefined || item[key] === null || item[key] === "") {
      throw new Error(
        `Archetype in ${file} missing required field "${String(key)}" (slug: ${
          item.slug ?? "?"
        })`
      );
    }
  }
}

async function loadArchetypes(): Promise<ArchetypeSeed[]> {
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
  const all: ArchetypeSeed[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(DATA_DIR, file), "utf8");
    const parsed = JSON.parse(raw) as ArchetypeSeed[];
    for (const item of parsed) {
      validate(item, file);
    }
    all.push(...parsed);
    console.log(`  - parsed ${file} (${parsed.length} archetypes)`);
  }
  return all;
}

function printCounts(archetypes: ArchetypeSeed[]) {
  const byMission = new Map<string, number>();
  const byBand = new Map<string, number>();
  const slugs = new Set<string>();
  for (const a of archetypes) {
    if (slugs.has(a.slug)) {
      throw new Error(`Duplicate archetype slug across files: ${a.slug}`);
    }
    slugs.add(a.slug);
    byMission.set(a.missionSlug, (byMission.get(a.missionSlug) ?? 0) + 1);
    byBand.set(a.difficultyBand, (byBand.get(a.difficultyBand) ?? 0) + 1);
  }
  console.log("\nBy mission/topic:");
  for (const [m, c] of [...byMission].sort()) {
    console.log(`  ${m}: ${c}`);
  }
  console.log("By difficulty band:");
  for (const band of ["must", "should", "could", "gcse_bridge"]) {
    console.log(`  ${band}: ${byBand.get(band) ?? 0}`);
  }
}

async function main() {
  console.log("Seeding question archetypes...");
  const archetypes = await loadArchetypes();
  printCounts(archetypes);

  if (!process.env.POSTGRES_URL) {
    console.log(
      "\nPOSTGRES_URL not defined — validated only, skipping DB upsert."
    );
    return;
  }

  const client = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(client);

  console.log(`\nUpserting ${archetypes.length} archetypes by slug...`);
  for (const item of archetypes) {
    const row = {
      slug: item.slug,
      subject: item.subject ?? "maths",
      yearGroup: item.yearGroup,
      missionSlug: item.missionSlug,
      lessonSlug: item.lessonSlug,
      skillSlug: item.skillSlug,
      gcseDomain: item.gcseDomain,
      difficultyBand: item.difficultyBand,
      questionType: item.questionType ?? "short_text",
      template: item.template,
      variableSchemaJson: (item.variableSchemaJson ?? {}) as never,
      answerExpression: item.answerExpression,
      acceptableAnswerRulesJson: (item.acceptableAnswerRulesJson ??
        {}) as never,
      hintTemplate: item.hintTemplate ?? null,
      explanationTemplate: item.explanationTemplate ?? null,
      misconceptionTagsJson: (item.misconceptionTagsJson ?? []) as never,
      sourceStyle: item.sourceStyle ?? null,
      calculatorAllowed: item.calculatorAllowed ?? false,
      isActive: true,
      updatedAt: new Date(),
    };
    await db
      .insert(questionArchetype)
      .values(row)
      .onConflictDoUpdate({ target: questionArchetype.slug, set: row });
  }

  await client.end();
  console.log("\nSeeding complete.\n");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
