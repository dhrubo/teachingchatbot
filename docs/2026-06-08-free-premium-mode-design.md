# FREE/PREMIUM Mode Design

## Overview

Server-enforced FREE/PREMIUM mode toggle. FREE mode affects guest users only
(24h chat expiry, 1 conversation, no sidebar history, 5-question daily limit).
Registered users always get full features. `APP_MODE=PREMIUM` gates future
features (admin dashboard, parent dashboard, approval workflows) — currently
a no-op for registered users.

## Architecture

```
.env                        lib/app-config.ts          GET /api/app/config
APP_MODE=FREE ──────────► reads env vars ──────────► returns config
FREE_CHAT_RETENTION_HOURS   cached at module load       filtered by user type
GUEST_DAILY_QUESTION_LIMIT  never re-reads                                       
                                       
                                                        │
                                   ┌────────────────────┤
                                   ▼                    ▼
                           hooks/use-app-config.ts   entitlements.ts
                           SWR, 1min dedupe          rate limits
                                   │                   
                                   ▼                   
                           Components (sidebar, header, messaging)
```

## Files

### 1. `lib/app-config.ts` — Server Config Module

Reads env vars at module load. Never re-reads (env vars don't change mid-deployment).

```typescript
export type AppMode = "FREE" | "PREMIUM";

export type AppConfig = {
  mode: AppMode;
  freeChatRetentionHours: number;
  guestDailyQuestionLimit: number;
};

export function getAppConfig(): AppConfig {
  return {
    mode: (process.env.APP_MODE as AppMode) ?? "FREE",
    freeChatRetentionHours: Number(process.env.FREE_CHAT_RETENTION_HOURS) || 24,
    guestDailyQuestionLimit: Number(process.env.GUEST_DAILY_QUESTION_LIMIT) || 5,
  };
}
```

### 2. `app/api/app/config/route.ts` — Config API Endpoint

- Requires auth (session)
- Returns config + current question count for the user
- Guests see: their limits, mode
- Registered users see: mode, no limits

Response shape:
```typescript
{
  mode: "FREE" | "PREMIUM";
  isGuest: boolean;
  questionLimit: number | null;  // 5 for guests, null for registered
  questionsUsed: number;         // count from getMessageCountByUserId (24h window)
  retentionHours: number;        // 24 (guests only)
}
```

### 3. `hooks/use-app-config.ts` — Client Hook

```typescript
function useAppConfig() {
  return useSWR("/api/app/config", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}
```

### 4. `lib/ai/entitlements.ts` — Read from Config

Replace hardcoded `maxMessagesPerHour: 10` with value from `getAppConfig()`.
Guest limit = `guestDailyQuestionLimit` (env var). Regular limit stays at 10/hr.

### 5. `lib/db/queries/chat.ts` — Retention Hours from Config

`deleteExpiredGuestChats()` currently hardcodes `olderThanHours = 24`.
Read from `getAppConfig().freeChatRetentionHours` instead.

### 6. `app/(chat)/api/chat/route.ts` — Question Limit from Config

Rate limit check reads `entitlementsByUserType[userType].maxMessagesPerHour`
from the updated entitlements module (which reads config).

### 7. `components/chat/sidebar-history.tsx` — App Mode Gate

Currently gates on `user.type === "guest"`. Keeps that logic — guests always
see the "Login to save..." prompt. Registered users always see full history.
No change needed for FREE vs PREMIUM (registered users always get full features).

### 8. **New: `components/chat/registration-prompt.tsx`** — Deterministic Q4/Q5

Reads `questionsUsed` and `questionLimit` from `useAppConfig()`.

Shows inline cards above the answer panel:

- **Q4**: "You're doing well. Create a free account to save your progress and continue learning later." with a subtle "Sign up" button.
- **Q5**: "You've used today's free questions. Come back tomorrow, or register to unlock saved progress and continued learning." with prominent sign-up buttons. No chat input below this (rate limit enforced server-side).

This replaces the conversational prompt-based nudge.

### 9. `app/(chat)/api/cron/cleanup-guests/route.ts` — Configurable Retention

Reads `freeChatRetentionHours` from `getAppConfig()` instead of hardcoded 24.

### 10. `.env.example` — New Vars

```
APP_MODE=FREE
FREE_CHAT_RETENTION_HOURS=24
GUEST_DAILY_QUESTION_LIMIT=5
```

### 11. `README.md` — Free Mode Limitations Section

As specified: 5 questions/day for guests, 1 conversation, 24h retention,
no dashboards, no approval workflow.

## Registration Messaging

| Question | Action | Trigger |
|----------|--------|---------|
| 1-3 | Silent | No UI |
| 4 | Soft nudge card | `questionsUsed === 4` |
| 5+ | Stop card + rate limit | `questionsUsed >= 5` |

The rate limit check in `route.ts` already returns a 429 `ChatbotError`
("You've reached the message limit.") — this error surfaces as a toast
on the client. The Q5 card intercepts this visually so the user sees a
friendly message instead of a raw error toast.

## Edge Cases

- **Guest returns after 24h**: conversations cleaned up, new session starts.
  `useAppConfig()` returns `questionsUsed: 0` because old messages were purged.
- **Guest registers mid-session**: session continues (existing flow). Q4/Q5 cards
  disappear because `isGuest` becomes false.
- **APP_MODE unset**: defaults to FREE (safe default).
- **Retention hours = 0**: disables cleanup (for deployments that want persistent guests).
