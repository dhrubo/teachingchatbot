"use client";

import { Loader2, Radio, RotateCcw, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_PODCAST_VOICE_LABEL } from "@/lib/voice/podcast-script";
import type { VoiceEngineState } from "./use-voice-engine";

export type LivePodcastScriptProps = {
  activeScript: string;
  printedWords: readonly string[];
  activeWordIndex: number;
  speechProgress: number;
  isLoadingAudio: boolean;
  voiceState: VoiceEngineState;
  onReplay?: () => void;
  onStop?: () => void;
  compact?: boolean;
  className?: string;
};

export function LivePodcastScript({
  activeScript,
  printedWords,
  activeWordIndex,
  speechProgress,
  isLoadingAudio,
  voiceState,
  onReplay,
  onStop,
  compact = false,
  className,
}: LivePodcastScriptProps) {
  if (!activeScript) {
    return null;
  }

  const isSpeaking = voiceState === "speaking";

  return (
    <div
      aria-live="polite"
      className={cn(
        "rounded-2xl border transition-colors",
        isSpeaking
          ? "border-orange-400/45 bg-gradient-to-br from-orange-500/12 via-slate-950/85 to-violet-600/12 shadow-lg"
          : "border-white/10 bg-slate-950/65",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold text-[11px]",
              isSpeaking
                ? "bg-orange-500/25 text-orange-200"
                : "bg-white/10 text-slate-300"
            )}
          >
            <Radio
              className={cn(
                "size-3",
                isSpeaking ? "animate-pulse text-orange-400" : "text-slate-400"
              )}
            />
            {DEFAULT_PODCAST_VOICE_LABEL}
          </span>
          <span className="text-[11px] text-slate-400">
            {isLoadingAudio
              ? "Preparing Jori podcast audio..."
              : isSpeaking
                ? "Live Spoken Script"
                : "Spoken Script"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isSpeaking && onStop ? (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 font-semibold text-[11px] text-slate-200 transition hover:bg-white/20"
              onClick={onStop}
              type="button"
            >
              <Square className="size-2.5 fill-current" />
              Stop
            </button>
          ) : onReplay ? (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 font-semibold text-[11px] text-slate-300 transition hover:bg-white/15 hover:text-white"
              onClick={onReplay}
              type="button"
            >
              <RotateCcw className="size-3 text-orange-400" />
              Play Jori
            </button>
          ) : null}
        </div>
      </div>

      {/* Synchronized Word-by-Word Printed Script */}
      <div
        className={cn(
          "mt-2.5 leading-relaxed",
          compact ? "text-xs sm:text-sm" : "text-sm"
        )}
      >
        {isLoadingAudio && printedWords.length === 0 ? (
          <span className="inline-flex items-center gap-2 text-orange-200/90 text-xs">
            <Loader2 className="size-3.5 animate-spin text-orange-400" />
            Connecting Jori&apos;s podcast mic...
          </span>
        ) : (
          <p className="text-slate-100">
            {printedWords.map((word, idx) => {
              const isCurrentWord = isSpeaking && idx === activeWordIndex;
              return (
                <span
                  className={cn(
                    "transition-colors duration-100",
                    isCurrentWord
                      ? "font-semibold text-orange-200 underline decoration-orange-400/70 underline-offset-4"
                      : "text-slate-100"
                  )}
                  key={`script-w-${String(idx)}`}
                >
                  {idx > 0 ? " " : ""}
                  {word}
                </span>
              );
            })}
            {isSpeaking ? (
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-orange-400"
              />
            ) : null}
          </p>
        )}
      </div>

      {/* Subtle Podcast Progress Bar while Speaking */}
      {isSpeaking ? (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-violet-400 transition-all duration-100"
            style={{
              width: `${Math.max(4, Math.round(speechProgress * 100))}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
