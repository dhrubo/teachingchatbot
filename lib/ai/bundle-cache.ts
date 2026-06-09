import type { ChallengeBundle } from "./challenge-bundle";

// Lightweight in-memory cache for lesson challenge bundles.
// Caches by key: `${studentYear}-${topic}-${difficulty}-${curriculumVersion}`
// In-memory only (no schema change). Cleared on server restart.
// Does not cache student-specific personal data.

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

type CacheEntry = {
  bundle: ChallengeBundle;
  createdAt: number;
};

const store = new Map<string, CacheEntry>();

export function getBundle(
  studentYear: number,
  topic: string,
  difficulty: string
): ChallengeBundle | null {
  const key = cacheKey(studentYear, topic, difficulty);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.bundle;
}

export function setBundle(
  studentYear: number,
  topic: string,
  difficulty: string,
  bundle: ChallengeBundle
): void {
  const key = cacheKey(studentYear, topic, difficulty);
  store.set(key, { bundle, createdAt: Date.now() });
}

export function clearCache(): void {
  store.clear();
}

function cacheKey(
  studentYear: number,
  topic: string,
  difficulty: string
): string {
  return `${studentYear}-${topic.toLowerCase().trim()}-${difficulty.toLowerCase().trim()}-v1`;
}
