import { createClient } from "redis";

import { isProductionEnvironment } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";

const MAX_MESSAGES = 10;
const TTL_SECONDS = 60 * 60;

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client && process.env.REDIS_URL) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", () => undefined);
    client.connect().catch(() => {
      client = null;
    });
  }
  return client;
}

// In-memory fallback when Redis is unavailable (serverless cold start, dev).
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

function memoryIncr(key: string, ttl: number): number {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.expiresAt) {
    memoryStore.set(key, { count: 1, expiresAt: now + ttl * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

export async function checkIpRateLimit(ip: string | undefined) {
  if (!isProductionEnvironment || !ip) {
    return;
  }

  const redis = getClient();
  if (redis?.isReady) {
    try {
      const key = `ip-rate-limit:${ip}`;
      const [count] = await redis
        .multi()
        .incr(key)
        .expire(key, TTL_SECONDS, "NX")
        .exec();

      if (typeof count === "number" && count > MAX_MESSAGES) {
        throw new ChatbotError("rate_limit:chat");
      }
      return;
    } catch (error) {
      if (error instanceof ChatbotError) {
        throw error;
      }
      // Redis error — fall through to in-memory fallback.
    }
  }

  // In-memory fallback: enforce the same limit without Redis.
  const memCount = memoryIncr(`ip:${ip}`, TTL_SECONDS);
  if (memCount > MAX_MESSAGES) {
    throw new ChatbotError("rate_limit:chat");
  }
}

// Simple in-memory rate limiter for admin/auth endpoints.
// Independent of Redis — always uses the in-memory store.
const adminStore = new Map<string, { count: number; resetAt: number }>();

export async function checkAdminRateLimit(userId: string): Promise<void> {
  if (!isProductionEnvironment) return;

  const MAX_ADMIN_ACTIONS = 20;
  const WINDOW_MS = 60_000; // 1 minute

  const now = Date.now();
  const entry = adminStore.get(userId);

  if (!entry || now > entry.resetAt) {
    adminStore.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count += 1;
  if (entry.count > MAX_ADMIN_ACTIONS) {
    throw new Error("Rate limit exceeded for admin actions");
  }
}
