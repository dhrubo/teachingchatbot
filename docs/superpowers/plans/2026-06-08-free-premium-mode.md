# FREE/PREMIUM Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add APP_MODE env var, server-enforced guest limits, config API, and deterministic registration messaging.

**Architecture:** Server config module (`lib/app-config.ts`) reads env vars at module load. `GET /api/app/config` returns config + per-user question count. Client hook `useAppConfig()` fetches via SWR. Q4/Q5 registration messaging is a React component (not prompt-based). Guest limits read from config instead of hardcoded values.

**Tech Stack:** Next.js API route, SWR, existing entitlements/cron/rate-limit infra.

---

### Task 1: Create server config module

**Files:**
- Create: `lib/app-config.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/app-config.ts
// Reads env vars at module load. Never re-reads (env vars are stable across
// a deployment). Every consumer reads from this single module.

export type AppMode = "FREE" | "PREMIUM";

export type AppConfig = {
  mode: AppMode;
  freeChatRetentionHours: number;
  guestDailyQuestionLimit: number;
};

let cached: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (cached) return cached;
  cached = {
    mode: (process.env.APP_MODE as AppMode) ?? "FREE",
    freeChatRetentionHours: Number(process.env.FREE_CHAT_RETENTION_HOURS) || 24,
    guestDailyQuestionLimit: Number(process.env.GUEST_DAILY_QUESTION_LIMIT) || 5,
  };
  return cached;
}
```

### Task 2: Create config API endpoint

**Files:**
- Create: `app/api/app/config/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/api/app/config/route.ts
// Returns server config + per-user question count. The client uses this to
// adapt the UI (show registration cards, gate features).

import { auth } from "@/app/(auth)/auth";
import { getAppConfig } from "@/lib/app-config";
import { getMessageCountByUserId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const config = getAppConfig();
  const isGuest = session.user.type === "guest";

  // Count user messages in the last 24h (for guest daily limit).
  const questionsUsed = await getMessageCountByUserId({
    id: session.user.id,
    differenceInHours: 24,
  });

  return Response.json({
    mode: config.mode,
    isGuest,
    questionLimit: isGuest ? config.guestDailyQuestionLimit : null,
    questionsUsed,
    retentionHours: isGuest ? config.freeChatRetentionHours : null,
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `tsc --noEmit`
Expected: exit 0, no errors.

### Task 3: Create client hook

**Files:**
- Create: `hooks/use-app-config.ts`

- [ ] **Step 1: Create the file**

```typescript
// hooks/use-app-config.ts
// Client hook that fetches server config via SWR. Cached for 1 minute.

"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/utils";

export type AppConfigResponse = {
  mode: "FREE" | "PREMIUM";
  isGuest: boolean;
  questionLimit: number | null;
  questionsUsed: number;
  retentionHours: number | null;
};

export function useAppConfig() {
  const { data, error, isLoading } = useSWR<AppConfigResponse>(
    "/api/app/config",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    config: data,
    isLoading,
    error,
  };
}
```

### Task 4: Update entitlements to read from config

**Files:**
- Modify: `lib/ai/entitlements.ts`
- Modify: `app/(chat)/api/chat/route.ts`

- [ ] **Step 1: Rewrite entitlements as a function**

Replace the const object with a function that reads from `getAppConfig()`:

```typescript
// lib/ai/entitlements.ts
import type { UserType } from "@/app/(auth)/auth";
import { getAppConfig } from "@/lib/app-config";

type Entitlements = {
  maxMessagesPerHour: number;
};

export function getEntitlements(userType: UserType): Entitlements {
  const config = getAppConfig();
  return {
    maxMessagesPerHour:
      userType === "guest" ? config.guestDailyQuestionLimit : 10,
  };
}
```

- [ ] **Step 2: Update route.ts to use the function**

In `app/(chat)/api/chat/route.ts`, change:

```typescript
import { entitlementsByUserType } from "@/lib/ai/entitlements";
```

to:

```typescript
import { getEntitlements } from "@/lib/ai/entitlements";
```

And change line 147:

```typescript
if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
```

to:

```typescript
if (messageCount > getEntitlements(userType).maxMessagesPerHour) {
```

- [ ] **Step 3: Verify it compiles**

Run: `tsc --noEmit`
Expected: exit 0, no errors.

### Task 5: Update guest cleanup cron

**Files:**
- Modify: `app/(chat)/api/cron/cleanup-guests/route.ts`

- [ ] **Step 1: Read retention hours from config**

```typescript
// app/(chat)/api/cron/cleanup-guests/route.ts
import type { NextRequest } from "next/server";
import { getAppConfig } from "@/lib/app-config";
import { deleteExpiredGuestChats } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const config = getAppConfig();
  const result = await deleteExpiredGuestChats({
    olderThanHours: config.freeChatRetentionHours,
  });

  return Response.json(result, { status: 200 });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `tsc --noEmit`
Expected: exit 0, no errors.

### Task 6: Create registration prompt component

**Files:**
- Create: `components/chat/registration-prompt.tsx`
- Modify: `components/chat/multimodal-input.tsx` (line ~424, between AnswerPanel and PromptInput)

- [ ] **Step 1: Write the component**

```typescript
// components/chat/registration-prompt.tsx
// Deterministic Q4/Q5 registration messaging for guests. Shows a soft nudge
// at question 4 and a stop card at question 5+. Replaces the prompt-based
// conversational nudge with a React component.

"use client";

import Link from "next/link";
import { useAppConfig } from "@/hooks/use-app-config";

export function RegistrationPrompt() {
  const { config, isLoading } = useAppConfig();

  if (isLoading || !config) return null;
  if (!config.isGuest) return null;
  if (config.questionLimit === null) return null;

  const used = config.questionsUsed;
  const limit = config.questionLimit;
  const remaining = limit - used;

  // Q1-Q3: silent
  if (remaining > 1 || used < 4) return null;

  // Q5+: stop card
  if (remaining <= 0 || used >= limit) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-amber-200/40 bg-amber-50/80 p-4 text-center shadow-sm dark:border-amber-800/30 dark:bg-amber-900/20">
        <p className="mb-2 text-sm font-medium text-amber-900 dark:text-amber-200">
          You&apos;ve used today&apos;s free questions
        </p>
        <p className="mb-4 text-xs text-amber-700 dark:text-amber-300/80">
          Come back tomorrow, or register to unlock saved progress and
          continued learning.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded-full bg-[image:var(--gradient-sunset)] px-4 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-full px-4 py-1.5 text-sm text-amber-700 underline underline-offset-2 hover:text-amber-600 dark:text-amber-300/70"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // Q4: soft nudge
  if (used === 4) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-amber-200/20 bg-amber-50/50 p-3 text-center shadow-sm dark:border-amber-800/20 dark:bg-amber-900/10">
        <p className="text-xs text-amber-700 dark:text-amber-300/70">
          You&apos;re doing well.{" "}
          <Link
            href="/register"
            className="font-medium underline underline-offset-2 hover:text-amber-600"
          >
            Create a free account
          </Link>{" "}
          to save your progress and continue learning later.
        </p>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Integrate into MultimodalInput**

In `components/chat/multimodal-input.tsx`, import and render `RegistrationPrompt` between `AnswerPanel` and `PromptInput`.

At the top, add the import:

```typescript
import { RegistrationPrompt } from "./registration-prompt";
```

In the JSX, after `<AnswerPanel />` (around line 424) and before `<PromptInput>` (around line 426):

```tsx
      <AnswerPanel />
      <RegistrationPrompt />
      <PromptInput
```

- [ ] **Step 3: Verify it compiles**

Run: `tsc --noEmit`
Expected: exit 0, no errors.

### Task 7: Update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add new env vars**

Add to the "Optional Storage & Cron" section or a new "Mode & Limits" section:

```
# ──────────────────────────────────────────────
# Mode & Limits
# ──────────────────────────────────────────────

# APP_MODE=FREE (default) — guests see 5 questions/day, 24h retention, no history.
# APP_MODE=PREMIUM — gates future features (admin dashboards, approval workflows).
APP_MODE=FREE

# How long guest chat history is kept before auto-cleanup (hours).
FREE_CHAT_RETENTION_HOURS=24

# Maximum questions a guest can answer per day.
GUEST_DAILY_QUESTION_LIMIT=5
```

### Task 8: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Free Mode Limitations section**

Append a section to `README.md`:

```markdown
## Free Mode Limitations

When `APP_MODE=FREE` (the default), guest users (not signed in) have limited
access:

- **5 questions per day** — after reaching the limit, guests are prompted to
  sign up or come back the next day.
- **1 conversation** — the current chat session; previous chats are not
  retained.
- **24-hour chat retention** — guest conversations are auto-cleaned after
  24 hours.
- **No history sidebar** — guests cannot browse previous conversations.
- **No admin or parent dashboards** — these features are available only in
  PREMIUM mode.

Set `APP_MODE=PREMIUM` in your environment to unlock all features for all
users (registered user features remain unchanged; guest limits still apply).
```

### Task 9: Verify everything compiles and tests pass

- [ ] **Step 1: Run TypeScript compiler**

Run: `tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 2: Run unit tests**

Run: `pnpm test:unit`
Expected: all 63+ tests pass.

- [ ] **Step 3: Check for any unused import warnings**

Run: `pnpm run lint` (or the project's lint command)
Expected: no warnings.

---

## Self-Review Checklist

**1. Spec coverage:**
- `APP_MODE` env var → Task 1 (config module) + Task 7 (.env.example) ✓
- Guest 24h cleanup reads from config → Task 5 ✓
- Guest 5-question daily limit from config → Task 4 (entitlements) ✓
- Config API endpoint → Task 2 ✓
- Client hook → Task 3 ✓
- Q4/Q5 registration messaging → Task 6 ✓
- README update → Task 8 ✓

**2. Placeholder scan:**
No TBDs, TODOs, or "implement later" found. All code is complete.

**3. Type consistency:**
- `AppConfig` interface in Task 1 matches the response shape in Task 2 ✓
- `getEntitlements(userType)` in Task 4 matches the call site in route.ts ✓
- `useAppConfig()` return type `AppConfigResponse` in Task 3 matches `/api/app/config` response in Task 2 ✓
- `deleteExpiredGuestChats({ olderThanHours })` signature in Task 5 matches existing signature ✓
