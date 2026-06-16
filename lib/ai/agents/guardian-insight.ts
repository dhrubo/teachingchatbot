import { generateObject } from "ai";
import { z } from "zod";
import { getTutorProviderCandidates, isQuotaError } from "@/lib/ai/providers";

const insightSchema = z.object({
  strengths: z
    .array(z.string())
    .describe("2-3 specific topics or skills the student is strong in"),
  weaknesses: z
    .array(z.string())
    .describe("2-3 specific topics or skills needing improvement"),
  revisionPriorities: z
    .array(z.string())
    .describe("1-3 recommended next topics to study, in priority order"),
  confidenceTrend: z
    .string()
    .describe(
      "One sentence describing the student's confidence trend this week"
    ),
  summaryText: z
    .string()
    .describe(
      "A warm, informative 3-4 sentence summary for the parent, written for a non-specialist audience"
    ),
});

export type GuardianInsight = z.infer<typeof insightSchema>;

const SYSTEM_PROMPT = `You are a supportive UK GCSE tutor writing a weekly progress report for a parent.

Given a student's mastery data, misconceptions, quiz attempts, and learning goals, write a clear, warm, and actionable summary for their parent.

Focus on:
1. What the student has improved at this week
2. Specific areas that need more practice
3. Recommended next steps
4. Overall confidence and engagement trends

Be specific (mention skill names) but avoid jargon. Write for a parent who wants to help their child but may not know the curriculum.`;

export async function generateWeeklyInsight(params: {
  studentName: string;
  yearGroup: number;
  subject: string;
  masteryData: { skillSlug: string; masteryScore: number; currentBand: string; attempts: number; correct: number }[];
  misconceptions: { skillSlug: string; misconception: string; count: number }[];
  recentAttempts: { skillSlug: string; isCorrect: boolean; createdAt: Date }[];
  goals: { description: string; status: string; targetDate: Date | null }[];
}): Promise<GuardianInsight> {
  const candidates = getTutorProviderCandidates(true);

  const prompt = `Generate a weekly parent summary for ${params.studentName} (Year ${params.yearGroup}, ${params.subject}).

Mastery Data (skill → score/band/attempts/correct):
${JSON.stringify(params.masteryData, null, 2)}

Misconceptions this week:
${JSON.stringify(params.misconceptions, null, 2)}

Recent Quiz Attempts (last 7 days):
${JSON.stringify(params.recentAttempts.slice(0, 20), null, 2)}

Current Learning Goals:
${JSON.stringify(params.goals, null, 2)}`;

  for (const candidate of candidates) {
    try {
      const result = await generateObject({
        model: candidate.model,
        schema: insightSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });
      return result.object;
    } catch (error) {
      if (isQuotaError(error)) {
        continue;
      }
      return {
        strengths: ["Data unavailable"],
        weaknesses: ["Data unavailable"],
        revisionPriorities: ["Contact support"],
        confidenceTrend: "Unable to generate insight due to a technical error.",
        summaryText: `We encountered an issue generating the weekly report for ${params.studentName}. Please try again later.`,
      };
    }
  }

  return {
    strengths: ["Data unavailable"],
    weaknesses: ["Data unavailable"],
    revisionPriorities: ["Contact support"],
    confidenceTrend:
      "Unable to generate insight — no AI provider available.",
    summaryText: `We couldn't generate a report for ${params.studentName} because no AI provider was available. Please check your API key configuration.`,
  };
}

export function buildPromptFromDashboardData(
  student: { name: string; schoolYear: string | number | null },
  masteryData: { skillSlug: string; masteryScore: number; currentBand: string; attempts: number; correct: number }[],
  misconceptions: { skillSlug: string; misconception: string; count: number }[],
  attempts: { skillSlug: string; isCorrect: boolean; createdAt: Date }[],
  goals: { description: string; status: string; targetDate: Date | null }[]
) {
  return {
    studentName: student.name,
    yearGroup: Number(student.schoolYear ?? 8),
    subject: "Maths",
    masteryData,
    misconceptions,
    recentAttempts: attempts.filter(
      (a) =>
        new Date(a.createdAt).getTime() >
        Date.now() - 7 * 24 * 60 * 60 * 1000
    ),
    goals: goals.filter((g) => g.status !== "completed"),
  };
}
