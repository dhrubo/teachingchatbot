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
      className={cn(
        "relative flex items-center justify-center",
        animated && "motion-safe:animate-float",
        className,
      )}
      style={{ width: s, height: s }}
      aria-label="SARA mascot"
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#F97316" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="halo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="50" cy="50" r="48" fill="url(#glow)" />

        <circle
          cx="50"
          cy="38"
          r="14"
          stroke="url(#body)"
          strokeWidth="2"
          fill="none"
        />

        <path
          d="M36 52 Q50 44 64 52 L62 78 Q50 85 38 78 Z"
          stroke="url(#body)"
          strokeWidth="2"
          fill="none"
        />

        <line
          x1="36"
          y1="60"
          x2="24"
          y2="48"
          stroke="url(#halo)"
          strokeWidth="2"
          strokeLinecap="round"
          filter={mood === "thinking" ? "url(#glowFilter)" : undefined}
        />
        <line
          x1="24"
          y1="48"
          x2="20"
          y2="44"
          stroke="#A78BFA"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        <path
          d="M32 36 Q34 33 37 35"
          stroke="#A78BFA"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        <circle cx="37" cy="34" r="1" fill="#A78BFA" opacity="0.6" />

        {mood === "celebrating" && (
          <>
            <text x="68" y="28" fontSize="8" fill="#FBBF24">★</text>
            <text x="72" y="40" fontSize="6" fill="#A78BFA">✦</text>
          </>
        )}

        <text
          x={mood === "thinking" ? "72" : "68"}
          y="32"
          fontSize="7"
          fill="#A78BFA"
          opacity="0.7"
        >
          π
        </text>
        <text
          x="22"
          y="28"
          fontSize="6"
          fill="#FBBF24"
          opacity="0.6"
        >
          ∑
        </text>
        <text
          x="70"
          y="50"
          fontSize="6"
          fill="#A78BFA"
          opacity="0.5"
        >
          √
        </text>

        <path
          d="M50 36 Q55 38 53 42"
          stroke="#F97316"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        <circle cx="53" cy="41.5" r="1" fill="#F97316" opacity="0.5" />
      </svg>
    </div>
  );
}
