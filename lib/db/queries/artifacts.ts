import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import db from "../client";
import { curriculumArtifact } from "../schema";

export type ArtifactType =
  | "subject_map"
  | "topic_map"
  | "mission"
  | "lesson"
  | "concept_card"
  | "skill"
  | "question_archetype"
  | "quiz"
  | "boss_battle"
  | "misconception_map";

export type ArtifactStatus = "draft" | "approved" | "rejected";

export interface ListArtifactsParams {
  subject?: string;
  yearGroup?: number;
  artifactType?: ArtifactType;
  status?: ArtifactStatus;
  limit?: number;
  offset?: number;
}

export async function listArtifacts(params: ListArtifactsParams = {}) {
  const conditions = [];

  if (params.subject) {
    conditions.push(eq(curriculumArtifact.subject, params.subject));
  }
  if (params.yearGroup) {
    conditions.push(eq(curriculumArtifact.yearGroup, params.yearGroup));
  }
  if (params.artifactType) {
    conditions.push(eq(curriculumArtifact.artifactType, params.artifactType));
  }
  if (params.status) {
    conditions.push(eq(curriculumArtifact.status, params.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(curriculumArtifact)
    .where(where)
    .orderBy(desc(curriculumArtifact.createdAt))
    .limit(params.limit ?? 50)
    .offset(params.offset ?? 0);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curriculumArtifact)
    .where(where);

  return {
    artifacts: rows,
    total: countResult[0].count,
  };
}

export async function getArtifactById(id: string) {
  const rows = await db
    .select()
    .from(curriculumArtifact)
    .where(eq(curriculumArtifact.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateArtifactStatus(
  id: string,
  status: ArtifactStatus,
  reviewedBy?: string
) {
  const [row] = await db
    .update(curriculumArtifact)
    .set({
      status,
      reviewedBy: reviewedBy ?? null,
      updatedAt: new Date(),
    })
    .where(eq(curriculumArtifact.id, id))
    .returning();
  return row ?? null;
}

export async function createArtifact(
  data: typeof curriculumArtifact.$inferInsert
) {
  const [row] = await db
    .insert(curriculumArtifact)
    .values(data)
    .returning();
  return row;
}

export async function getArtifactsBySubject(subject: string) {
  return db
    .select()
    .from(curriculumArtifact)
    .where(
      and(
        eq(curriculumArtifact.subject, subject),
        eq(curriculumArtifact.status, "approved")
      )
    )
    .orderBy(desc(curriculumArtifact.createdAt));
}

export async function getArtifactsStats() {
  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curriculumArtifact);
  const byStatusRows = await db
    .select({
      status: curriculumArtifact.status,
      count: sql<number>`count(*)::int`,
    })
    .from(curriculumArtifact)
    .groupBy(curriculumArtifact.status);
  const byTypeRows = await db
    .select({
      artifactType: curriculumArtifact.artifactType,
      count: sql<number>`count(*)::int`,
    })
    .from(curriculumArtifact)
    .groupBy(curriculumArtifact.artifactType);

  return {
    total: total.count,
    byStatus: Object.fromEntries(
      byStatusRows.map((r) => [r.status ?? "unknown", r.count])
    ),
    byType: Object.fromEntries(
      byTypeRows.map((r) => [r.artifactType ?? "unknown", r.count])
    ),
  };
}
