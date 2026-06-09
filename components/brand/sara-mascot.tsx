"use client";

import { cn } from "@/lib/utils";

type Mood = "happy" | "thinking" | "celebrating";

interface SaraMascotProps {
  size?: number;
  animated?: boolean;
  mood?: Mood;
  className?: string;
}

export function SaraMascot({
  size = 80,
  animated = true,
  mood = "happy",
  className,
}: SaraMascotProps) {
  const s = size;
  const h = s * 0.5;
  const hs = s * 0.12;

  return (
    <div
      aria-label="SARA mascot"
      className={cn(
        "relative flex items-center justify-center",
        animated && "motion-safe:animate-float",
        className
      )}
      style={{ width: s, height: s }}
    >
      <svg
        fill="none"
        height={s}
        viewBox="0 0 100 100"
        width={s}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient cx="50%" cy="50%" id="glow" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#F97316" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="body" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="halo" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur result="blur" stdDeviation="3" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="50" cy="50" fill="url(#glow)" r="48" />

        <circle
          cx="50"
          cy="38"
          fill="none"
          r="14"
          stroke="url(#body)"
          strokeWidth="2"
        />

        <path
          d="M36 52 Q50 44 64 52 L62 78 Q50 85 38 78 Z"
          fill="none"
          stroke="url(#body)"
          strokeWidth="2"
        />

        <line
          filter={mood === "thinking" ? "url(#glowFilter)" : undefined}
          stroke="url(#halo)"
          strokeLinecap="round"
          strokeWidth="2"
          x1="36"
          x2="24"
          y1="60"
          y2="48"
        />
        <line
          stroke="#A78BFA"
          strokeLinecap="round"
          strokeWidth="1.5"
          x1="24"
          x2="20"
          y1="48"
          y2="44"
        />

        <path
          d="M32 36 Q34 33 37 35"
          fill="none"
          opacity="0.6"
          stroke="#A78BFA"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
        <circle cx="37" cy="34" fill="#A78BFA" opacity="0.6" r="1" />

        {mood === "celebrating" && (
          <>
            <text fill="#FBBF24" fontSize="8" x="68" y="28">
              ★
            </text>
            <text fill="#A78BFA" fontSize="6" x="72" y="40">
              ✦
            </text>
          </>
        )}

        <text
          fill="#A78BFA"
          fontSize="7"
          opacity="0.7"
          x={mood === "thinking" ? "72" : "68"}
          y="32"
        >
          π
        </text>
        <text fill="#FBBF24" fontSize="6" opacity="0.6" x="22" y="28">
          ∑
        </text>
        <text fill="#A78BFA" fontSize="6" opacity="0.5" x="70" y="50">
          √
        </text>

        <path
          d="M50 36 Q55 38 53 42"
          fill="none"
          opacity="0.5"
          stroke="#F97316"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
        <circle cx="53" cy="41.5" fill="#F97316" opacity="0.5" r="1" />
      </svg>
    </div>
  );
}
