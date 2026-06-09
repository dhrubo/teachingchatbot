-- Topic requests: pasted/typed topics the app could not match to a mission, so
-- an admin can see demand for curriculum gaps.

CREATE TABLE IF NOT EXISTS "TopicRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topicText" text NOT NULL,
	"normalisedText" text NOT NULL,
	"requestedByUserId" uuid,
	"requestCount" integer DEFAULT 1 NOT NULL,
	"status" varchar DEFAULT 'new' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- One row per distinct normalised topic; repeats bump requestCount.
CREATE UNIQUE INDEX IF NOT EXISTS "topic_request_normalised_idx"
	ON "TopicRequest" ("normalisedText");
