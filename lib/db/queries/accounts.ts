import "server-only";
import { and, eq, or } from "drizzle-orm";
import { generateWatcherCode } from "@/lib/auth/crypto";
import { ChatbotError } from "@/lib/errors";
import { generateUUID } from "@/lib/utils";
import { runWithDbFallback } from "../client";
import { readLocalStore, writeLocalStore } from "../local-store";
import {
  type AccountRecord,
  account,
  type EdexcelTier,
  type GuardianLinkRecord,
  type GuardianRelationship,
  guardianLink,
  type LearnerRecord,
  type QuizAttemptRecord,
  type TopicProgressRecord,
} from "../schema";
import { getOrCreateLearner, updateLearnerConfig } from "./learners";
import { getLearnerTopicProgress } from "./progress";
import { getLearnerQuizAttempts } from "./quizzes";

export type WatchedKidSummary = {
  learner: LearnerRecord;
  studentUsername: string;
  watcherCode: string | null;
  relationship: GuardianRelationship;
  topicsStudiedCount: number;
  averageMastery: number;
  topicProgress: TopicProgressRecord[];
  recentQuizzes: QuizAttemptRecord[];
};

function normalizeIdentifier(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function findAccountForLogin(
  identifier: string
): Promise<AccountRecord | null> {
  const norm = normalizeIdentifier(identifier);
  if (!norm) {
    return null;
  }

  return await runWithDbFallback(
    async (db) => {
      const rows = await db
        .select()
        .from(account)
        .where(or(eq(account.username, norm), eq(account.email, norm)))
        .limit(1);
      return rows[0] ?? null;
    },
    () => {
      const store = readLocalStore();
      const found = Object.values(store.accounts).find(
        (row) => row.username === norm || row.email === norm
      );
      return found ? { ...found, createdAt: new Date(found.createdAt) } : null;
    }
  );
}

export async function getAccountById(
  id: string
): Promise<AccountRecord | null> {
  return await runWithDbFallback(
    async (db) => {
      const rows = await db
        .select()
        .from(account)
        .where(eq(account.id, id))
        .limit(1);
      return rows[0] ?? null;
    },
    () => {
      const store = readLocalStore();
      const saved = store.accounts[id];
      return saved ? { ...saved, createdAt: new Date(saved.createdAt) } : null;
    }
  );
}

export async function getStudentAccountByLearnerId(
  learnerId: string
): Promise<AccountRecord | null> {
  return await runWithDbFallback(
    async (db) => {
      const rows = await db
        .select()
        .from(account)
        .where(
          and(eq(account.learnerId, learnerId), eq(account.role, "student"))
        )
        .limit(1);
      return rows[0] ?? null;
    },
    () => {
      const store = readLocalStore();
      const found = Object.values(store.accounts).find(
        (row) => row.learnerId === learnerId && row.role === "student"
      );
      return found ? { ...found, createdAt: new Date(found.createdAt) } : null;
    }
  );
}

async function ensureUniqueUsernameAndEmail(
  username: string,
  email: string | null
): Promise<void> {
  const existingUser = await findAccountForLogin(username);
  if (existingUser) {
    throw new ChatbotError(
      "bad_request:auth",
      "That username is already taken. Please pick another one."
    );
  }
  if (email) {
    const existingEmail = await findAccountForLogin(email);
    if (existingEmail) {
      throw new ChatbotError(
        "bad_request:auth",
        "An account with that email already exists. Try signing in instead."
      );
    }
  }
}

async function upsertGuardianLinkRow(
  parentAccountId: string,
  learnerId: string,
  relationship: GuardianRelationship
): Promise<GuardianLinkRecord> {
  const now = new Date();
  const row: GuardianLinkRecord = {
    parentAccountId,
    learnerId,
    relationship,
    createdAt: now,
  };

  return await runWithDbFallback(
    async (db) => {
      await db
        .insert(guardianLink)
        .values(row)
        .onConflictDoNothing({
          target: [guardianLink.parentAccountId, guardianLink.learnerId],
        });
      return row;
    },
    () => {
      const store = readLocalStore();
      const key = `${parentAccountId}:${learnerId}`;
      if (!store.guardianLinks[key]) {
        store.guardianLinks[key] = {
          ...row,
          createdAt: now.toISOString(),
        };
        writeLocalStore(store);
      }
      return row;
    }
  );
}

async function generateUniqueWatcherCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateWatcherCode();
    const taken = await runWithDbFallback(
      async (db) => {
        const rows = await db
          .select()
          .from(account)
          .where(eq(account.watcherCode, candidate))
          .limit(1);
        return rows.length > 0;
      },
      () => {
        const store = readLocalStore();
        return Object.values(store.accounts).some(
          (row) => row.watcherCode === candidate
        );
      }
    );
    if (!taken) {
      return candidate;
    }
  }
  return generateWatcherCode();
}

export async function createParentAccount(input: {
  displayName: string;
  username: string;
  email: string;
  passwordHash: string;
}): Promise<AccountRecord> {
  const normUsername = normalizeIdentifier(input.username);
  const normEmail = normalizeIdentifier(input.email);
  await ensureUniqueUsernameAndEmail(normUsername, normEmail);

  const now = new Date();
  const created: AccountRecord = {
    id: generateUUID(),
    role: "parent",
    displayName: input.displayName.trim(),
    username: normUsername,
    email: normEmail,
    passwordHash: input.passwordHash,
    pinHash: null,
    learnerId: null,
    watcherCode: null,
    invitedParentEmail: null,
    createdAt: now,
  };

  const savedParent = await runWithDbFallback(
    async (db) => {
      const rows = await db.insert(account).values(created).returning();
      return rows[0] ?? created;
    },
    () => {
      const store = readLocalStore();
      store.accounts[created.id] = {
        ...created,
        createdAt: now.toISOString(),
      };
      writeLocalStore(store);
      return created;
    }
  );

  // Auto-link any student profiles that invited this parent email earlier
  const matchingStudents = await runWithDbFallback(
    async (db) =>
      await db
        .select()
        .from(account)
        .where(
          and(
            eq(account.role, "student"),
            eq(account.invitedParentEmail, normEmail)
          )
        ),
    () => {
      const store = readLocalStore();
      return Object.values(store.accounts)
        .filter(
          (row) =>
            row.role === "student" && row.invitedParentEmail === normEmail
        )
        .map((row) => ({ ...row, createdAt: new Date(row.createdAt) }));
    }
  );

  for (const student of matchingStudents) {
    if (student.learnerId) {
      await upsertGuardianLinkRow(
        savedParent.id,
        student.learnerId,
        "email_invite"
      );
    }
  }

  return savedParent;
}

export async function createStudentAccount(input: {
  displayName: string;
  username: string;
  email?: string | null;
  passwordHash?: string | null;
  pinHash?: string | null;
  tier: EdexcelTier;
  targetGrade: number;
  invitedParentEmail?: string | null;
  createdByParentId?: string | null;
  existingGuestLearnerId?: string | null;
}): Promise<{ account: AccountRecord; learner: LearnerRecord }> {
  const normUsername = normalizeIdentifier(input.username);
  const normEmail = input.email ? normalizeIdentifier(input.email) : null;
  const normInvitedParent = input.invitedParentEmail
    ? normalizeIdentifier(input.invitedParentEmail)
    : null;

  await ensureUniqueUsernameAndEmail(normUsername, normEmail);

  // If upgrading an unclaimed guest learner cookie, reuse it; otherwise create a fresh learner UUID
  let learnerId = generateUUID();
  if (input.existingGuestLearnerId && !input.createdByParentId) {
    const alreadyClaimed = await getStudentAccountByLearnerId(
      input.existingGuestLearnerId
    );
    if (!alreadyClaimed) {
      learnerId = input.existingGuestLearnerId;
    }
  }

  await getOrCreateLearner(learnerId);
  const learnerProfile = await updateLearnerConfig(learnerId, {
    nickname: input.displayName.trim(),
    tier: input.tier,
    targetGrade: input.targetGrade,
  });

  const watcherCode = await generateUniqueWatcherCode();
  const now = new Date();
  const created: AccountRecord = {
    id: generateUUID(),
    role: "student",
    displayName: input.displayName.trim(),
    username: normUsername,
    email: normEmail,
    passwordHash: input.passwordHash ?? null,
    pinHash: input.pinHash ?? null,
    learnerId: learnerProfile.id,
    watcherCode,
    invitedParentEmail: normInvitedParent,
    createdAt: now,
  };

  const savedStudent = await runWithDbFallback(
    async (db) => {
      const rows = await db.insert(account).values(created).returning();
      return rows[0] ?? created;
    },
    () => {
      const store = readLocalStore();
      store.accounts[created.id] = {
        ...created,
        createdAt: now.toISOString(),
      };
      writeLocalStore(store);
      return created;
    }
  );

  if (input.createdByParentId) {
    await upsertGuardianLinkRow(
      input.createdByParentId,
      learnerProfile.id,
      "created_by_parent"
    );
  }

  if (normInvitedParent) {
    const existingParent = await findAccountForLogin(normInvitedParent);
    if (existingParent && existingParent.role === "parent") {
      await upsertGuardianLinkRow(
        existingParent.id,
        learnerProfile.id,
        "email_invite"
      );
    }
  }

  return { account: savedStudent, learner: learnerProfile };
}

export async function linkParentToKidByWatcherCode(input: {
  parentAccountId: string;
  watcherCode: string;
}): Promise<{ studentAccount: AccountRecord; learner: LearnerRecord }> {
  const cleanCode = input.watcherCode.replace(/\s+/g, "");

  const studentAccount = await runWithDbFallback(
    async (db) => {
      const rows = await db
        .select()
        .from(account)
        .where(
          and(eq(account.role, "student"), eq(account.watcherCode, cleanCode))
        )
        .limit(1);
      return rows[0] ?? null;
    },
    () => {
      const store = readLocalStore();
      const found = Object.values(store.accounts).find(
        (row) => row.role === "student" && row.watcherCode === cleanCode
      );
      return found ? { ...found, createdAt: new Date(found.createdAt) } : null;
    }
  );

  if (!studentAccount || !studentAccount.learnerId) {
    throw new ChatbotError("not_found:guardian");
  }

  await upsertGuardianLinkRow(
    input.parentAccountId,
    studentAccount.learnerId,
    "watcher_code"
  );

  const learnerProfile = await getOrCreateLearner(studentAccount.learnerId);
  return { studentAccount, learner: learnerProfile };
}

export async function inviteParentWatcherByEmail(input: {
  studentAccountId: string;
  parentEmail: string;
}): Promise<{ linkedImmediately: boolean; invitedParentEmail: string }> {
  const normParentEmail = normalizeIdentifier(input.parentEmail);
  const student = await getAccountById(input.studentAccountId);
  if (!student || student.role !== "student" || !student.learnerId) {
    throw new ChatbotError("unauthorized:auth");
  }

  await runWithDbFallback(
    async (db) => {
      await db
        .update(account)
        .set({ invitedParentEmail: normParentEmail })
        .where(eq(account.id, student.id));
    },
    () => {
      const store = readLocalStore();
      const existing = store.accounts[student.id];
      if (existing) {
        existing.invitedParentEmail = normParentEmail;
        writeLocalStore(store);
      }
    }
  );

  const parentAccount = await findAccountForLogin(normParentEmail);
  if (parentAccount && parentAccount.role === "parent") {
    await upsertGuardianLinkRow(
      parentAccount.id,
      student.learnerId,
      "email_invite"
    );
    return { linkedImmediately: true, invitedParentEmail: normParentEmail };
  }

  return { linkedImmediately: false, invitedParentEmail: normParentEmail };
}

export async function verifyParentWatchesLearner(
  parentAccountId: string,
  learnerId: string
): Promise<boolean> {
  return await runWithDbFallback(
    async (db) => {
      const rows = await db
        .select()
        .from(guardianLink)
        .where(
          and(
            eq(guardianLink.parentAccountId, parentAccountId),
            eq(guardianLink.learnerId, learnerId)
          )
        )
        .limit(1);
      return rows.length > 0;
    },
    () => {
      const store = readLocalStore();
      return Boolean(store.guardianLinks[`${parentAccountId}:${learnerId}`]);
    }
  );
}

export async function getWatchedLearnersForParent(
  parentAccountId: string
): Promise<WatchedKidSummary[]> {
  const links = await runWithDbFallback(
    async (db) =>
      await db
        .select()
        .from(guardianLink)
        .where(eq(guardianLink.parentAccountId, parentAccountId)),
    () => {
      const store = readLocalStore();
      return Object.values(store.guardianLinks)
        .filter((row) => row.parentAccountId === parentAccountId)
        .map((row) => ({ ...row, createdAt: new Date(row.createdAt) }));
    }
  );

  const summaries: WatchedKidSummary[] = [];

  for (const link of links) {
    const [learnerProfile, studentAcct, progressRows, quizRows] =
      await Promise.all([
        getOrCreateLearner(link.learnerId),
        getStudentAccountByLearnerId(link.learnerId),
        getLearnerTopicProgress(link.learnerId),
        getLearnerQuizAttempts(link.learnerId, 10),
      ]);

    const topicsStudiedCount = progressRows.length;
    const averageMastery =
      topicsStudiedCount > 0
        ? Math.round(
            progressRows.reduce((acc, r) => acc + r.masteryScore, 0) /
              topicsStudiedCount
          )
        : 0;

    summaries.push({
      learner: learnerProfile,
      studentUsername: studentAcct?.username ?? "learner",
      watcherCode: studentAcct?.watcherCode ?? null,
      relationship: link.relationship,
      topicsStudiedCount,
      averageMastery,
      topicProgress: progressRows,
      recentQuizzes: quizRows,
    });
  }

  return summaries;
}
