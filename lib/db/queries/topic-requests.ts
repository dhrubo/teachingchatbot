import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mission, type TopicRequest, topicRequest } from "../schema";

export function normaliseTopicText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

/** Active missions (the matcher's candidate list). */
export async function getActiveMissions(): Promise<
  { slug: string; title: string; yearGroup: number }[]
> {
  return await db
    .select({
      slug: mission.slug,
      title: mission.title,
      yearGroup: mission.yearGroup,
    })
    .from(mission)
    .where(eq(mission.isActive, true));
}

/** Log an unmatched topic request, de-duping by normalised text (bumps count). */
export async function recordTopicRequest(params: {
  topicText: string;
  requestedByUserId?: string | null;
}): Promise<void> {
  const normalisedText = normaliseTopicText(params.topicText);
  if (!normalisedText) {
    return;
  }
  const topicText = params.topicText.trim();
  const rows = await db
    .insert(topicRequest)
    .values({
      topicText,
      normalisedText,
      requestedByUserId: params.requestedByUserId ?? null,
      requestCount: 1,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: topicRequest.normalisedText,
      set: {
        requestCount: sql`${topicRequest.requestCount} + 1`,
        updatedAt: new Date(),
      },
    })
    // xmax = 0 means the row was INSERTED (not updated) — i.e. a first-time request.
    .returning({ isNew: sql<boolean>`(xmax = 0)` });

  if (rows[0]?.isNew) {
    await notifyNewTopicRequest(topicText);
  }
}

/**
 * Fire an admin notification when a brand-new topic is requested. Posts to a
 * webhook (Slack/Discord/Zapier-compatible) if TOPIC_REQUEST_WEBHOOK_URL is set;
 * no-ops otherwise. Best-effort: never throws into the request path.
 */
async function notifyNewTopicRequest(topicText: string): Promise<void> {
  const url = process.env.TOPIC_REQUEST_WEBHOOK_URL;
  if (!url) {
    return;
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `📋 New SARA topic request: "${topicText}" — not in the curriculum yet.`,
        topic: topicText,
        source: "sara-match-topics",
      }),
    });
  } catch (error) {
    console.error("[topic-requests] webhook notify failed:", error);
  }
}

/** Recent open topic requests for the admin/parent dashboard. */
export async function getTopicRequests(limit = 50): Promise<TopicRequest[]> {
  return await db
    .select()
    .from(topicRequest)
    .where(eq(topicRequest.status, "new"))
    .orderBy(desc(topicRequest.requestCount), desc(topicRequest.createdAt))
    .limit(limit);
}

/** All topic requests (any status) for the admin view. */
export async function getAllTopicRequests(
  limit = 200
): Promise<TopicRequest[]> {
  return await db
    .select()
    .from(topicRequest)
    .orderBy(desc(topicRequest.requestCount), desc(topicRequest.createdAt))
    .limit(limit);
}

/** Count of active missions (for the admin curriculum summary). */
export async function getActiveMissionCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mission)
    .where(eq(mission.isActive, true));
  return rows[0]?.count ?? 0;
}
