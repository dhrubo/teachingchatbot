"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { LessonAction } from "@/lib/learning-state-machine";

type ContentCompleteScreenProps = {
  missionTitle: string;
  missionEmoji: string;
  allowedActions: LessonAction[];
  onAction: (action: LessonAction) => void;
};

export function ContentCompleteScreen({
  missionTitle,
  missionEmoji,
  allowedActions,
  onAction,
}: ContentCompleteScreenProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
    >
      <div className="mb-4 text-4xl">{missionEmoji}</div>
      <h2 className="mb-1 text-xl font-bold text-foreground">
        You&apos;ve reached the end of this lesson.
      </h2>
      <p className="mb-8 max-w-xs text-sm text-muted-foreground">
        You&apos;ve reviewed all the concept cards for {missionTitle}. What
        would you like to do next?
      </p>
      <div className="flex w-full max-w-sm flex-col gap-2">
        {allowedActions.map((action) => {
          let label = "";
          let variant: "default" | "outline" | "ghost" = "outline";
          switch (action) {
            case "start_challenge":
              label = "Start Challenge Mode";
              variant = "default";
              break;
            case "review_mistakes":
              label = "Review Key Ideas";
              variant = "outline";
              break;
            case "choose_topic":
              label = "Choose Another Topic";
              variant = "ghost";
              break;
            case "next_mission":
              label = "Next Mission";
              variant = "outline";
              break;
            default:
              label = action.replace(/_/g, " ");
          }
          return (
            <Button
              className={
                variant === "default"
                  ? "rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
                  : "rounded-full"
              }
              key={action}
              onClick={() => onAction(action)}
              size="sm"
              variant={variant}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </motion.div>
  );
}
