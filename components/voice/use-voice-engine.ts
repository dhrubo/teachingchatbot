"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sanitizeForSpeech } from "@/lib/math/check-answer";
import {
  getPrintedScriptFrame,
  tokenizeScriptWords,
} from "@/lib/voice/podcast-script";

export type VoiceEngineState =
  | "idle"
  | "listening"
  | "transcribing"
  | "speaking";

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getBrowserSpeechRecognitionCtor():
  | (new () => BrowserSpeechRecognition)
  | null {
  if (typeof window === "undefined") {
    return null;
  }
  const win = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function useVoiceEngine({
  onTranscript,
  speechSpeed = "1.0",
  autoSpeak = true,
}: {
  onTranscript: (text: string) => void;
  speechSpeed?: string;
  autoSpeak?: boolean;
}) {
  const [voiceState, setVoiceState] = useState<VoiceEngineState>("idle");
  const [muted, setMuted] = useState(!autoSpeak);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState<string>("");

  // Synchronized Live Podcast Teleprompter state
  const [activeScript, setActiveScript] = useState<string>("");
  const [speechProgress, setSpeechProgress] = useState<number>(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechSyncRafRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const browserRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const serverSttUnavailableRef = useRef(false);

  const scriptTokens = useMemo(
    () => tokenizeScriptWords(activeScript),
    [activeScript]
  );

  const scriptFrame = useMemo(
    () => getPrintedScriptFrame(scriptTokens, speechProgress),
    [scriptTokens, speechProgress]
  );

  const clearSpeechSyncLoop = useCallback(() => {
    if (speechSyncRafRef.current !== null) {
      cancelAnimationFrame(speechSyncRafRef.current);
      speechSyncRafRef.current = null;
    }
    if (fallbackTimerRef.current !== null) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    clearSpeechSyncLoop();
    setIsLoadingAudio(false);
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    // Reveal the full script if the user stops playback mid-sentence
    setSpeechProgress((prev) => (prev > 0 ? 1 : prev));
    setVoiceState((prev) => (prev === "speaking" ? "idle" : prev));
  }, [clearSpeechSyncLoop]);

  const speakWithBrowserFallback = useCallback(
    (cleaned: string) => {
      setIsLoadingAudio(false);
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setSpeechProgress(1);
        setVoiceState("idle");
        return;
      }

      window.speechSynthesis.cancel();
      clearSpeechSyncLoop();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = "en-GB";
      const numericSpeed = Number.parseFloat(speechSpeed) || 1.0;
      utterance.rate = numericSpeed;

      const voices = window.speechSynthesis.getVoices();
      const gbVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            /Jori|Sonia|Daniel|Martha|Kate|Google UK|Natural/i.test(v.name)
        ) ?? voices.find((v) => v.lang.startsWith("en-GB"));
      if (gbVoice) {
        utterance.voice = gbVoice;
      }

      const estimatedDurationMs = Math.max(
        1200,
        (cleaned.length / (14.5 * numericSpeed)) * 1000
      );
      let startedAt = Date.now();
      let sawBoundaryEvent = false;

      utterance.onstart = () => {
        startedAt = Date.now();
        setVoiceState("speaking");
        setSpeechProgress(0.02);
        fallbackTimerRef.current = setInterval(() => {
          if (!sawBoundaryEvent) {
            const ratio = Math.min(
              0.98,
              (Date.now() - startedAt) / estimatedDurationMs
            );
            setSpeechProgress((prev) => Math.max(prev, ratio));
          }
        }, 65);
      };

      utterance.onboundary = (ev) => {
        if (typeof ev.charIndex === "number" && cleaned.length > 0) {
          sawBoundaryEvent = true;
          const nextRatio = Math.min(
            0.99,
            (ev.charIndex + (ev.charLength || 4)) / cleaned.length
          );
          setSpeechProgress((prev) => Math.max(prev, nextRatio));
        }
      };

      utterance.onend = () => {
        clearSpeechSyncLoop();
        setSpeechProgress(1);
        setVoiceState("idle");
      };
      utterance.onerror = () => {
        clearSpeechSyncLoop();
        setSpeechProgress(1);
        setVoiceState("idle");
      };
      window.speechSynthesis.speak(utterance);
    },
    [clearSpeechSyncLoop, speechSpeed]
  );

  const speak = useCallback(
    async (text: string, force = false) => {
      const cleaned = sanitizeForSpeech(text);
      if (!cleaned) {
        return;
      }
      setLastSpokenText(cleaned);

      if (muted && !force) {
        setActiveScript(cleaned);
        setSpeechProgress(1);
        return;
      }

      stopSpeaking();
      setActiveScript(cleaned);
      setSpeechProgress(0);
      setIsLoadingAudio(true);
      setVoiceState("speaking");

      try {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleaned,
            speed: ["0.85", "1.0", "1.15"].includes(speechSpeed)
              ? speechSpeed
              : "1.0",
          }),
          signal: AbortSignal.timeout(14_000),
        });

        if (!res.ok) {
          speakWithBrowserFallback(cleaned);
          return;
        }

        const voiceEngineHeader = res.headers.get("X-Voice-Engine") ?? "";
        const isGeminiPodcast = voiceEngineHeader.startsWith("gemini-");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        // Gemini Podcast TTS styles pace natively; only adjust playbackRate on raw fallback MP3s
        audio.playbackRate = isGeminiPodcast
          ? 1.0
          : Number.parseFloat(speechSpeed) || 1.0;
        audioElRef.current = audio;

        const numericSpeed = Number.parseFloat(speechSpeed) || 1.0;
        const estimatedFallbackSec = Math.max(
          1.4,
          cleaned.length / (14.5 * numericSpeed)
        );
        let playbackStartMs = Date.now();

        const syncFrame = () => {
          const activeAudio = audioElRef.current;
          if (!activeAudio || activeAudio.paused || activeAudio.ended) {
            return;
          }

          const totalSec =
            Number.isFinite(activeAudio.duration) && activeAudio.duration > 0.15
              ? activeAudio.duration
              : estimatedFallbackSec;

          const currentSec =
            activeAudio.currentTime > 0
              ? activeAudio.currentTime
              : (Date.now() - playbackStartMs) / 1000;

          const ratio = Math.max(0.02, Math.min(0.995, currentSec / totalSec));
          setSpeechProgress(ratio);
          speechSyncRafRef.current = requestAnimationFrame(syncFrame);
        };

        audio.onplay = () => {
          playbackStartMs = Date.now();
          setIsLoadingAudio(false);
          setSpeechProgress(0.02);
          clearSpeechSyncLoop();
          speechSyncRafRef.current = requestAnimationFrame(syncFrame);
        };

        audio.onended = () => {
          clearSpeechSyncLoop();
          setIsLoadingAudio(false);
          setSpeechProgress(1);
          setVoiceState("idle");
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
          }
        };
        audio.onerror = () => {
          clearSpeechSyncLoop();
          speakWithBrowserFallback(cleaned);
        };

        await audio.play();
      } catch {
        clearSpeechSyncLoop();
        speakWithBrowserFallback(cleaned);
      }
    },
    [
      clearSpeechSyncLoop,
      muted,
      speechSpeed,
      speakWithBrowserFallback,
      stopSpeaking,
    ]
  );

  const cleanupRecordingResources = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    setVolumeLevel(0);
  }, []);

  const startBrowserRecognition = useCallback((): boolean => {
    const Ctor = getBrowserSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError(
        "Voice recognition needs Chrome/Edge/Safari, or add a free GROQ_API_KEY in .env.local."
      );
      setVoiceState("idle");
      return false;
    }

    const rec = new Ctor();
    browserRecRef.current = rec;
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript?.trim() ?? "";
      setVoiceState("idle");
      if (spoken) {
        onTranscript(spoken);
      }
    };
    rec.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setVoiceError(`Mic error: ${event.error}`);
      }
      setVoiceState("idle");
    };
    rec.onend = () => {
      setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
    };

    setVoiceState("listening");
    rec.start();
    return true;
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    if (browserRecRef.current) {
      browserRecRef.current.stop();
      browserRecRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startListening = useCallback(async () => {
    setVoiceError(null);
    stopSpeaking();

    if (serverSttUnavailableRef.current) {
      startBrowserRecognition();
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      startBrowserRecognition();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let heardSpeech = false;
      let silenceStartedAt: number | null = null;
      const startedAt = Date.now();

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        cleanupRecordingResources();
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size < 600) {
          setVoiceState("idle");
          return;
        }

        setVoiceState("transcribing");
        try {
          const form = new FormData();
          form.append("audio", blob, "speech.webm");
          const res = await fetch("/api/voice/stt", {
            method: "POST",
            body: form,
          });

          if (res.status === 503) {
            serverSttUnavailableRef.current = true;
            setVoiceState("idle");
            startBrowserRecognition();
            return;
          }

          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              message?: string;
            };
            setVoiceError(body.message ?? "Could not transcribe audio.");
            setVoiceState("idle");
            return;
          }

          const data = (await res.json()) as { transcript?: string };
          setVoiceState("idle");
          if (data.transcript?.trim()) {
            onTranscript(data.transcript.trim());
          }
        } catch {
          setVoiceError("Network hiccup during voice transcription.");
          setVoiceState("idle");
        }
      };

      const monitorVad = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSq = 0;
        for (const sample of dataArray) {
          const norm = (sample - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / dataArray.length);
        setVolumeLevel(Math.min(1, rms * 5));

        const now = Date.now();
        if (rms > 0.035) {
          heardSpeech = true;
          silenceStartedAt = null;
        } else if (heardSpeech) {
          if (silenceStartedAt === null) {
            silenceStartedAt = now;
          } else if (now - silenceStartedAt > 1250) {
            if (recorder.state !== "inactive") {
              recorder.stop();
            }
            return;
          }
        }

        if (now - startedAt > 28_000 && recorder.state !== "inactive") {
          recorder.stop();
          return;
        }

        rafRef.current = requestAnimationFrame(monitorVad);
      };

      setVoiceState("listening");
      recorder.start();
      rafRef.current = requestAnimationFrame(monitorVad);
    } catch {
      cleanupRecordingResources();
      startBrowserRecognition();
    }
  }, [
    cleanupRecordingResources,
    onTranscript,
    startBrowserRecognition,
    stopSpeaking,
  ]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      cleanupRecordingResources();
    };
  }, [cleanupRecordingResources, stopSpeaking]);

  return {
    voiceState,
    muted,
    setMuted,
    volumeLevel,
    voiceError,
    lastSpokenText,
    activeScript,
    printedWords: scriptFrame.printedWords,
    printedScript: scriptFrame.printedText,
    activeWordIndex: scriptFrame.activeWordIndex,
    speechProgress,
    isLoadingAudio,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  };
}
