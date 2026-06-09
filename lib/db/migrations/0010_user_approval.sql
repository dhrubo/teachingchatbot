-- Admin approval gate for premium model access.
-- New regular signups start "pending"; only "approved" users get premium.

ALTER TABLE "User"
	ADD COLUMN IF NOT EXISTS "approvalStatus" varchar DEFAULT 'pending' NOT NULL;--> statement-breakpoint

-- Backfill: existing real (non-guest) accounts keep the access they already had.
UPDATE "User" SET "approvalStatus" = 'approved' WHERE "isAnonymous" = false;
