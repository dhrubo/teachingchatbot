// Tiny Web Audio sound effects — no files, no dependencies.
// Tones are generated on the fly and kept short and soft.

export type SoundName = "send" | "receive" | "success" | "pop" | "wrong";

let ctx: AudioContext | null = null;
const STORAGE_KEY = "tutor-sound-muted";

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    ctx = new Ctor();
  }
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
}

// Play a short sequence of soft notes.
function playNotes(notes: { freq: number; start: number; dur: number }[]) {
  const audio = getCtx();
  if (!audio) {
    return;
  }
  // Browsers start the context suspended until a user gesture.
  if (audio.state === "suspended") {
    audio.resume().catch(() => {
      /* ignore */
    });
  }
  const now = audio.currentTime;
  for (const note of notes) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = note.freq;
    // Gentle attack/decay so it's never harsh.
    const t0 = now + note.start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + note.dur + 0.02);
  }
}

const RECIPES: Record<
  SoundName,
  { freq: number; start: number; dur: number }[]
> = {
  pop: [{ freq: 520, start: 0, dur: 0.09 }],
  send: [{ freq: 660, start: 0, dur: 0.1 }],
  receive: [
    { freq: 587, start: 0, dur: 0.12 },
    { freq: 784, start: 0.08, dur: 0.14 },
  ],
  success: [
    { freq: 523, start: 0, dur: 0.1 },
    { freq: 659, start: 0.08, dur: 0.1 },
    { freq: 784, start: 0.16, dur: 0.16 },
  ],
  // Gentle "not quite" — soft descending two-note, never harsh.
  wrong: [
    { freq: 392, start: 0, dur: 0.12 },
    { freq: 311, start: 0.1, dur: 0.18 },
  ],
};

export function playSound(name: SoundName) {
  if (isMuted()) {
    return;
  }
  try {
    playNotes(RECIPES[name]);
  } catch {
    /* audio is best-effort; never throw */
  }
}
