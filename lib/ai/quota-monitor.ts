import "server-only";

import { gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiCall } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Configuration — override via env
// ---------------------------------------------------------------------------

const MAX_DAILY_CALLS = Number(process.env.MAX_DAILY_AI_CALLS) || 500;
const AMBER_AT = 0.6; // 60% of max → start throttling
const RED_AT = 0.8; // 80% of max → critical only
const CACHE_TTL_MS = 60_000; // re-check quota at most once per minute

// ---------------------------------------------------------------------------
// Purposes mapped to criticality tiers
// ---------------------------------------------------------------------------

export type CriticalityTier = "critical" | "important" | "deferrable";

const PURPOSE_TIER: Record<string, CriticalityTier> = {
  chat: "critical",
  hint: "critical",
  explanation: "important",
  reteach: "important",
  open_answer_grading: "important",
  parent_report: "deferrable",
  misconception_analysis: "deferrable",
  summary: "deferrable",
  curriculum_generation: "deferrable",
};

function tierForPurpose(purpose: string): CriticalityTier {
  return PURPOSE_TIER[purpose] ?? "important";
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type QuotaState = {
  /** Total calls made today across the project. */
  callsToday: number;
  /** Total tokens consumed today (prompt + completion). */
  tokensToday: number;
  /** 0–1 fraction of the daily quota used. */
  usagePct: number;
  /** Inferred state label. */
  state: "green" | "amber" | "red";
};

export type QuotaCheck = {
  /** Whether the AI call is allowed to proceed. */
  allowed: boolean;
  /** Whether the caller should use a cheaper/lite model variant. */
  preferLite: boolean;
  /** Human-readable reason for logging. */
  reason: string;
};

// ---------------------------------------------------------------------------
// Cached quota state
// ---------------------------------------------------------------------------

let cachedState: { state: QuotaState; at: number } | null = null;

function isCacheValid(): boolean {
  return cachedState !== null && Date.now() - cachedState.at < CACHE_TTL_MS;
}

// ---------------------------------------------------------------------------
// Quota queries
// ---------------------------------------------------------------------------

async function queryTodayUsage(): Promise<{ calls: number; tokens: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      calls: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${aiCall.promptTokens} + ${aiCall.completionTokens}), 0)::int`,
    })
    .from(aiCall)
    .where(gte(aiCall.createdAt, today));

  return {
    calls: rows[0]?.calls ?? 0,
    tokens: rows[0]?.tokens ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch (or return cached) quota state for today across the project.
 */
export async function getQuotaState(): Promise<QuotaState> {
  if (isCacheValid()) {
    return cachedState!.state;
  }

  const { calls, tokens } = await queryTodayUsage();
  const usagePct = MAX_DAILY_CALLS > 0 ? Math.min(calls / MAX_DAILY_CALLS, 1) : 0;
  let state: QuotaState["state"] = "green";
  if (usagePct >= RED_AT) state = "red";
  else if (usagePct >= AMBER_AT) state = "amber";

  const result: QuotaState = { callsToday: calls, tokensToday: tokens, usagePct, state };
  cachedState = { state: result, at: Date.now() };
  return result;
}

/**
 * Invalidate the cached quota state so the next call re-queries the DB.
 * Call this after logging a new AI call.
 */
export function invalidateQuotaCache(): void {
  cachedState = null;
}

/**
 * Check whether an AI call with the given purpose is allowed to proceed.
 *
 * Returns a `QuotaCheck` with:
 * - `allowed` — false means skip this call entirely
 * - `preferLite` — true means use a cheaper model variant
 * - `reason` — for logging
 */
export async function checkQuota(purpose: string): Promise<QuotaCheck> {
  const quota = await getQuotaState();
  const tier = tierForPurpose(purpose);
  const usagePct = quota.usagePct;

  // Green: always proceed
  if (usagePct < AMBER_AT) {
    return { allowed: true, preferLite: false, reason: `green (${(usagePct * 100).toFixed(0)}%)` };
  }

  // Amber: throttle deferrable, prefer lite for important
  if (usagePct < RED_AT) {
    if (tier === "deferrable") {
      return {
        allowed: false,
        preferLite: false,
        reason: `amber (${(usagePct * 100).toFixed(0)}%): defer ${purpose}`,
      };
    }
    if (tier === "important") {
      return {
        allowed: true,
        preferLite: true,
        reason: `amber (${(usagePct * 100).toFixed(0)}%): lite model for ${purpose}`,
      };
    }
    return { allowed: true, preferLite: false, reason: `amber (${(usagePct * 100).toFixed(0)}%): critical ok` };
  }

  // Red: only critical proceeds (with lite model)
  if (tier === "critical") {
    return {
      allowed: true,
      preferLite: true,
      reason: `red (${(usagePct * 100).toFixed(0)}%): critical with lite`,
    };
  }

  return {
    allowed: false,
    preferLite: false,
    reason: `red (${(usagePct * 100).toFixed(0)}%): defer ${purpose}`,
  };
}
