"use client";

import { motion } from "framer-motion";

interface PlayerStatsProps {
  xp: number;
  streak: number;
  level: number;
  badges: number;
}

export function PlayerStats({ xp, streak, level, badges }: PlayerStatsProps) {
  const items = [
    { value: xp, label: "XP", icon: "⚡" },
    { value: `🔥 ${streak}`, label: "Day streak", icon: null },
    { value: level, label: "Level", icon: "★" },
    { value: badges, label: "Badges", icon: "🏅" },
  ];

  return (
    <div className="flex gap-2">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
          className="flex flex-1 flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-lg"
        >
          {item.icon && (
            <span className="text-lg leading-none">{item.icon}</span>
          )}
          <span className="mt-0.5 text-lg font-bold text-white">
            {item.value}
          </span>
          <span className="mt-0.5 text-[10px] text-white/50">{item.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
