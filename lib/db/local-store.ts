import "server-only";
import fs from "node:fs";
import path from "node:path";
import { isTestEnvironment } from "@/lib/constants";
import type {
  AccountRecord,
  DailyPracticeLogRecord,
  GuardianLinkRecord,
  LearnerRecord,
  PushSubscriptionRow,
  QuizAttemptRecord,
  TopicProgressRecord,
  TutorSessionRecord,
} from "./schema";

export type SerializedLearner = Omit<
  LearnerRecord,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export type SerializedAccount = Omit<AccountRecord, "createdAt"> & {
  createdAt: string;
};

export type SerializedGuardianLink = Omit<GuardianLinkRecord, "createdAt"> & {
  createdAt: string;
};

export type SerializedProgress = Omit<
  TopicProgressRecord,
  "nextReviewAt" | "lastStudiedAt"
> & {
  nextReviewAt: string | null;
  lastStudiedAt: string;
};

export type SerializedSession = Omit<TutorSessionRecord, "updatedAt"> & {
  updatedAt: string;
};

export type SerializedQuizAttempt = Omit<
  QuizAttemptRecord,
  "startedAt" | "completedAt"
> & {
  startedAt: string;
  completedAt: string | null;
};

export type SerializedPushSub = Omit<PushSubscriptionRow, "createdAt"> & {
  createdAt: string;
};

export type LocalStoreData = {
  learners: Record<string, SerializedLearner>;
  accounts: Record<string, SerializedAccount>;
  guardianLinks: Record<string, SerializedGuardianLink>;
  progress: Record<string, SerializedProgress>;
  sessions: Record<string, SerializedSession>;
  quizAttempts: Record<string, SerializedQuizAttempt>;
  pushSubscriptions: Record<string, SerializedPushSub>;
  practiceLogs: Record<string, DailyPracticeLogRecord>;
};

const EMPTY_STORE: LocalStoreData = {
  learners: {},
  accounts: {},
  guardianLinks: {},
  progress: {},
  sessions: {},
  quizAttempts: {},
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
        accounts: parsed.accounts ?? {},
        guardianLinks: parsed.guardianLinks ?? {},
        progress: parsed.progress ?? {},
        sessions: parsed.sessions ?? {},
        quizAttempts: parsed.quizAttempts ?? {},
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
