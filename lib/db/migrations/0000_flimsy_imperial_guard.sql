CREATE TABLE IF NOT EXISTS "RanedeerDailyPracticeLog" (
	"learnerId" uuid NOT NULL,
	"practiceDate" varchar(10) NOT NULL,
	"minutesPracticed" integer DEFAULT 0 NOT NULL,
	"xpEarned" integer DEFAULT 0 NOT NULL,
	"turnsCompleted" integer DEFAULT 0 NOT NULL,
	"usedFreeze" boolean DEFAULT false NOT NULL,
	CONSTRAINT "RanedeerDailyPracticeLog_learnerId_practiceDate_pk" PRIMARY KEY("learnerId","practiceDate")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RanedeerLearner" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nickname" varchar(48) DEFAULT 'Scholar' NOT NULL,
	"tier" varchar DEFAULT 'foundation' NOT NULL,
	"targetGrade" integer DEFAULT 5 NOT NULL,
	"preferredLens" varchar DEFAULT 'visual' NOT NULL,
	"toneStyle" varchar DEFAULT 'encouraging' NOT NULL,
	"speechSpeed" varchar(8) DEFAULT '1.0' NOT NULL,
	"dailyGoalMinutes" integer DEFAULT 5 NOT NULL,
	"reminderEnabled" boolean DEFAULT false NOT NULL,
	"reminderHour" integer DEFAULT 17 NOT NULL,
	"reminderMinute" integer DEFAULT 0 NOT NULL,
	"timezone" varchar(64) DEFAULT 'Europe/London' NOT NULL,
	"currentStreak" integer DEFAULT 0 NOT NULL,
	"longestStreak" integer DEFAULT 0 NOT NULL,
	"streakFreezes" integer DEFAULT 1 NOT NULL,
	"lastPracticedDate" varchar(10),
	"totalXp" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RanedeerPushSubscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learnerId" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"userAgent" text,
	"lastNotifiedDate" varchar(10),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RanedeerTopicProgress" (
	"learnerId" uuid NOT NULL,
	"topicSlug" varchar(96) NOT NULL,
	"masteryScore" integer DEFAULT 0 NOT NULL,
	"currentStage" varchar(32) DEFAULT '1.1' NOT NULL,
	"lensesTried" json DEFAULT '[]'::json NOT NULL,
	"questionsAnswered" integer DEFAULT 0 NOT NULL,
	"questionsCorrect" integer DEFAULT 0 NOT NULL,
	"intervalDays" integer DEFAULT 1 NOT NULL,
	"nextReviewAt" timestamp,
	"lastStudiedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "RanedeerTopicProgress_learnerId_topicSlug_pk" PRIMARY KEY("learnerId","topicSlug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RanedeerTutorSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learnerId" uuid NOT NULL,
	"topicSlug" varchar(96) NOT NULL,
	"activeLens" varchar DEFAULT 'visual' NOT NULL,
	"stage" varchar(32) DEFAULT '1.1' NOT NULL,
	"turnsJson" json DEFAULT '[]'::json NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RanedeerDailyPracticeLog" ADD CONSTRAINT "RanedeerDailyPracticeLog_learnerId_RanedeerLearner_id_fk" FOREIGN KEY ("learnerId") REFERENCES "public"."RanedeerLearner"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RanedeerPushSubscription" ADD CONSTRAINT "RanedeerPushSubscription_learnerId_RanedeerLearner_id_fk" FOREIGN KEY ("learnerId") REFERENCES "public"."RanedeerLearner"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RanedeerTopicProgress" ADD CONSTRAINT "RanedeerTopicProgress_learnerId_RanedeerLearner_id_fk" FOREIGN KEY ("learnerId") REFERENCES "public"."RanedeerLearner"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RanedeerTutorSession" ADD CONSTRAINT "RanedeerTutorSession_learnerId_RanedeerLearner_id_fk" FOREIGN KEY ("learnerId") REFERENCES "public"."RanedeerLearner"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
