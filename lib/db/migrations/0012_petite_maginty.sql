DO $$ BEGIN
 CREATE TYPE "public"."questionType" AS ENUM('short_text', 'multiple_choice', 'numeric', 'algebraic');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
);
--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TopicRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topicText" text NOT NULL,
	"normalisedText" text NOT NULL,
	"requestedByUserId" uuid,
	"requestCount" integer DEFAULT 1 NOT NULL,
	"status" varchar DEFAULT 'new' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "LessonSkill" DROP CONSTRAINT "LessonSkill_skillSlug_Skill_slug_fk";
--> statement-breakpoint
ALTER TABLE "QuestionArchetype" DROP CONSTRAINT "QuestionArchetype_skillSlug_Skill_slug_fk";
--> statement-breakpoint
ALTER TABLE "StudentSkillMastery" DROP CONSTRAINT "StudentSkillMastery_skillSlug_Skill_slug_fk";
--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'QuestionArchetype'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "QuestionArchetype" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "subject" text DEFAULT 'maths' NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "yearGroup" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "missionSlug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "lessonSlug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "gcseDomain" text NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "questionType" "questionType" DEFAULT 'short_text' NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "variableSchemaJson" json DEFAULT '{}'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "answerExpression" text NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "acceptableAnswerRulesJson" json DEFAULT '{}'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "hintTemplate" text;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "explanationTemplate" text;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "misconceptionTagsJson" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "sourceStyle" text;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "calculatorAllowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "StudentSkillMastery" ADD COLUMN "lastAttemptAt" timestamp;--> statement-breakpoint
ALTER TABLE "StudentSkillMastery" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "approvalStatus" varchar DEFAULT 'pending' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "GeneratedQuestion" ADD CONSTRAINT "GeneratedQuestion_archetypeId_QuestionArchetype_id_fk" FOREIGN KEY ("archetypeId") REFERENCES "public"."QuestionArchetype"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionId_GeneratedQuestion_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."GeneratedQuestion"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_archetypeId_QuestionArchetype_id_fk" FOREIGN KEY ("archetypeId") REFERENCES "public"."QuestionArchetype"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "QuestionArchetype" DROP COLUMN IF EXISTS "variables";--> statement-breakpoint
ALTER TABLE "QuestionArchetype" DROP COLUMN IF EXISTS "misconceptionTags";--> statement-breakpoint
ALTER TABLE "QuestionArchetype" ADD CONSTRAINT "QuestionArchetype_slug_unique" UNIQUE("slug");