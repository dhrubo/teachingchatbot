import "server-only";

import { desc, eq, notLike } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "../schema";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  approvalStatus: ApprovalStatus;
  createdAt: Date;
};

/** Real (non-guest) accounts for the admin users list. */
export async function getRegularUsers(limit = 200): Promise<AdminUser[]> {
  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      approvalStatus: user.approvalStatus,
      createdAt: user.createdAt,
    })
    .from(user)
    // Exclude guest accounts (their emails are "guest-<ts>").
    .where(notLike(user.email, "guest-%"))
    .orderBy(desc(user.createdAt))
    .limit(limit);
  return rows as AdminUser[];
}

/** Set a user's approval status (admin action). */
export async function setUserApprovalStatus(
  userId: string,
  status: ApprovalStatus
): Promise<void> {
  await db
    .update(user)
    .set({ approvalStatus: status, updatedAt: new Date() })
    .where(eq(user.id, userId));
}

/** Current approval status for a single user (premium gating). */
export async function getApprovalStatus(
  userId: string
): Promise<ApprovalStatus | null> {
  const rows = await db
    .select({ approvalStatus: user.approvalStatus })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return (rows[0]?.approvalStatus as ApprovalStatus) ?? null;
}
