CREATE TABLE IF NOT EXISTS "QuestionInstance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid,
	"guestSessionId" text,
	"archetypeId" uuid NOT NULL,
	"skillSlug" text NOT NULL,
	"difficultyBand" "difficultyBand" NOT NULL,
	"questionType" "questionType" DEFAULT 'short_text' NOT NULL,
	"prompt" text NOT NULL,
	"optionsJson" json,
	"correctAnswer" text NOT NULL,
	"rulesJson" json DEFAULT '{}'::json NOT NULL,
	"misconceptionTagsJson" json DEFAULT '[]'::json NOT NULL,
	"hint" text,
	"explanation" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"submittedAt" timestamp,
	"submittedIdempotencyKey" text
);
--> statement-breakpoint
ALTER TABLE "QuestionAttempt" ADD COLUMN "questionInstanceId" uuid;--> statement-breakpoint
ALTER TABLE "StudentWeaknessProfile" ADD COLUMN "status" varchar DEFAULT 'tentative' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionInstance" ADD CONSTRAINT "QuestionInstance_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionInstance" ADD CONSTRAINT "QuestionInstance_archetypeId_QuestionArchetype_id_fk" FOREIGN KEY ("archetypeId") REFERENCES "public"."QuestionArchetype"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionInstanceId_QuestionInstance_id_fk" FOREIGN KEY ("questionInstanceId") REFERENCES "public"."QuestionInstance"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
