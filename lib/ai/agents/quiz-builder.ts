import { generateObject } from "ai";
import { z } from "zod";
import { getTutorProviderCandidates, isQuotaError } from "@/lib/ai/providers";
import { listArtifacts } from "@/lib/db/queries/artifacts";
import { createArtifact } from "@/lib/db/queries/artifacts";

const quizSectionSchema = z.object({
  skillSlug: z.string(),
  skillName: z.string(),
  difficultyBand: z.enum(["must", "should", "could", "gcse_bridge"]),
  questionCount: z.number().min(1).max(10),
  archetypeSlugs: z.array(z.string()),
});

const quizSchema = z.object({
  title: z.string(),
  description: z.string(),
  totalQuestions: z.number().min(1).max(50),
  durationMinutes: z.number().min(5).max(120),
  sections: z.array(quizSectionSchema),
});

export type QuizPlan = z.infer<typeof quizSchema>;

const SYSTEM_PROMPT = `You are a UK GCSE quiz designer.

Given a set of approved question archetypes, skills, and topic maps, assemble a coherent quiz by selecting the right questions and organizing them into pedagogically sound sections.

Rules:
1. Each section should cover one skill and one difficulty band
2. Mix difficulty bands across sections (some "must", some "should", some "could")
3. Prefer skills that have the most archetypes available
4. Total questions across all sections must match the requested number
5. Only use archetypes that exist in the provided list
6. Order sections from easier to harder topics

Write a warm, encouraging description for the quiz.`;

export async function buildQuiz(params: {
  subject: string;
  yearGroup: number;
  examBoard: string;
  title: string;
  numQuestions: number;
}): Promise<{ quiz: QuizPlan | null; artifacts: number; errors: string[] }> {
  const errors: string[] = [];

  // Fetch approved artifacts for this subject/year
  const [archetypes, skills, topics] = await Promise.all([
    listArtifacts({
      subject: params.subject,
      yearGroup: params.yearGroup,
      artifactType: "question_archetype",
      status: "approved",
    }),
    listArtifacts({
      subject: params.subject,
      yearGroup: params.yearGroup,
      artifactType: "skill",
      status: "approved",
    }),
    listArtifacts({
      subject: params.subject,
      yearGroup: params.yearGroup,
      artifactType: "topic_map",
      status: "approved",
    }),
  ]);

  if (archetypes.artifacts.length === 0) {
    return {
      quiz: null,
      artifacts: 0,
      errors: [
        `No approved question archetypes for ${params.subject} Year ${params.yearGroup}. Run Curriculum Builder Agent first.`,
      ],
    };
  }

  // Build a summary of available data for the LLM
  const availableTopics = topics.artifacts.map((t) => ({
    topic: t.topic,
    content:
      typeof t.contentJson === "object"
        ? JSON.stringify(t.contentJson).slice(0, 300)
        : null,
  }));

  const availableSkills = skills.artifacts.map((s) => ({
    slug: s.topic,
    content:
      typeof s.contentJson === "object"
        ? JSON.stringify(s.contentJson).slice(0, 200)
        : null,
  }));

  const availableArchetypes = archetypes.artifacts.map((a) => ({
    slug: a.topic,
    skillSlug: a.skillSlug,
    difficultyBand:
      (a.contentJson as Record<string, unknown> | null)?.difficultyBand ??
      "must",
    content:
      typeof a.contentJson === "object"
        ? JSON.stringify(a.contentJson).slice(0, 200)
        : null,
  }));

  const candidates = getTutorProviderCandidates(true);

  const prompt = `Build a ${params.numQuestions}-question quiz for ${params.subject} Year ${params.yearGroup} (${params.examBoard}) titled "${params.title}".

Available Topics:
${JSON.stringify(availableTopics, null, 2)}

Available Skills:
${JSON.stringify(availableSkills, null, 2)}

Available Question Archetypes:
${JSON.stringify(availableArchetypes, null, 2)}`;

  for (const candidate of candidates) {
    try {
      const result = await generateObject({
        model: candidate.model,
        schema: quizSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });

      const quiz = result.object;

      // Save as a curriculum artifact
      await createArtifact({
        subject: params.subject,
        yearGroup: params.yearGroup,
        examBoard: params.examBoard,
        topic: quiz.title,
        artifactType: "quiz",
        status: "draft",
        version: 1,
        generatedBy: "quiz-builder-agent",
        contentJson: quiz as unknown as Record<string, unknown>,
      });

      return {
        quiz,
        artifacts: 1,
        errors,
      };
    } catch (error) {
      if (isQuotaError(error)) {
        continue;
      }
      errors.push(`Failed to build quiz: ${(error as Error).message}`);
      return { quiz: null, artifacts: 0, errors };
    }
  }

  return {
    quiz: null,
    artifacts: 0,
    errors: [...errors, "No AI provider available"],
  };
}
