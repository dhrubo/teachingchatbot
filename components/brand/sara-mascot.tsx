"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Mood = "happy" | "thinking" | "celebrating";

export interface SaraMascotProps {
  size?: number;
  animated?: boolean;
  mood?: Mood;
  className?: string;
}

export function SaraMascot({
  size = 130,
  animated = true,
  mood = "happy",
  className,
}: SaraMascotProps) {
  return (
    <div
      aria-label="SARA mascot"
      className={cn(
        "relative flex items-center justify-center select-none overflow-visible",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        className={cn("w-full h-full overflow-visible", animated && "animate-float")}
        viewBox="0 0 160 160"
      >
        <defs>
          <radialGradient id="aura" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor="#7C3AED"
              stopOpacity={mood === "thinking" ? 0.8 : 0.5}
            />
            <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="haloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>

        {/* Glow Aura */}
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="url(#aura)"
          className={cn("origin-center", animated && "animate-pulse")}
          style={{ animationDuration: mood === "thinking" ? "2s" : "4s" }}
        />

        {/* Main Mascot Geometry */}
        <g>
          {/* Orbiting Halo */}
          <ellipse
            cx="80"
            cy="35"
            rx="32"
            ry="8"
            fill="none"
            stroke="url(#haloGrad)"
            strokeWidth="2.5"
            className={cn(
              "origin-center",
              animated && "animate-[spin_8s_linear_infinite]"
            )}
            style={{ animationDuration: mood === "thinking" ? "4s" : "8s" }}
          />
          <circle cx="80" cy="35" r="3" fill="#FBBF24" />

          {/* Minimal Geometric Head */}
          <circle
            cx="80"
            cy="60"
            r="18"
            fill="#141235"
            stroke="url(#bodyGrad)"
            strokeWidth="3"
          />

          {/* Interactive face & power core based on mood */}
          <circle
            cx="80"
            cy="60"
            r={mood === "thinking" ? 4 : 5}
            fill="#FEF3C7"
            className={cn("origin-center", animated && "animate-pulse")}
          />

          {/* Custom Eyes / Cues */}
          {mood === "happy" && (
            <path
              d="M72 58 Q74 55 76 58 M84 58 Q86 55 88 58"
              fill="none"
              stroke="#FEF3C7"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}
          {mood === "thinking" && (
            <path
              d="M72 59 L76 57 M84 57 L88 59"
              fill="none"
              stroke="#FEF3C7"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}
          {mood === "celebrating" && (
            <path
              d="M71 59 L75 55 L79 59 M81 59 L85 55 L89 59"
              fill="none"
              stroke="#FEF3C7"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}

          {/* Torso */}
          <path
            d="M 62 88 L 98 88 L 108 120 L 52 120 Z"
            fill="url(#bodyGrad)"
            className="opacity-90"
          />

          {/* Stylus / Staff */}
          <line
            x1="90"
            y1="98"
            x2="118"
            y2="80"
            stroke="#FEF3C7"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <polygon points="118,80 124,72 126,82" fill="#FBBF24" />

          {/* Orbiting Math Constants */}
          <text
            x="35"
            y="55"
            className="fill-amber-200 text-xs font-semibold select-none pointer-events-none"
            style={{ animationDelay: "0s" }}
          >
            π
          </text>
          <text
            x="125"
            y="58"
            className="fill-violet-300 text-sm font-semibold select-none pointer-events-none"
            style={{ animationDelay: "0.5s" }}
          >
            ∑
          </text>
          <text
            x="30"
            y="105"
            className="fill-orange-300 text-xs font-semibold select-none pointer-events-none"
            style={{ animationDelay: "1s" }}
          >
            √
          </text>
          <text
            x="128"
            y="112"
            className="fill-amber-300 text-[10px] font-semibold select-none pointer-events-none"
            style={{ animationDelay: "1.5s" }}
          >
            %
          </text>

          {/* Celebrating Sparkles */}
          {mood === "celebrating" && (
            <>
              <text x="50" y="30" className="animate-bounce fill-yellow-400 text-[10px]">
                ★
              </text>
              <text
                x="110"
                y="30"
                className="animate-bounce fill-yellow-400 text-[10px]"
                style={{ animationDelay: "0.2s" }}
              >
                ★
              </text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
