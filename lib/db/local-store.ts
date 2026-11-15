import "server-only";
import fs from "node:fs";
import path from "node:path";
import { isTestEnvironment } from "@/lib/constants";
import type {
  DailyPracticeLogRecord,
  LearnerRecord,
  PushSubscriptionRow,
  TopicProgressRecord,
  TutorSessionRecord,
} from "./schema";

type SerializedLearner = Omit<LearnerRecord, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type SerializedProgress = Omit<
  TopicProgressRecord,
  "nextReviewAt" | "lastStudiedAt"
> & {
  nextReviewAt: string | null;
  lastStudiedAt: string;
};

type SerializedSession = Omit<TutorSessionRecord, "updatedAt"> & {
  updatedAt: string;
};

type SerializedPushSub = Omit<PushSubscriptionRow, "createdAt"> & {
  createdAt: string;
};

export type LocalStoreData = {
  learners: Record<string, SerializedLearner>;
  progress: Record<string, SerializedProgress>;
  sessions: Record<string, SerializedSession>;
  pushSubscriptions: Record<string, SerializedPushSub>;
  practiceLogs: Record<string, DailyPracticeLogRecord>;
};

const EMPTY_STORE: LocalStoreData = {
  learners: {},
  progress: {},
  sessions: {},
  pushSubscriptions: {},
  practiceLogs: {},
};

let memoryStore: LocalStoreData = structuredClone(EMPTY_STORE);
const STORE_PATH = path.join(process.cwd(), ".data", "local-store.json");

export function readLocalStore(): LocalStoreData {
  if (isTestEnvironment) {
    return memoryStore;
  }

  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
      memoryStore = {
        learners: parsed.learners ?? {},
        progress: parsed.progress ?? {},
        sessions: parsed.sessions ?? {},
        pushSubscriptions: parsed.pushSubscriptions ?? {},
        practiceLogs: parsed.practiceLogs ?? {},
      };
    }
  } catch {
    // Fall back to in-memory store on read-only serverless filesystems
  }

  return memoryStore;
}

export function writeLocalStore(next: LocalStoreData): void {
  memoryStore = next;

  if (isTestEnvironment) {
    return;
  }

  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2), "utf-8");
  } catch {
    // Read-only filesystem fallback keeps state in memoryStore
  }
}

export function resetLocalStoreForTests(): void {
  memoryStore = structuredClone(EMPTY_STORE);
}
