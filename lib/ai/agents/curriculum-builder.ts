import { z } from "zod";
import { generateObject } from "ai";
import { getTutorProviderCandidates, isQuotaError } from "@/lib/ai/providers";

const topicSchema = z.object({
  name: z.string().describe("Topic name e.g. 'Percentages' or 'Coasts'"),
  description: z.string().describe("Brief description of what this topic covers"),
  order: z.number().describe("Display order (1-based)"),
  estimatedMinutes: z.number().describe("Estimated learning time in minutes"),
  gcseDomain: z
    .string()
    .describe(
      "GCSE exam domain e.g. 'ratio_proportion_rates_of_change', 'number', 'algebra', 'geography_coasts'"
    ),
});

const skillSchema = z.object({
  slug: z
    .string()
    .describe(
      "Unique skill identifier e.g. 'percentage_of_amount', 'coastal_erosion_types'"
    ),
  name: z.string().describe("Human-readable skill name"),
  topicName: z.string().describe("Name of the parent topic from the topics list"),
});

const conceptCardSchema = z.object({
  topicName: z
    .string()
    .describe("Name of the parent topic from the topics list"),
  title: z.string().describe("Card title e.g. 'What is a percentage?'"),
  body: z
    .string()
    .describe("Teaching content — 2–4 clear sentences written for a 12–14 year old"),
  visual: z
    .string()
    .optional()
    .describe(
      "Optional text-based diagram, emoji visual, or worked example in plain text"
    ),
  example: z.string().optional().describe("Optional worked example showing the concept in action"),
  misconception: z
    .string()
    .optional()
    .describe("Common misconception or mistake students make with this concept"),
});

const archetypeSchema = z.object({
  topicName: z.string().describe("Name of the parent topic from the topics list"),
  skillSlug: z.string().describe("Slug of the related skill"),
  questionType: z
    .enum(["multiple_choice", "numeric", "short_text"])
    .describe("Question type"),
  template: z
    .string()
    .describe(
      "Question prompt template. Use {var} for variables e.g. 'What is {a}% of {b}?'"
    ),
  difficultyBand: z
    .enum(["must", "should", "could", "gcse_bridge"])
    .describe("Difficulty band"),
  correctAnswer: z
    .string()
    .describe("The correct answer (or expression to compute it)"),
  misconceptionTag: z.string().describe("Tag identifying the likely misconception"),
});

const misconceptionSchema = z.object({
  skillSlug: z.string().describe("Slug of the related skill"),
  misconception: z
    .string()
    .describe(
      "Description of the common misconception e.g. 'Students forget to divide by 100 when calculating percentages'"
    ),
});

const curriculumOutputSchema = z.object({
  topics: z
    .array(topicSchema)
    .describe("List of main topics for this subject and year"),
  skills: z
    .array(skillSchema)
    .describe("Trackable skills mapped to topics"),
  conceptCards: z
    .array(conceptCardSchema)
    .describe("Teaching-point concept cards"),
  questionArchetypes: z
    .array(archetypeSchema)
    .describe("Question templates for quizzes"),
  misconceptions: z
    .array(misconceptionSchema)
    .describe("Common student misconceptions per skill"),
});

export type CurriculumOutput = z.infer<typeof curriculumOutputSchema>;

const SYSTEM_PROMPT = `You are an expert UK GCSE curriculum designer. Given a subject, year group, and exam board, you generate a complete curriculum outline.

Your output must be:
- Age-appropriate for the specified year group (Year 8 = 12-13, Year 9 = 13-14)
- Aligned to the UK GCSE specification for the given exam board
- Specific and detailed enough for a teacher to build lessons from

For each topic, provide 2-4 skills, 2-4 concept cards, 1-2 simple question archetypes, and 1-2 common misconceptions.

IMPORTANT rules for question archetypes:
- Keep templates simple with 1-2 variables (use {var} notation)
- For multiple_choice questions, append the choices in brackets after the template
  e.g. "What is the answer? [A) 10, B) 20, C) 30, D) 40]"
- Make sure the correct answer is one of the listed choices for multiple_choice
- Use difficulty bands appropriately: "must" = basic recall, "should" = application, "could" = reasoning, "gcse_bridge" = multi-step`;

// Inline DB helpers to avoid server-only module issues
async function insertArtifact(data: {
  subject: string;
  yearGroup: number;
  examBoard: string;
  topic: string;
  artifactType: string;
  contentJson: Record<string, unknown>;
  status: string;
  version: number;
  generatedBy: string | null;
  skillSlug?: string | null;
}) {
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.POSTGRES_URL!);
  try {
    await sql`
      INSERT INTO "CurriculumArtifact" (
        "subject", "yearGroup", "examBoard", "topic", "subtopic",
        "skillSlug", "artifactType", "contentJson", "status",
        "version", "generatedBy", "createdAt", "updatedAt"
      ) VALUES (
        ${data.subject}, ${data.yearGroup}, ${data.examBoard},
        ${data.topic}, ${null},
        ${data.skillSlug ?? null}, ${data.artifactType},
        ${JSON.stringify(data.contentJson)}::json,
        ${data.status}, ${data.version},
        ${data.generatedBy}, now(), now()
      )
    `;
  } finally {
    await sql.end();
  }
}

export async function runCurriculumBuilder(params: {
  subject: string;
  yearGroup: number;
  examBoard: string;
  generatedBy?: string;
}): Promise<{ artifacts: number; errors: string[] }> {
  const { subject, yearGroup, examBoard, generatedBy } = params;
  const errors: string[] = [];
  let artifactsCreated = 0;

  const candidates = getTutorProviderCandidates(true);

  let result: CurriculumOutput | null = null;
  let modelUsed = "";

  for (const candidate of candidates) {
    try {
      const res = await generateObject({
        model: candidate.model,
        schema: curriculumOutputSchema,
        system: SYSTEM_PROMPT,
        prompt: `Generate a complete ${subject} curriculum for Year ${yearGroup}, exam board: ${examBoard}.

Include:
- 3-6 main topics
- 2-4 skills per topic
- 2-4 concept cards per topic
- 1-2 simple question archetypes per skill
- 1-2 common misconceptions per skill

Make the content specific to ${subject} at Year ${yearGroup} level.`,
      });
      result = res.object;
      modelUsed = candidate.modelName;
      break;
    } catch (error) {
      if (isQuotaError(error)) {
        continue;
      }
      errors.push(`LLM call failed: ${(error as Error).message}`);
      return { artifacts: 0, errors };
    }
  }

  if (!result) {
    errors.push("All AI models exhausted");
    return { artifacts: 0, errors };
  }

  // Save topics as artifacts
  for (const topic of result.topics) {
    try {
      await insertArtifact({
        subject,
        yearGroup,
        examBoard,
        topic: topic.name,
        artifactType: "topic_map",
        contentJson: topic as unknown as Record<string, unknown>,
        status: "draft",
        version: 1,
        generatedBy: generatedBy ?? null,
      });
      artifactsCreated++;
    } catch (e) {
      errors.push(`Failed to save topic '${topic.name}': ${(e as Error).message}`);
    }
  }

  // Save skills as artifacts
  for (const skillItem of result.skills) {
    try {
      await insertArtifact({
        subject,
        yearGroup,
        examBoard,
        topic: skillItem.topicName,
        skillSlug: skillItem.slug,
        artifactType: "skill",
        contentJson: skillItem as unknown as Record<string, unknown>,
        status: "draft",
        version: 1,
        generatedBy: generatedBy ?? null,
      });
      artifactsCreated++;
    } catch (e) {
      errors.push(
        `Failed to save skill '${skillItem.slug}': ${(e as Error).message}`
      );
    }
  }

  // Save concept cards as artifacts
  for (const card of result.conceptCards) {
    try {
      await insertArtifact({
        subject,
        yearGroup,
        examBoard,
        topic: card.topicName,
        artifactType: "concept_card",
        contentJson: card as unknown as Record<string, unknown>,
        status: "draft",
        version: 1,
        generatedBy: generatedBy ?? null,
      });
      artifactsCreated++;
    } catch (e) {
      errors.push(
        `Failed to save concept card '${card.title}': ${(e as Error).message}`
      );
    }
  }

  // Save question archetypes as artifacts
  for (const archetype of result.questionArchetypes) {
    try {
      await insertArtifact({
        subject,
        yearGroup,
        examBoard,
        topic: archetype.topicName,
        skillSlug: archetype.skillSlug,
        artifactType: "question_archetype",
        contentJson: archetype as unknown as Record<string, unknown>,
        status: "draft",
        version: 1,
        generatedBy: generatedBy ?? null,
      });
      artifactsCreated++;
    } catch (e) {
      errors.push(
        `Failed to save archetype for '${archetype.skillSlug}': ${(e as Error).message}`
      );
    }
  }

  // Save misconceptions as artifacts
  for (const mc of result.misconceptions) {
    try {
      await insertArtifact({
        subject,
        yearGroup,
        examBoard,
        topic: mc.skillSlug,
        skillSlug: mc.skillSlug,
        artifactType: "misconception_map",
        contentJson: mc as unknown as Record<string, unknown>,
        status: "draft",
        version: 1,
        generatedBy: generatedBy ?? null,
      });
      artifactsCreated++;
    } catch (e) {
      errors.push(
        `Failed to save misconception for '${mc.skillSlug}': ${(e as Error).message}`
      );
    }
  }

  return { artifacts: artifactsCreated, errors };
}
