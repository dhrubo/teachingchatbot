"use client";

interface MissionCardProps {
  title: string;
  emoji: string;
  description: string;
  progressPercent: number;
  onClick: () => void;
}

export function MissionCard({
  title,
  emoji,
  description,
  progressPercent,
  onClick,
}: MissionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-orange-500/15 bg-white/5 p-4 text-left backdrop-blur-lg transition-all duration-200 hover:scale-[1.01] hover:bg-white/[0.07]"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 text-lg">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
        <p className="mt-0.5 truncate text-xs text-white/50">{description}</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-violet-500 transition-all duration-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-violet-500 px-3.5 py-1 text-xs font-medium text-white shadow-lg shadow-orange-500/20 transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.97]">
        Continue
      </span>
    </button>
  );
}
