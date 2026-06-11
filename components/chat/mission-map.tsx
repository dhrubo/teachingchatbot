"use client";

import { motion } from "framer-motion";
import { getMissionsByYear, type MissionDefinition } from "@/lib/ai/missions";
import { cn } from "@/lib/utils";

type MissionMapProps = {
  year: "8" | "9";
  completedMissions?: string[];
  currentMissionId?: string;
  onSelect?: (mission: MissionDefinition) => void;
};

export function MissionMap({
  year,
  completedMissions = [],
  currentMissionId,
  onSelect,
}: MissionMapProps) {
  const missions = getMissionsByYear(year);

  const lastUnlockedIndex = missions.reduce((max, m, idx) => {
    const isCompleted = completedMissions.includes(m.id);
    const isCurrent = m.id === currentMissionId;
    const prevCompleted =
      idx === 0 ||
      completedMissions.includes(missions[idx - 1]?.id ?? "");
    const isUnlocked = isCompleted || isCurrent || prevCompleted;
    return isUnlocked ? idx : max;
  }, 0);

  return (
    <div className="relative flex flex-col items-center gap-16 py-12">
      {/* Elegant, glowing connecting vertical path line */}
      <div className="absolute left-1/2 -translate-x-1/2 top-18 bottom-18 w-[5px] rounded-full bg-indigo-950/40 border border-indigo-950/20 pointer-events-none">
        <div
          className="absolute top-0 left-0 w-full rounded-full bg-gradient-to-b from-orange-500 via-amber-400 to-violet-600 transition-all duration-500 shadow-[0_0_12px_rgba(244,117,42,0.5)]"
          style={{
            height: `${
              missions.length > 1
                ? (lastUnlockedIndex / (missions.length - 1)) * 100
                : 0
            }%`,
          }}
        />
      </div>

      {missions.map((mission, index) => {
        const isCompleted = completedMissions.includes(mission.id);
        const isCurrent = mission.id === currentMissionId;
        const prevCompleted =
          index === 0 ||
          completedMissions.includes(missions[index - 1]?.id ?? "");
        const isLocked = !isCompleted && !isCurrent && !prevCompleted;

        return (
          <div
            key={mission.id}
            className={cn(
              "relative group flex flex-col items-center transition-all duration-300 z-10",
              index % 2 === 0
                ? "translate-x-8 sm:translate-x-12 md:translate-x-16"
                : "-translate-x-8 sm:-translate-x-12 md:-translate-x-16"
            )}
          >
            {/* Tooltip on Hover */}
            <div className="absolute bottom-full left-1/2 z-50 mb-3 w-48 -translate-x-1/2 scale-90 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
              <div className="rounded-xl border border-indigo-950/50 bg-[#0c0c1e]/95 p-3 text-left shadow-xl backdrop-blur-md">
                <div className="text-[9px] font-bold uppercase tracking-wider text-violet-400">
                  {mission.gcseDomain?.replace(/_/g, " ") || "MATHS"}
                </div>
                <div className="mt-1 text-xs font-semibold text-foreground">
                  {mission.title}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>⏱ {mission.estimatedMinutes || 15} mins</span>
                  <span>•</span>
                  <span className={cn(
                    isCompleted ? "text-emerald-400 font-medium" : isCurrent ? "text-orange-400 font-semibold animate-pulse" : "text-indigo-800 font-medium"
                  )}>
                    {isCompleted ? "Completed" : isCurrent ? "Active" : "Locked"}
                  </span>
                </div>
              </div>
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-[#0c0c1e]/95" />
            </div>

            {/* Pulsing ring for Active Node */}
            {isCurrent && (
              <div className="absolute inset-0 -m-1.5 rounded-full bg-orange-500/20 animate-ping z-0" />
            )}

            <motion.button
              disabled={isLocked}
              onClick={() => onSelect?.(mission)}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border-2 text-base transition-all duration-300 relative z-10 shadow-lg",
                isCompleted && "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10",
                isCurrent && "border-orange-500 bg-orange-500/20 text-orange-400 scale-110 shadow-[0_0_20px_rgba(249,115,22,0.45)] ring-4 ring-orange-500/15",
                isLocked && "opacity-45 bg-[#121225]/40 border-indigo-950 text-indigo-800 cursor-not-allowed shadow-none",
                !isLocked && !isCurrent && !isCompleted && "border-indigo-500/40 bg-indigo-950/20 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-950/40"
              )}
              whileHover={isLocked ? undefined : { scale: isCurrent ? 1.15 : 1.08 }}
              whileTap={isLocked ? undefined : { scale: 0.95 }}
            >
              {isCompleted ? "✓" : (mission.emoji ?? index + 1)}
            </motion.button>

            <span
              className={cn(
                "mt-2 text-center text-[11px] font-medium leading-tight max-w-[100px]",
                isCompleted && "text-emerald-400",
                isCurrent && "font-bold text-orange-400",
                isLocked && "text-indigo-950/40",
                !isCompleted && !isCurrent && !isLocked && "text-indigo-200/60"
              )}
            >
              {mission.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}
