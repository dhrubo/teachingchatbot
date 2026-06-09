DO $$ BEGIN
 CREATE TYPE "public"."difficultyBand" AS ENUM('must', 'should', 'could', 'gcse_bridge');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ConceptCard" (
	"id" serial PRIMARY KEY NOT NULL,
	"lessonId" integer NOT NULL,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"visual" text,
	"example" text,
	"misconception" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Lesson" (
	"id" serial PRIMARY KEY NOT NULL,
	"missionId" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"order" integer NOT NULL,
	"difficultyBand" varchar DEFAULT 'core' NOT NULL,
	"estimatedMinutes" integer NOT NULL,
	CONSTRAINT "Lesson_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LessonSkill" (
	"lessonId" integer NOT NULL,
	"skillSlug" text NOT NULL,
	CONSTRAINT "LessonSkill_lessonId_skillSlug_pk" PRIMARY KEY("lessonId","skillSlug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Mission" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"yearGroup" integer NOT NULL,
	"subject" text DEFAULT 'maths' NOT NULL,
	"gcseDomain" varchar(32) NOT NULL,
	"order" integer NOT NULL,
	"estimatedMinutes" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	CONSTRAINT "Mission_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "QuestionArchetype" (
	"slug" text PRIMARY KEY NOT NULL,
	"skillSlug" text NOT NULL,
	"difficultyBand" "difficultyBand" NOT NULL,
	"template" text NOT NULL,
	"variables" json,
	"misconceptionTags" json DEFAULT '[]'::json NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Skill" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subject" text DEFAULT 'maths' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StudentSkillMastery" (
	"studentId" uuid NOT NULL,
	"skillSlug" text NOT NULL,
	"masteryScore" integer DEFAULT 0 NOT NULL,
	"currentBand" "difficultyBand" DEFAULT 'must' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"recentCorrectStreak" integer DEFAULT 0 NOT NULL,
	"recentWrongStreak" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "StudentSkillMastery_studentId_skillSlug_pk" PRIMARY KEY("studentId","skillSlug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ConceptCard" ADD CONSTRAINT "ConceptCard_lessonId_Lesson_id_fk" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_missionId_Mission_id_fk" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LessonSkill" ADD CONSTRAINT "LessonSkill_lessonId_Lesson_id_fk" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LessonSkill" ADD CONSTRAINT "LessonSkill_skillSlug_Skill_slug_fk" FOREIGN KEY ("skillSlug") REFERENCES "public"."Skill"("slug") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionArchetype" ADD CONSTRAINT "QuestionArchetype_skillSlug_Skill_slug_fk" FOREIGN KEY ("skillSlug") REFERENCES "public"."Skill"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StudentSkillMastery" ADD CONSTRAINT "StudentSkillMastery_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StudentSkillMastery" ADD CONSTRAINT "StudentSkillMastery_skillSlug_Skill_slug_fk" FOREIGN KEY ("skillSlug") REFERENCES "public"."Skill"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
