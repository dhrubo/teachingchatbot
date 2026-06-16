import "server-only";

import { db } from "@/lib/db/client";
import { aiCall, type AiCall } from "../schema";
import { ChatbotError } from "@/lib/errors";
import { eq, sql } from "drizzle-orm";

export async function logAICall(data: {
  studentId?: string | null;
  purpose: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  estimatedTokensSaved?: number;
  cachedResponseUsed?: boolean;
}): Promise<AiCall> {
  try {
    const [logged] = await db
      .insert(aiCall)
      .values({
        studentId: data.studentId ?? null,
        purpose: data.purpose,
        modelUsed: data.modelUsed,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        estimatedTokensSaved: data.estimatedTokensSaved ?? 0,
        cachedResponseUsed: data.cachedResponseUsed ?? false,
      })
      .returning();
    return logged;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to log AI call");
  }
}

export async function getAIEfficiencyStats(studentId: string) {
  try {
    const [stats] = await db
      .select({
        totalCalls: sql<number>`count(*)::int`,
        totalPromptTokens: sql<number>`sum(${aiCall.promptTokens})::int`,
        totalCompletionTokens: sql<number>`sum(${aiCall.completionTokens})::int`,
        totalSavedTokens: sql<number>`sum(${aiCall.estimatedTokensSaved})::int`,
      })
      .from(aiCall)
      .where(eq(aiCall.studentId, studentId));

    return {
      totalCalls: stats?.totalCalls ?? 0,
      totalPromptTokens: stats?.totalPromptTokens ?? 0,
      totalCompletionTokens: stats?.totalCompletionTokens ?? 0,
      totalSavedTokens: stats?.totalSavedTokens ?? 0,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get AI efficiency stats"
    );
  }
}
