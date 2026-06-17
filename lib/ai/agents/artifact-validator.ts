import { z } from "zod";
import { generateObject } from "ai";
import { getTutorProviderCandidates, isQuotaError } from "@/lib/ai/providers";

const validationIssueSchema = z.object({
  field: z
    .string()
    .describe(
      "The field or aspect with an issue (e.g. 'yearGroup', 'content', 'gcseAlignment')"
    ),
  severity: z
    .enum(["error", "warning"])
    .describe("error = must fix, warning = should improve"),
  message: z
    .string()
    .describe(
      "Clear, specific description of the issue (1 sentence)"
    ),
});

const validationResultSchema = z.object({
  valid: z
    .boolean()
    .describe(
      "true if the artifact passes all checks and is ready for approval"
    ),
  issues: z
    .array(validationIssueSchema)
    .describe("List of issues found, empty if valid"),
  summary: z
    .string()
    .describe(
      "One-sentence summary of the validation result"
    ),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

const SYSTEM_PROMPT = `You are a UK GCSE curriculum validator. Given a curriculum artifact, check:

1. **Year appropriateness** — Is the content suitable for the specified year group (Year 8 = 12-13, Year 9 = 13-14, Year 10 = 14-15, Year 11 = 15-16)?
2. **GCSE alignment** — Does the content align with the UK GCSE specification?
3. **Content quality** — Is the teaching content accurate, clear, and age-appropriate?
4. **Schema completeness** — Does the content have all necessary fields for its artifact type?
5. **Concept card coverage** — If this is a lesson, topic_map, or concept_card artifact, check that there are at least 6 concept cards. Fewer than 6 means students cannot proceed to Challenge Mode. Add a warning if under 6.

Return valid=true only if ALL checks pass. If any check fails, list specific, actionable issues.`;

export async function validateArtifact(params: {
  artifactType: string;
  subject: string;
  yearGroup: number;
  examBoard: string;
  topic: string;
  contentJson: Record<string, unknown>;
}): Promise<ValidationResult> {
  const candidates = getTutorProviderCandidates(true);

  const prompt = `Validate this ${params.artifactType} artifact:

Subject: ${params.subject}
Year Group: ${params.yearGroup}
Exam Board: ${params.examBoard}
Topic: ${params.topic}

Content:
${JSON.stringify(params.contentJson, null, 2)}`;

  for (const candidate of candidates) {
    try {
      const result = await generateObject({
        model: candidate.model,
        schema: validationResultSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });
      return result.object;
    } catch (error) {
      if (isQuotaError(error)) {
        continue;
      }
      return {
        valid: false,
        issues: [
          {
            field: "llm",
            severity: "error",
            message: `Validation LLM call failed: ${(error as Error).message}`,
          },
        ],
        summary: "Validation failed due to an error.",
      };
    }
  }

  return {
    valid: false,
    issues: [
      {
        field: "llm",
        severity: "error",
        message: "All AI models exhausted",
      },
    ],
    summary: "Validation failed — no AI provider available.",
  };
}

export async function validateMultipleArtifacts(
  artifacts: {
    id: string;
    artifactType: string;
    subject: string;
    yearGroup: number;
    examBoard: string;
    topic: string;
    contentJson: Record<string, unknown>;
  }[]
): Promise<{ id: string; result: ValidationResult }[]> {
  return Promise.all(
    artifacts.map(async (a) => ({
      id: a.id,
      result: await validateArtifact(a),
    }))
  );
}
