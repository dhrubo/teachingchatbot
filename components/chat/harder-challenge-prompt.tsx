"use client";

import { useActiveChat } from "@/hooks/use-active-chat";

export function HarderChallengePrompt() {
  const { canRequestHarder, requestHarderChallenge } = useActiveChat();

  if (!canRequestHarder) return null;

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-emerald-200/40 bg-emerald-50/80 p-4 text-center shadow-sm dark:border-emerald-800/30 dark:bg-emerald-900/20">
      <p className="mb-1 text-sm font-medium text-emerald-900 dark:text-emerald-200">
        All correct! 🎉
      </p>
      <p className="mb-4 text-xs text-emerald-700 dark:text-emerald-300/80">
        You nailed every question. Want a tougher challenge on the same topic?
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={requestHarderChallenge}
          className="rounded-full bg-[image:var(--gradient-sunset)] px-4 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Challenge me harder 🚀
        </button>
      </div>
    </div>
  );
}
