CREATE TABLE IF NOT EXISTS "MissionProgress" (
  "studentId" uuid NOT NULL REFERENCES "StudentProfile"("id") ON DELETE CASCADE,
  "missionId" text NOT NULL,
  "status" varchar NOT NULL DEFAULT 'not_started',
  "phase" varchar NOT NULL DEFAULT 'intro',
  "score" integer NOT NULL DEFAULT 0,
  "challengesDone" integer NOT NULL DEFAULT 0,
  "challengesTotal" integer NOT NULL DEFAULT 0,
  "conceptCardsViewed" integer NOT NULL DEFAULT 0,
  "lastLessonAt" timestamp,
  "completedAt" timestamp,
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("studentId", "missionId")
);
