-- Add indexes on hot-path foreign key columns to eliminate sequential scans.
CREATE INDEX IF NOT EXISTS "chat_userId_idx" ON "Chat" ("userId");
CREATE INDEX IF NOT EXISTS "message_chatId_idx" ON "Message_v2" ("chatId");
