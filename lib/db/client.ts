import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  dailyPracticeLog,
  learner,
  pushSubscriptionRecord,
  topicProgress,
  tutorSession,
} from "./schema";

const dbSchema = {
  learner,
  topicProgress,
  tutorSession,
  pushSubscriptionRecord,
  dailyPracticeLog,
};

export type AppDb = PostgresJsDatabase<typeof dbSchema>;

let cachedDb: AppDb | null = null;
let dbUnavailableAtRuntime = false;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL?.trim()) && !dbUnavailableAtRuntime;
}

export function getDb(): AppDb | null {
  if (dbUnavailableAtRuntime) {
    return null;
  }

  const url = process.env.POSTGRES_URL?.trim();
  if (!url) {
    return null;
  }

  if (!cachedDb) {
    const client = postgres(url, { max: 5, connect_timeout: 8 });
    cachedDb = drizzle(client, { schema: dbSchema });
  }

  return cachedDb;
}

export async function runWithDbFallback<T>(
  dbOperation: (db: AppDb) => Promise<T>,
  localFallback: () => T | Promise<T>
): Promise<T> {
  const db = getDb();
  if (!db) {
    return await localFallback();
  }

  try {
    return await dbOperation(db);
  } catch (err) {
    console.warn(
      "[db] Postgres query failed, falling back to local/memory store:",
      err instanceof Error ? err.message : String(err)
    );
    dbUnavailableAtRuntime = true;
    return await localFallback();
  }
}
