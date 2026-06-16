import { generateObject } from "ai";
import { z } from "zod";
import { getTutorProviderCandidates, isQuotaError } from "@/lib/ai/providers";
import { db } from "@/lib/db/client";
import { questionAttempt, curriculumArtifact } from "@/lib/db/schema";
import { eq, gte, sql, desc, and } from "drizzle-orm";

const misconceptionAnalysisSchema = z.object({
  skillSlug: z.string(),
  skillLabel: z.string(),
  commonMisconceptions: z.array(
    z.object({
      misconception: z
        .string()
        .describe("The misconception label, e.g. 'Sign error when expanding brackets'"),
      frequency: z
        .number()
        .describe("Estimated percentage of wrong answers for this skill showing this pattern (0-100)"),
      example: z
        .string()
        .describe("A concrete example of a student answer and the correct answer"),
      explanation: z
        .string()
        .describe("Why students make this error and how to fix it"),
      studentIds: z
        .array(z.string())
        .describe("Student IDs affected by this misconception, if available"),
    })
  ),
  summary: z.string().describe("One-paragraph summary of the key findings for this skill"),
});

export type MisconceptionAnalysis = z.infer<typeof misconceptionAnalysisSchema>;

const batchAnalysisSchema = z.object({
  skills: z.array(misconceptionAnalysisSchema),
});

const SYSTEM_PROMPT = `You are a UK GCSE education analyst identifying common student misconceptions from wrong-answer data.

Given a set of wrong answers grouped by skill, identify the specific misconception patterns.

For each skill:
1. Look at the student answers vs correct answers
2. Identify 1-3 distinct misconception patterns
3. Estimate what percentage of wrong answers show each pattern
4. Provide a concrete example from the data
5. Explain why students make this error
6. Group affected student IDs

Write a clear, actionable summary that a teacher or tutor can use to plan remediation.`;

export async function analyzeMisconceptions(params: {
  days?: number;
  minWrongAnswers?: number;
}): Promise<{
  analyses: MisconceptionAnalysis[];
  totalWrong: number;
  errors: string[];
}> {
  const days = params.days ?? 30;
  const minWrong = params.minWrongAnswers ?? 3;
  const errors: string[] = [];

  // Fetch wrong answers from the last N days
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const wrongAnswers = await db
    .select({
      id: questionAttempt.id,
      studentId: questionAttempt.studentId,
      skillSlug: questionAttempt.skillSlug,
      difficultyBand: questionAttempt.difficultyBand,
      prompt: questionAttempt.prompt,
      studentAnswer: questionAttempt.studentAnswer,
      correctAnswer: questionAttempt.correctAnswer,
      createdAt: questionAttempt.createdAt,
    })
    .from(questionAttempt)
    .where(
      and(
        eq(questionAttempt.isCorrect, false),
        gte(questionAttempt.createdAt, since)
      )
    )
    .orderBy(desc(questionAttempt.createdAt));

  if (wrongAnswers.length === 0) {
    return { analyses: [], totalWrong: 0, errors: ["No wrong answers found in the specified period"] };
  }

  // Group by skill slug
  const bySkill = new Map<
    string,
    typeof wrongAnswers
  >();
  for (const wa of wrongAnswers) {
    const slug = wa.skillSlug;
    if (!bySkill.has(slug)) bySkill.set(slug, []);
    bySkill.get(slug)!.push(wa);
  }

  // Filter skills with enough wrong answers
  const skillsToAnalyze = Array.from(bySkill.entries())
    .filter(([, attempts]) => attempts.length >= minWrong)
    .sort(([, a], [, b]) => b.length - a.length);

  if (skillsToAnalyze.length === 0) {
    return {
      analyses: [],
      totalWrong: wrongAnswers.length,
      errors: [`No skill has ≥${minWrong} wrong answers. Try lowering the threshold.`],
    };
  }

  const candidates = getTutorProviderCandidates(true);

  // Build prompt with wrong answer data per skill
  const skillsData = skillsToAnalyze.slice(0, 10).map(([slug, attempts]) => ({
    slug,
    count: attempts.length,
    attempts: attempts.slice(0, 15).map((a) => ({
      studentId: a.studentId?.slice(0, 8) ?? "guest",
      prompt: a.prompt,
      studentAnswer: a.studentAnswer,
      correctAnswer: a.correctAnswer,
    })),
  }));

  const prompt = `Analyze these wrong answers from the last ${days} days and identify common misconception patterns per skill.

Total wrong answers: ${wrongAnswers.length}
Skills with ≥${minWrong} wrong answers: ${skillsData.length}

Skill Data:
${JSON.stringify(skillsData, null, 2)}`;

  let analyses: MisconceptionAnalysis[] = [];

  for (const candidate of candidates) {
    try {
      const result = await generateObject({
        model: candidate.model,
        schema: batchAnalysisSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });
      analyses = result.object.skills;
      break;
    } catch (error) {
      if (isQuotaError(error)) {
        continue;
      }
      errors.push(`LLM analysis failed: ${(error as Error).message}`);
      return { analyses: [], totalWrong: wrongAnswers.length, errors };
    }
  }

  if (analyses.length === 0) {
    errors.push("All AI providers exhausted");
    return { analyses: [], totalWrong: wrongAnswers.length, errors };
  }

  // Save each skill's analysis as a curriculum artifact
  for (const analysis of analyses) {
    try {
      await db.insert(curriculumArtifact).values({
        subject: "maths",
        yearGroup: 8,
        examBoard: "AQA",
        topic: analysis.skillSlug,
        skillSlug: analysis.skillSlug,
        artifactType: "misconception_map",
        status: "draft",
        version: 1,
        generatedBy: "misconception-agent",
        contentJson: analysis as unknown as Record<string, unknown>,
      });
    } catch {
      // Non-fatal
    }
  }

  return { analyses, totalWrong: wrongAnswers.length, errors };
}
