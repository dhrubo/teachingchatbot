import { config } from "dotenv";
config({ path: ".env.local" });

const SCIENCE_TOPICS = [
  { subject: "Biology", yearGroup: 8, examBoard: "AQA" },
  { subject: "Chemistry", yearGroup: 8, examBoard: "AQA" },
  { subject: "Physics", yearGroup: 8, examBoard: "AQA" },
];

async function main() {
  console.log("Seeding science curriculum via CurriculumBuilderAgent...\n");

  const { runCurriculumBuilder } = await import(
    "../lib/ai/agents/curriculum-builder"
  );

  for (const topic of SCIENCE_TOPICS) {
    console.log(
      `\n=== ${topic.subject} Year ${topic.yearGroup} (${topic.examBoard}) ===`
    );
    const result = await runCurriculumBuilder({
      subject: topic.subject,
      yearGroup: topic.yearGroup,
      examBoard: topic.examBoard,
    });

    if (result.errors.length > 0) {
      console.error(`  Errors: ${result.errors.join(", ")}`);
    }

    if (result.artifacts > 0) {
      console.log(`  ✅ Generated ${result.artifacts} artifacts (draft)`);
    }
  }

  console.log("\nDone. Approve artifacts via the Admin panel.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
