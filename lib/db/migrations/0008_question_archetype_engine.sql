-- GCSE-style adaptive question archetype engine.
-- Replaces the first-pass QuestionArchetype/StudentSkillMastery shape (created in
-- 0006) with the richer archetype model: generic answerExpression evaluation,
-- variable schemas, GCSE metadata, a generated-question cache and attempt log.
-- These tables hold no production data yet, so a drop/recreate is safe.

CREATE TYPE "public"."questionType" AS ENUM('short_text', 'multiple_choice', 'numeric', 'algebraic');--> statement-breakpoint

-- Drop the old archetype + mastery tables (and their FKs) so we can recreate them.
DROP TABLE IF EXISTS "QuestionArchetype" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "StudentSkillMastery" CASCADE;--> statement-breakpoint

-- LessonSkill no longer hard-references Skill.slug (archetypes carry their own
-- skillSlug). Drop the FK if it exists so seeding can run without a full Skill table.
ALTER TABLE "LessonSkill" DROP CONSTRAINT IF EXISTS "LessonSkill_skillSlug_Skill_slug_fk";--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "QuestionArchetype" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"subject" text DEFAULT 'maths' NOT NULL,
	"yearGroup" integer NOT NULL,
	"missionSlug" text NOT NULL,
	"lessonSlug" text NOT NULL,
	"skillSlug" text NOT NULL,
	"gcseDomain" text NOT NULL,
	"difficultyBand" "difficultyBand" NOT NULL,
	"questionType" "questionType" DEFAULT 'short_text' NOT NULL,
	"template" text NOT NULL,
	"variableSchemaJson" json DEFAULT '{}'::json NOT NULL,
	"answerExpression" text NOT NULL,
	"acceptableAnswerRulesJson" json DEFAULT '{}'::json NOT NULL,
	"hintTemplate" text,
	"explanationTemplate" text,
	"misconceptionTagsJson" json DEFAULT '[]'::json NOT NULL,
	"sourceStyle" text,
	"calculatorAllowed" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "QuestionArchetype_slug_unique" UNIQUE("slug")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "qarch_lookup_idx"
	ON "QuestionArchetype" ("subject", "yearGroup", "missionSlug", "lessonSlug", "skillSlug", "difficultyBand", "isActive");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "GeneratedQuestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"archetypeId" uuid NOT NULL,
	"variablesJson" json DEFAULT '{}'::json NOT NULL,
	"prompt" text NOT NULL,
	"optionsJson" json,
	"correctAnswer" text NOT NULL,
	"hint" text,
	"explanation" text,
	"difficultyBand" "difficultyBand" NOT NULL,
	"promptHash" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "GeneratedQuestion_promptHash_unique" UNIQUE("promptHash")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "StudentSkillMastery" (
	"studentId" uuid NOT NULL,
	"skillSlug" text NOT NULL,
	"masteryScore" integer DEFAULT 0 NOT NULL,
	"currentBand" "difficultyBand" DEFAULT 'must' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"recentCorrectStreak" integer DEFAULT 0 NOT NULL,
	"recentWrongStreak" integer DEFAULT 0 NOT NULL,
	"lastAttemptAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "StudentSkillMastery_studentId_skillSlug_pk" PRIMARY KEY("studentId","skillSlug")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "QuestionAttempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid,
	"guestSessionId" text,
	"questionId" uuid,
	"archetypeId" uuid NOT NULL,
	"skillSlug" text NOT NULL,
	"difficultyBand" "difficultyBand" NOT NULL,
	"prompt" text NOT NULL,
	"studentAnswer" text NOT NULL,
	"correctAnswer" text NOT NULL,
	"isCorrect" boolean NOT NULL,
	"timeTakenMs" integer,
	"misconceptionTag" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "qattempt_student_skill_idx"
	ON "QuestionAttempt" ("studentId", "skillSlug", "createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qattempt_guest_idx"
	ON "QuestionAttempt" ("guestSessionId", "createdAt");--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "GeneratedQuestion" ADD CONSTRAINT "GeneratedQuestion_archetypeId_QuestionArchetype_id_fk" FOREIGN KEY ("archetypeId") REFERENCES "public"."QuestionArchetype"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StudentSkillMastery" ADD CONSTRAINT "StudentSkillMastery_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionId_GeneratedQuestion_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."GeneratedQuestion"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_archetypeId_QuestionArchetype_id_fk" FOREIGN KEY ("archetypeId") REFERENCES "public"."QuestionArchetype"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
