CREATE TABLE IF NOT EXISTS "RanedeerAccount" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" varchar NOT NULL,
	"displayName" varchar(64) NOT NULL,
	"username" varchar(48) NOT NULL,
	"email" varchar(160),
	"passwordHash" text,
	"pinHash" text,
	"learnerId" uuid,
	"watcherCode" varchar(12),
	"invitedParentEmail" varchar(160),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "RanedeerAccount_username_unique" UNIQUE("username"),
	CONSTRAINT "RanedeerAccount_email_unique" UNIQUE("email"),
	CONSTRAINT "RanedeerAccount_watcherCode_unique" UNIQUE("watcherCode")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RanedeerGuardianLink" (
	"parentAccountId" uuid NOT NULL,
	"learnerId" uuid NOT NULL,
	"relationship" varchar DEFAULT 'watcher_code' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "RanedeerGuardianLink_parentAccountId_learnerId_pk" PRIMARY KEY("parentAccountId","learnerId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RanedeerQuizAttempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learnerId" uuid NOT NULL,
	"topicSlug" varchar(96) NOT NULL,
	"status" varchar DEFAULT 'in_progress' NOT NULL,
	"totalQuestions" integer DEFAULT 5 NOT NULL,
	"currentIndex" integer DEFAULT 0 NOT NULL,
	"correctCount" integer DEFAULT 0 NOT NULL,
	"scorePercent" integer DEFAULT 0 NOT NULL,
	"tabSwitchCount" integer DEFAULT 0 NOT NULL,
	"pasteCount" integer DEFAULT 0 NOT NULL,
	"rapidGuessCount" integer DEFAULT 0 NOT NULL,
	"hintsUsed" integer DEFAULT 0 NOT NULL,
	"integrityFlags" json DEFAULT '[]'::json NOT NULL,
	"questionsJson" json DEFAULT '[]'::json NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RanedeerAccount" ADD CONSTRAINT "RanedeerAccount_learnerId_RanedeerLearner_id_fk" FOREIGN KEY ("learnerId") REFERENCES "public"."RanedeerLearner"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RanedeerGuardianLink" ADD CONSTRAINT "RanedeerGuardianLink_parentAccountId_RanedeerAccount_id_fk" FOREIGN KEY ("parentAccountId") REFERENCES "public"."RanedeerAccount"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RanedeerGuardianLink" ADD CONSTRAINT "RanedeerGuardianLink_learnerId_RanedeerLearner_id_fk" FOREIGN KEY ("learnerId") REFERENCES "public"."RanedeerLearner"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RanedeerQuizAttempt" ADD CONSTRAINT "RanedeerQuizAttempt_learnerId_RanedeerLearner_id_fk" FOREIGN KEY ("learnerId") REFERENCES "public"."RanedeerLearner"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
