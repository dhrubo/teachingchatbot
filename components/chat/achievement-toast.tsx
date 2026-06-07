"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useActiveChat } from "@/hooks/use-active-chat";
import { playSound } from "@/lib/sounds";

const ICON: Record<string, string> = {
  badge: "🏆",
  level: "🚀",
  streak: "🔥",
};

export function AchievementToast() {
  const { achievement, clearAchievement } = useActiveChat();

  // Chime once when a new achievement arrives, then auto-dismiss.
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger on new achievement
  useEffect(() => {
    if (!achievement) {
      return;
    }
    playSound("success");
    const t = setTimeout(clearAchievement, 3500);
    return () => clearTimeout(t);
  }, [achievement?.at]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
      <AnimatePresence>
        {achievement && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-primary/30 bg-[image:var(--gradient-sunset)] px-4 py-2.5 text-white shadow-[var(--shadow-float)]"
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
          >
            <span className="text-2xl">{ICON[achievement.kind] ?? "🏆"}</span>
            <div className="leading-tight">
              <div className="font-semibold text-[11px] uppercase tracking-wide opacity-90">
                Achievement unlocked
              </div>
              <div className="font-bold text-sm">{achievement.label}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
