"use client";

interface CoachBubbleProps {
  message: string;
}

export function CoachBubble({ message }: CoachBubbleProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-violet-500/15 bg-gradient-to-r from-violet-500/5 to-orange-500/5 p-3.5 backdrop-blur-lg">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-violet-500 text-xs text-white shadow-lg shadow-violet-500/20">
        🧠
      </div>
      <p className="text-sm italic leading-relaxed text-white/60">
        &ldquo;{message}&rdquo;
      </p>
    </div>
  );
}
