ALTER TABLE "StudentGoal" ADD COLUMN "progressPercent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "StudentGoal" ADD COLUMN "planSteps" json DEFAULT '[]'::json NOT NULL;