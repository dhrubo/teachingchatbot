CREATE TABLE IF NOT EXISTS "AiCall" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid,
	"purpose" varchar(64) NOT NULL,
	"modelUsed" varchar(64) NOT NULL,
	"promptTokens" integer NOT NULL,
	"completionTokens" integer NOT NULL,
	"estimatedTokensSaved" integer DEFAULT 0 NOT NULL,
	"cachedResponseUsed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StudentMisconception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid NOT NULL,
	"skillSlug" text NOT NULL,
	"misconception" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "WeeklyReport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid NOT NULL,
	"summaryText" text NOT NULL,
	"startOfWeek" timestamp NOT NULL,
	"endOfWeek" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StudentProfile" ADD COLUMN "selectedSubjects" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "StudentProfile" ADD COLUMN "examBoard" varchar(32) DEFAULT 'Unspecified' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AiCall" ADD CONSTRAINT "AiCall_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StudentMisconception" ADD CONSTRAINT "StudentMisconception_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
