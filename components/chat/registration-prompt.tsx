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
            Sign up free ✨
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
