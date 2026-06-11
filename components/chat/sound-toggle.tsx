"use client";

import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isMuted, playSound, setMuted } from "@/lib/sounds";

export function SoundToggle() {
  const [muted, setMutedState] = useState(false);

  // Read the saved preference after mount (avoids SSR mismatch).
  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) {
      // Give a tiny confirmation when turning sound back on.
      playSound("pop");
    }
  };

  return (
    <Button
      aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
      aria-pressed={muted}
      className="text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 hover:translate-y-[-1px]"
      onClick={toggle}
      size="icon-sm"
      title={muted ? "Sound off" : "Sound on"}
      type="button"
      variant="ghost"
    >
      {muted ? (
        <VolumeXIcon className="size-4" />
      ) : (
        <Volume2Icon className="size-4" />
      )}
    </Button>
  );
}
