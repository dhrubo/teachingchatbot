CREATE TABLE IF NOT EXISTS "CurriculumArtifact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text DEFAULT 'maths' NOT NULL,
	"yearGroup" integer NOT NULL,
	"examBoard" varchar(32) DEFAULT 'AQA' NOT NULL,
	"topic" text NOT NULL,
	"subtopic" text,
	"skillSlug" text,
	"artifactType" varchar DEFAULT 'mission' NOT NULL,
	"contentJson" json DEFAULT '{}'::json NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"generatedBy" text,
	"reviewedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
