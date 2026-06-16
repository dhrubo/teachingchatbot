import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import Papa from "papaparse";
import { drizzle } from "drizzle-orm/postgres-js";
import { count } from "drizzle-orm";
import postgres from "postgres";
import { questionArchetype } from "../lib/db/schema";

config({ path: ".env.local" });

const CSV_PATH = path.join(process.cwd(), "data/gcse_archetype_import_min15.csv");
const SUMMARY_PATH = path.join(process.cwd(), "data/gcse_archetype_import_summary.csv");

const MISSION_SLUG_ALIASES: Record<string, string> = {
  "angles-and-geometry": "angles-geometry",
  "ratio-and-proportion": "ratio-proportion",
  "powers-and-standard-form": "indices-standard-form",
  equations: "algebra-basics",
  statistics: "straight-line-graphs",
};

function canonicalMissionSlug(slug: string): string {
  return MISSION_SLUG_ALIASES[slug] ?? slug;
}

function parseBool(s: string | undefined) {
  if (!s) return false;
  return s.trim().toLowerCase() === "true";
}

function safeParseJSON(s: string | undefined) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    // attempt single-quoted to double-quoted fix
    try {
      const fixed = s.replace(/(^'|'$)/g, '"').replace(/""/g, '"');
      return JSON.parse(fixed);
    } catch (_e) {
      throw new Error(`Invalid JSON: ${s}`);
    }
  }
}

type CsvRow = {
  slug: string;
  subject?: string;
  year_group?: string;
  mission_slug: string;
  lesson_slug?: string;
  skill_slug?: string;
  gcse_domain?: string;
  difficulty_band?: string;
  question_type?: string;
  template?: string;
  variable_schema_json?: string;
  answer_expression?: string;
  acceptable_answer_rules_json?: string;
  hint_template?: string;
  explanation_template?: string;
  misconception_tags_json?: string;
  source_style?: string;
  calculator_allowed?: string;
  is_active?: string;
};

async function loadCsv(): Promise<CsvRow[]> {
  const raw = await readFile(CSV_PATH, "utf8");
  const parsed = Papa.parse<CsvRow>(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    console.error("CSV parse errors:", parsed.errors.slice(0, 5));
    throw new Error("CSV parse failed");
  }
  return parsed.data;
}

function printCounts(rows: CsvRow[]) {
  const byMission = new Map<string, number>();
  for (const r of rows) {
    const canon = canonicalMissionSlug(r.mission_slug);
    byMission.set(canon, (byMission.get(canon) ?? 0) + 1);
  }
  console.log("\nCounts by mission from CSV:");
  for (const [m, c] of [...byMission].sort()) {
    console.log(`  ${m}: ${c}`);
  }
  return byMission;
}

async function main() {
  console.log("Importing GCSE archetypes from CSV...");
  const rows = await loadCsv();
  console.log(`Parsed ${rows.length} rows from ${CSV_PATH}`);

  const byMission = printCounts(rows);

  // Validate at least 15 per mission
  const failures: string[] = [];
  for (const [m, c] of byMission) {
    if (c < 15) failures.push(`${m} (${c})`);
  }
  if (failures.length) {
    console.error("Validation failed: some missions have fewer than 15 archetypes:", failures.join(", "));
    process.exitCode = 2;
    return;
  }

  if (!process.env.POSTGRES_URL) {
    console.log("POSTGRES_URL not defined — validated only, skipping DB upsert.");
    return;
  }

  const client = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(client);

  console.log(`\nUpserting ${rows.length} archetypes by slug...`);
  for (const r of rows) {
    const row = {
      slug: r.slug,
      subject: r.subject ?? "maths",
      yearGroup: (() => {
        // prefer integer year if possible, fall back to 8 for ranges like "8-9"
        const yg = (r.year_group ?? "").trim();
        if (!yg) return 8;
        const asNum = Number(yg);
        if (!Number.isNaN(asNum)) return asNum;
        const match = yg.match(/(\d+)/);
        if (match) return Number(match[1]);
        return 8;
      })(),
      missionSlug: canonicalMissionSlug(r.mission_slug),
      lessonSlug: r.lesson_slug ?? r.mission_slug,
      skillSlug: r.skill_slug ?? r.lesson_slug ?? r.mission_slug,
      gcseDomain: r.gcse_domain ?? "",
      difficultyBand: (r.difficulty_band ?? "must") as any,
      questionType: (r.question_type ?? "short_text") as any,
      template: r.template ?? "",
      variableSchemaJson: (safeParseJSON(r.variable_schema_json) ?? {}) as never,
      answerExpression: r.answer_expression ?? "",
      acceptableAnswerRulesJson: (safeParseJSON(r.acceptable_answer_rules_json) ?? {}) as never,
      hintTemplate: r.hint_template ?? null,
      explanationTemplate: r.explanation_template ?? null,
      misconceptionTagsJson: (safeParseJSON(r.misconception_tags_json) ?? []) as never,
      sourceStyle: r.source_style ?? null,
      calculatorAllowed: parseBool(r.calculator_allowed),
      isActive: parseBool(r.is_active) ?? true,
      updatedAt: new Date(),
    };

    await db.insert(questionArchetype).values(row).onConflictDoUpdate({ target: questionArchetype.slug, set: row });
  }

  // Verify counts in DB
  const missionCounts = await db
    .select({ missionSlug: questionArchetype.missionSlug, count: count(questionArchetype.id) })
    .from(questionArchetype)
    .groupBy(questionArchetype.missionSlug);

  console.log("\nCounts by mission in DB after upsert:");
  let bad = false;
  for (const row of missionCounts) {
    const m = row.missionSlug as string;
    const c = Number((row as any).count);
    console.log(`  ${m}: ${c}`);
    if (c < 15) bad = true;
  }

  await client.end();

  if (bad) {
    console.error("Post-import validation failed: some missions have fewer than 15 archetypes in DB.");
    process.exitCode = 3;
    return;
  }

  console.log("Import complete — all missions have ≥ 15 archetypes.");
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
