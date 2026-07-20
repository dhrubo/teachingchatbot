DO $$ BEGIN
 CREATE TYPE "public"."inputMode" AS ENUM('text', 'voice');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "VoiceSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid,
	"guestSessionId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL,
	"terminatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "QuestionAttempt" ADD COLUMN "inputMode" "inputMode" DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "QuestionAttempt" ADD COLUMN "transcriptionConfidence" integer;--> statement-breakpoint
ALTER TABLE "QuestionAttempt" ADD COLUMN "learnerConfirmedTranscript" boolean;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_studentId_StudentProfile_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
