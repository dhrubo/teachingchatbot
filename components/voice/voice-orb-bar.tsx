"use client";

import {
  Loader2,
  Mic,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { VoiceEngineState } from "./use-voice-engine";

type VoiceOrbBarProps = {
  voiceState: VoiceEngineState;
  volumeLevel: number;
  muted: boolean;
  isBusy: boolean;
  voiceError: string | null;
  canReplay: boolean;
  placeholder?: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onReplaySpeech: () => void;
  onStopSpeech: () => void;
  onToggleMute: () => void;
  onSubmitText: (text: string) => void;
};

export function VoiceOrbBar({
  voiceState,
  volumeLevel,
  muted,
  isBusy,
  voiceError,
  canReplay,
  placeholder = "Or type an answer / question (e.g. '19/20' or 'explain visually')...",
  onStartListening,
  onStopListening,
  onReplaySpeech,
  onStopSpeech,
  onToggleMute,
  onSubmitText,
}: VoiceOrbBarProps) {
  const [draft, setDraft] = useState("");

  const isListening = voiceState === "listening";
  const isSpeaking = voiceState === "speaking";
  const isTranscribing = voiceState === "transcribing";

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isBusy) {
      return;
    }
    onSubmitText(trimmed);
    setDraft("");
  };

  return (
    <div className="glass-panel rounded-2xl p-3.5 shadow-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Primary Voice Mic Orb */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {isListening ? (
              <span className="pointer-events-none absolute inset-0 animate-voice-ring rounded-full bg-orange-500/50" />
            ) : null}
            <button
              aria-label={
                isListening ? "Stop listening" : "Tap to speak to Mr. Ranedeer"
              }
              className={cn(
                "relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-lg transition-all",
                isListening
                  ? "scale-105 bg-red-500 hover:bg-red-600"
                  : isTranscribing || isBusy
                    ? "cursor-wait bg-slate-700"
                    : "bg-gradient-to-br from-orange-500 to-violet-600 hover:scale-105 hover:brightness-110"
              )}
              disabled={isTranscribing || isBusy}
              onClick={isListening ? onStopListening : onStartListening}
              type="button"
            >
              {isTranscribing || isBusy ? (
                <Loader2 className="size-6 animate-spin" />
              ) : isListening ? (
                <Square className="size-5 fill-current" />
              ) : (
                <Mic className="size-6" />
              )}
            </button>
          </div>

          <div className="min-w-[140px]">
            <div className="font-semibold text-slate-100 text-xs">
              {isListening
                ? "Listening... (auto-pauses)"
                : isTranscribing
                  ? "Understanding maths..."
                  : isSpeaking
                    ? "Jori speaking (Podcast Mode)..."
                    : isBusy
                      ? "Thinking..."
                      : "Tap Mic & Speak"}
            </div>
            {isListening ? (
              <div className="mt-1 flex h-4 items-end gap-1">
                {[0.5, 0.85, 1.0, 0.75, 0.95, 0.65, 0.45].map((mult, idx) => {
                  const barH = Math.max(
                    20,
                    Math.min(100, (0.25 + volumeLevel * mult) * 100)
                  );
                  return (
                    <span
                      className="w-1 rounded-full bg-orange-400 transition-all duration-75"
                      key={`bar-${String(idx)}`}
                      style={{ height: `${barH}%` }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                Try: &ldquo;Explain another way&rdquo; or &ldquo;Test me&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 sm:ml-1">
          {isSpeaking ? (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-slate-200 text-xs hover:bg-white/15"
              onClick={onStopSpeech}
              title="Stop speaking"
              type="button"
            >
              <Square className="size-3 fill-current" />
              Stop
            </button>
          ) : canReplay ? (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-slate-300 text-xs hover:bg-white/10"
              onClick={onReplaySpeech}
              title="Replay last explanation aloud"
              type="button"
            >
              <RotateCcw className="size-3.5" />
              Replay
            </button>
          ) : null}

          <button
            aria-label={muted ? "Unmute tutor voice" : "Mute tutor voice"}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
              muted
                ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
            )}
            onClick={onToggleMute}
            type="button"
          >
            {muted ? (
              <>
                <VolumeX className="size-3.5" />
                Muted
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-emerald-400" />
                Voice On
              </>
            )}
          </button>
        </div>

        {/* Quiet-Room Keyboard Fallback Input */}
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={handleFormSubmit}
        >
          <input
            className="h-10 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3.5 text-slate-100 text-sm placeholder:text-slate-500 focus:border-orange-400/60"
            disabled={isBusy}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            type="text"
            value={draft}
          />
          <button
            aria-label="Send typed message"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-orange-500 disabled:opacity-40"
            disabled={!draft.trim() || isBusy}
            type="submit"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>

      {voiceError ? (
        <p className="mt-2 text-amber-300 text-xs">{voiceError}</p>
      ) : null}
    </div>
  );
}
