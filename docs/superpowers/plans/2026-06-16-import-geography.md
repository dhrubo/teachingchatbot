# GCSE Geography Year 8 Curriculum Import Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Autonomously write and execute `/scripts/import-geography.ts` to seed the database with Year 8 Geography missions, lessons, concept cards, and question archetypes.

**Architecture:** A standalone TypeScript script loaded via `tsx` that leverages `drizzle-orm` and `postgres` to parse, group, and idempotently upsert geography content into our unified database schema.

**Tech Stack:** TypeScript, Drizzle ORM, postgres (driver), Node.js `fs/promises`.

---

### Task 1: Create the Importer Script

**Files:**
- Create: `/Users/dhrubo.paul/Sites/teachingchatbot/scripts/import-geography.ts`

- [ ] **Step 1: Write the complete, robust geography database importer script.**

We'll write the script with a built-in slugify helper, difficulty mapping function, Drizzle connection, and sequential batch upserting for Mission, Lesson, ConceptCard, and QuestionArchetype.

```typescript
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { mission, lesson, conceptCard, questionArchetype } from "../lib/db/schema";

config({ path: ".env.local" });

const GEOGRAPHY_DIR = "/Users/dhrubo.paul/Sites/teachingchatbot/data/gcse_mastery_geography_year8_artifact/geography/";

const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const mapDifficulty = (diff: number | undefined): "must" | "should" | "could" | "gcse_bridge" => {
  if (diff === 1) return "must";
  if (diff === 2) return "should";
  if (diff === 3) return "could";
  if (diff === 4) return "gcse_bridge";
  return "should";
};

interface QuestionItem {
  id: string;
  subject: string;
  yearGroups: number[];
  keyStage: string;
  topic: string;
  subtopic: string;
  skill: string;
  difficulty: number;
  questionType: string;
  question: string;
  options: string[];
  correctAnswer: string;
  marks: number;
  misconception?: string;
  hint?: string;
  explanation?: string;
  tags?: string[];
  estimatedTimeSeconds?: number;
  xp?: number;
}

async function main() {
  console.log("Starting GCSE Geography import...");

  if (!existsSync(GEOGRAPHY_DIR)) {
    console.error(`Geography source directory does not exist: ${GEOGRAPHY_DIR}`);
    process.exit(1);
  }

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("POSTGRES_URL environment variable is not defined!");
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  const files = (await readdir(GEOGRAPHY_DIR)).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log(`No JSON files found in: ${GEOGRAPHY_DIR}`);
    await client.end();
    return;
  }

  console.log(`Processing ${files.length} geography files...`);

  let missionCount = 0;
  let lessonCount = 0;
  let cardsCount = 0;
  let archetypeCount = 0;

  // Display orders start at 300 to sit cleanly next to other subjects
  let overallMissionOrder = 300;

  for (const file of files) {
    const filePath = path.join(GEOGRAPHY_DIR, file);
    const rawData = await readFile(filePath, "utf-8");
    const questions = JSON.parse(rawData) as QuestionItem[];

    console.log(`\nFile ${file}: parsing ${questions.length} questions...`);

    // Group questions by topic to create missions
    const questionsByTopic = new Map<string, QuestionItem[]>();
    for (const q of questions) {
      const topic = q.topic || "General Geography";
      if (!questionsByTopic.has(topic)) {
        questionsByTopic.set(topic, []);
      }
      questionsByTopic.get(topic)!.push(q);
    }

    for (const [topic, topicQuestions] of questionsByTopic) {
      const missionSlug = slugify(topic);
      console.log(`  Mission: [${topic}] (slug: ${missionSlug})`);

      // Upsert Mission
      const [insertedMission] = await db
        .insert(mission)
        .values({
          slug: missionSlug,
          title: topic,
          description: `Learn about ${topic} in Year 8 Geography.`,
          yearGroup: 8,
          subject: "geography",
          gcseDomain: "geography",
          order: overallMissionOrder++,
          estimatedMinutes: 45,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: mission.slug,
          set: {
            title: topic,
            description: `Learn about ${topic} in Year 8 Geography.`,
            yearGroup: 8,
            subject: "geography",
            gcseDomain: "geography",
          },
        })
        .returning();

      missionCount++;

      // Group questions within this mission by subtopic to create lessons
      const questionsBySubtopic = new Map<string, QuestionItem[]>();
      for (const q of topicQuestions) {
        const subtopic = q.subtopic || topic;
        if (!questionsBySubtopic.has(subtopic)) {
          questionsBySubtopic.set(subtopic, []);
        }
        questionsBySubtopic.get(subtopic)!.push(q);
      }

      let lessonOrder = 1;
      for (const [subtopic, subtopicQuestions] of questionsBySubtopic) {
        const lessonSlug = `${missionSlug}-${slugify(subtopic)}`;
        console.log(`    Lesson: [${subtopic}] (slug: ${lessonSlug})`);

        // Upsert Lesson
        const [insertedLesson] = await db
          .insert(lesson)
          .values({
            missionId: insertedMission.id,
            slug: lessonSlug,
            title: subtopic,
            summary: `Master the key concepts of ${subtopic}.`,
            order: lessonOrder++ * 10,
            difficultyBand: "core",
            estimatedMinutes: 15,
          })
          .onConflictDoUpdate({
            target: lesson.slug,
            set: {
              missionId: insertedMission.id,
              title: subtopic,
              summary: `Master the key concepts of ${subtopic}.`,
            },
          })
          .returning();

        lessonCount++;

        // Idempotently delete existing concept cards for this lesson and seed exactly 3
        await db.delete(conceptCard).where(eq(conceptCard.lessonId, insertedLesson.id));
        const cardContents = [
          {
            title: `Introduction to ${subtopic}`,
            body: `Understanding the core concepts and fundamental definitions of ${subtopic} in Geography. This forms the baseline for analyzing geographical features and patterns.`,
            example: `A classic example of ${subtopic} demonstrates how human and physical systems interact within this environment.`,
          },
          {
            title: `Geographical Analysis of ${subtopic}`,
            body: `An in-depth look at the processes, models, and spatial distribution related to ${subtopic}. We examine the causes, physical/human effects, and management strategies used by geographers.`,
            example: `Analyzing real-world map data and field observations allows us to see the direct impacts of ${subtopic} over time.`,
          },
          {
            title: `GCSE Worked Example & Case Study`,
            body: `Applying our knowledge of ${subtopic} to exam-style questions. We focus on physical/human geographical evidence, key terminology, and structuring clear, geographical explanations.`,
            example: `In a standard case study of ${subtopic}, we identify the specific location, physical processes, human impact, and evaluate management effectiveness.`,
          }
        ];

        for (let i = 0; i < cardContents.length; i++) {
          await db.insert(conceptCard).values({
            lessonId: insertedLesson.id,
            order: i + 1,
            title: cardContents[i].title,
            body: cardContents[i].body,
            example: cardContents[i].example,
            visual: "Visual representation of geographical patterns and landscapes.",
            misconception: "Commonly confused with other related geographical processes or landforms.",
          });
          cardsCount++;
        }

        // Insert/Upsert QuestionArchetypes
        for (const item of subtopicQuestions) {
          const skillSlug = `geography_${missionSlug}_${slugify(item.skill || item.subtopic || "general")}`;

          const archRow = {
            slug: item.id,
            subject: "geography",
            yearGroup: 8,
            missionSlug: missionSlug,
            lessonSlug: lessonSlug,
            skillSlug: skillSlug,
            gcseDomain: "geography",
            difficultyBand: mapDifficulty(item.difficulty),
            questionType: (item.questionType === "multiple_choice" ? "multiple_choice" : "short_text") as "multiple_choice" | "short_text",
            template: item.question,
            variableSchemaJson: {},
            answerExpression: `\`${item.correctAnswer.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\``,
            acceptableAnswerRulesJson: item.questionType === "multiple_choice"
              ? { caseInsensitive: true, options: item.options }
              : { caseInsensitive: true },
            hintTemplate: item.hint || `Think about the key processes involved in ${subtopic}.`,
            explanationTemplate: item.explanation || `The correct answer is: ${item.correctAnswer}.`,
            misconceptionTagsJson: item.misconception ? [item.misconception] : [],
            sourceStyle: "imported geography KS3 artifact",
            calculatorAllowed: false,
            isActive: true,
            updatedAt: new Date(),
          };

          await db
            .insert(questionArchetype)
            .values(archRow)
            .onConflictDoUpdate({
              target: questionArchetype.slug,
              set: {
                missionSlug: archRow.missionSlug,
                lessonSlug: archRow.lessonSlug,
                skillSlug: archRow.skillSlug,
                gcseDomain: archRow.gcseDomain,
                difficultyBand: archRow.difficultyBand,
                questionType: archRow.questionType,
                template: archRow.template,
                answerExpression: archRow.answerExpression,
                acceptableAnswerRulesJson: archRow.acceptableAnswerRulesJson,
                hintTemplate: archRow.hintTemplate,
                explanationTemplate: archRow.explanationTemplate,
                misconceptionTagsJson: archRow.misconceptionTagsJson,
                isActive: archRow.isActive,
                updatedAt: new Date(),
              },
            });

          archetypeCount++;
        }
      }
    }
  }

  await client.end();
  console.log("\nGeography Import Complete!");
  console.log(`Missions upserted: ${missionCount}`);
  console.log(`Lessons upserted: ${lessonCount}`);
  console.log(`Concept Cards seeded: ${cardsCount}`);
  console.log(`Question Archetypes upserted: ${archetypeCount}`);
}

main().catch((err) => {
  console.error("Geography import script failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Save and review the script for type cleanliness.**

Ensure the script compiles locally and respects Drizzle ORM schemas.

---

### Task 2: Execute the Importer Script

**Files:**
- Modify: Database rows (No local file changes)

- [ ] **Step 1: Run the newly created import script.**

Run: `npx tsx scripts/import-geography.ts`
Expected Output: Output matches:
```
Geography Import Complete!
Missions upserted: [6]
Lessons upserted: [Number]
Concept Cards seeded: [Number]
Question Archetypes upserted: [60+]
```

---

### Task 3: Verify Compilation and Run Unit Tests

**Files:**
- Modify: None (pure verification)

- [ ] **Step 1: Verify compilation cleanly.**

Run: `npx tsc --noEmit`
Expected Output: Exits with 0 errors.

- [ ] **Step 2: Run all unit tests to ensure no regressions.**

Run: `pnpm test:unit`
Expected Output: 108/108 tests passing.
