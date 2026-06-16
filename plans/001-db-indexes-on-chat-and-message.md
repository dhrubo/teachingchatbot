# Plan 001: Add DB indexes on `Chat.userId` and `Message_v2.chatId`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9886b6f..HEAD -- lib/db/schema.ts lib/db/migrations/`
> If any file changed, compare the schema excerpts below against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `9886b6f`, 2026-06-10

## Why this matters

Every page load and API call that reads chat history or messages performs a
sequential scan on `Chat` (filtering by `userId`) and/or `Message_v2` (filtering
by `chatId`). With hundreds of chats per user, this adds 10–100ms per request.
The sidebar history panel, chat-API message loading, guest cleanup cron, and
rate-limit checks all hit these unindexed columns. Adding two B-tree indexes
cuts this to logarithmic lookups with zero application code changes.

## Current state

The `Chat` table (defined in `lib/db/migrations/0000_initial.sql:13-19`) has
`userId` as an FK column with no index:

```sql
CREATE TABLE IF NOT EXISTS "Chat" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp NOT NULL,
  "title" text NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "visibility" varchar NOT NULL DEFAULT 'private'
);
```

The `Message_v2` table (lines 21-28) has `chatId` with no index:

```sql
CREATE TABLE IF NOT EXISTS "Message_v2" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
  "role" varchar NOT NULL,
  "parts" json NOT NULL,
  "attachments" json NOT NULL,
  "createdAt" timestamp NOT NULL
);
```

Affected query paths (all in `lib/db/queries/chat.ts`):
- `getChatsByUserId` — `WHERE userId = ? ORDER BY createdAt DESC`
- `getMessagesByChatId` — `WHERE chatId = ? ORDER BY createdAt ASC`
- `getChatById` — `WHERE id = ?`
- `getMessageCountByUserId` — `WHERE userId = ?`
- `deleteExpiredGuestChats` — `WHERE createdAt < ?` (joins through Chat to User)

The Drizzle schema is in `lib/db/schema.ts`. Migrations live in
`lib/db/migrations/` as numbered SQL files.

## Commands you will need

| Purpose   | Command                                         | Expected on success |
|-----------|-------------------------------------------------|---------------------|
| Install   | `pnpm install`                                  | exit 0              |
| Typecheck | `npx tsc --noEmit`                              | exit 0, no errors   |
| Tests     | `pnpm test:unit`                                | 104/104 pass        |
| Build     | `pnpm build`                                    | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `lib/db/migrations/0011_chat_userId_idx.sql` (new)
- `lib/db/migrations/0011_chat_userId_message_chatId_idx.sql` (if drizzle-kit generates as two files, that's fine)

**Out of scope**:
- Any changes to `lib/db/schema.ts` — indexes are added via migration SQL only
- Modifying existing migration files
- Application query code (the indexes work transparently)

## Git workflow

- Branch: `advisor/001-db-indexes`
- Commit per step; message style: `perf: add indexes on Chat.userId and Message_v2.chatId`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create migration SQL file

Create `lib/db/migrations/0011_chat_userId_message_chatId_idx.sql` with:

```sql
-- Add indexes on hot-path foreign key columns to eliminate sequential scans.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "chat_userId_idx" ON "Chat" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "message_chatId_idx" ON "Message_v2" ("chatId");
```

**Note**: `CONCURRENTLY` requires the migration to run outside a transaction
block. If using `drizzle-kit generate`, it wraps migrations in transactions by
default — in that case, skip `CONCURRENTLY` and use plain `CREATE INDEX`. The
index builds will lock briefly on a development DB, which is acceptable.

### Step 2: Update migration journal

Open `lib/db/migrations/meta/_journal.json`. Append a new entry after the
existing idx 10 entry:

```json
{
  "idx": 11,
  "version": "7",
  "when": Date.now(),
  "tag": "0011_chat_userId_message_chatId_idx",
  "breakpoints": true
}
```

Alternatively, regenerate the journal with `pnpm db:generate` — but that may
produce diffs on the stale snapshots. The manual append is simpler and safer.

### Step 3: Apply migration

```bash
pnpm db:migrate
```

**Verify**: Check the migration output for "Applied 0011" or similar
confirmation. Then verify the indexes exist:

```bash
psql "$POSTGRES_URL" -c "\di chat_userId_idx"
psql "$POSTGRES_URL" -c "\di message_chatId_idx"
```

Both should return a table describing the index (owner, table, columns).

### Step 4: Verify no regression

```bash
pnpm test:unit
npx tsc --noEmit
pnpm build
```

All must pass.

## Test plan

No new tests needed — the indexes are transparent to application code. The
existing test suite (104/104) must still pass, confirming no regression.

## Done criteria

- [ ] `lib/db/migrations/0011_chat_userId_message_chatId_idx.sql` exists with
      the two `CREATE INDEX` statements
- [ ] `lib/db/migrations/meta/_journal.json` has idx 11 entry
- [ ] `pnpm db:migrate` applies successfully
- [ ] `psql "$POSTGRES_URL" -c "\di chat_userId_idx"` shows the index
- [ ] `psql "$POSTGRES_URL" -c "\di message_chatId_idx"` shows the index
- [ ] `pnpm test:unit` exits 0 (104/104)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm build` exits 0
- [ ] Only the migration file + journal were modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The schema at `lib/db/schema.ts` no longer defines `Chat.userId` or
  `Message_v2.chatId` as columns (the plan is obsolete).
- A migration step fails twice after retry.
- `pnpm db:migrate` reports a conflict with existing migration state.

## Maintenance notes

- These indexes are purely additive. If a future migration drops or renames
  these columns, the index must be dropped first.
- No query changes are needed — the query planner picks up indexes
  automatically.
