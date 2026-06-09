"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMission } from "./mission-orchestrator";

/**
 * Clicking the SARA logo returns to the homepage. This is "Return Home", NOT
 * "Delete Session": it only resets the mission UI (closes any concept-card /
 * lesson-footer / challenge overlay) and navigates to "/". Messages, progress,
 * mastery and saved mission state are preserved.
 *
 * Note: an active full-screen challenge run is intentionally left alone — the
 * student must exit it explicitly so they don't lose a run by mis-tapping the
 * logo.
 */
export function HomeLogo({
  children,
  className,
  onNavigate,
}: {
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { phase, exitMission } = useMission();

  const handleClick = () => {
    if (phase !== "challenge") {
      exitMission();
    }
    onNavigate?.();
    router.push(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`);
  };

  return (
    <button className={className} onClick={handleClick} type="button">
      {children}
    </button>
  );
}
