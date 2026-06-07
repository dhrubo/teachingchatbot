CREATE TABLE IF NOT EXISTS "StudentGoal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid NOT NULL,
	"topic" text,
	"description" text NOT NULL,
	"status" varchar DEFAULT 'not_started' NOT NULL,
	"confidence" varchar,
	"targetDate" timestamp,
	"notes" text,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "TopicProgress" ADD COLUMN "gcseDomain" varchar;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StudentGoal" ADD CONSTRAINT "StudentGoal_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
