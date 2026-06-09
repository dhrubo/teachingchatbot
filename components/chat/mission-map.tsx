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

  return (
    <div className="relative py-4">
      <div className="absolute left-[17px] right-[17px] top-8 h-[3px] rounded-full bg-border/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 transition-all duration-500"
          style={{
            width: `${
              missions.length > 0
                ? (
                    (missions.findIndex((m) => m.id === currentMissionId) + 1) /
                      missions.length
                  ) * 100
                : 0
            }%`,
          }}
        />
      </div>
      <div className="flex justify-between">
        {missions.map((mission, index) => {
          const isCompleted = completedMissions.includes(mission.id);
          const isCurrent = mission.id === currentMissionId;
          const prevCompleted =
            index === 0 ||
            completedMissions.includes(missions[index - 1]?.id ?? "");
          const isLocked = !isCompleted && !isCurrent && !prevCompleted;

          return (
            <motion.button
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all",
                isLocked && "cursor-not-allowed opacity-40",
                !isLocked && "cursor-pointer hover:scale-105"
              )}
              disabled={isLocked}
              key={mission.id}
              onClick={() => onSelect?.(mission)}
              whileHover={isLocked ? undefined : { y: -2 }}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-base transition-all duration-300",
                  isCompleted &&
                    "border-green-500 bg-green-500/20 text-green-400",
                  isCurrent &&
                    "border-primary bg-primary/20 text-primary shadow-[0_0_16px] shadow-primary/40",
                  !isCompleted &&
                    !isCurrent &&
                    "border-border/30 bg-muted/10 text-muted-foreground/40"
                )}
              >
                {isCompleted ? "✓" : (mission.emoji ?? index + 1)}
              </div>
              <span
                className={cn(
                  "max-w-[60px] text-center text-[10px] leading-tight",
                  isCompleted && "text-green-400",
                  isCurrent && "font-semibold text-primary",
                  !isCompleted && !isCurrent && "text-muted-foreground/40"
                )}
              >
                {mission.title}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
