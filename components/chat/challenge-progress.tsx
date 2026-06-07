"use client";

import { useActiveChat } from "@/hooks/use-active-chat";

// "Challenge N of M" pill shown above the active challenge in the AnswerPanel.
export function ChallengeProgress({ className }: { className?: string }) {
  const { challengeIndex, challengeCount } = useActiveChat();
  if (challengeCount <= 0) {
    return null;
  }
  return (
    <div className={className}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-[12px] text-primary uppercase tracking-wide">
        🎯 Challenge {Math.min(challengeIndex + 1, challengeCount)} of{" "}
        {challengeCount}
      </span>
    </div>
  );
}
