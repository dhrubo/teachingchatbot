CREATE TABLE IF NOT EXISTS "RevisionQueue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid NOT NULL,
	"subject" text DEFAULT 'maths' NOT NULL,
	"skillSlug" text NOT NULL,
	"masteryScore" integer DEFAULT 0 NOT NULL,
	"confidence" integer DEFAULT 3 NOT NULL,
	"intervalDays" integer DEFAULT 1 NOT NULL,
	"nextReviewDate" timestamp NOT NULL,
	"reviewCount" integer DEFAULT 0 NOT NULL,
	"lastReviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StudentConfidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid NOT NULL,
	"subject" text NOT NULL,
	"topic" text,
	"skillSlug" text NOT NULL,
	"confidence" integer NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StudentWeaknessProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid NOT NULL,
	"subject" text DEFAULT 'maths' NOT NULL,
	"topic" text,
	"skillSlug" text NOT NULL,
	"misconception" text NOT NULL,
	"frequency" integer DEFAULT 1 NOT NULL,
	"confidence" integer DEFAULT 3 NOT NULL,
	"evidenceJson" json DEFAULT '{}'::json,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StudentProfile" ADD COLUMN "preferredExplanationStyle" varchar;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RevisionQueue" ADD CONSTRAINT "RevisionQueue_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StudentConfidence" ADD CONSTRAINT "StudentConfidence_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StudentWeaknessProfile" ADD CONSTRAINT "StudentWeaknessProfile_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
