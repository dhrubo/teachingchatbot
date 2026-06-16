"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStartTopic } from "@/hooks/use-start-topic";
import { cn, fetcher } from "@/lib/utils";

type TopicItem = { slug: string; title: string; emoji?: string };

// Static fallback used only when /api/lessons returns nothing (offline / unseeded DB).
const MATHS_FALLBACK: Record<"8" | "9", TopicItem[]> = {
  "8": [
    { slug: "number-skills", title: "Number Skills", emoji: "🔢" },
    { slug: "fractions", title: "Fractions", emoji: "🧮" },
    { slug: "percentages", title: "Percentages", emoji: "💯" },
    { slug: "ratio-proportion", title: "Ratio & Proportion", emoji: "⚖️" },
    { slug: "algebra-basics", title: "Algebra Basics", emoji: "🔤" },
    { slug: "straight-line-graphs", title: "Straight-Line Graphs", emoji: "📈" },
    { slug: "angles-geometry", title: "Angles & Geometry", emoji: "📐" },
    { slug: "probability", title: "Probability", emoji: "🎲" },
    { slug: "area-perimeter", title: "Area & Perimeter", emoji: "📏" },
  ],
  "9": [
    { slug: "indices-standard-form", title: "Indices & Standard Form", emoji: "🔢" },
    { slug: "volume-surface-area", title: "Volume & Surface Area", emoji: "📦" },
    { slug: "simultaneous-equations", title: "Simultaneous Equations", emoji: "➗" },
    { slug: "pythagoras", title: "Pythagoras", emoji: "📏" },
  ],
};

const SCIENCE_FALLBACK: Record<"8" | "9", TopicItem[]> = {
  "8": [
    { slug: "cells-respiration", title: "Cells & Respiration", emoji: "🧫" },
    { slug: "elements-compounds", title: "Elements & Compounds", emoji: "🧪" },
    { slug: "forces-magnets", title: "Forces & Magnets", emoji: "🧲" },
    { slug: "light-sound", title: "Light & Sound", emoji: "🔊" },
  ],
  "9": [
    { slug: "photosynthesis-ecosystems", title: "Photosynthesis & Ecosystems", emoji: "🌿" },
    { slug: "chemical-reactions", title: "Chemical Reactions", emoji: "💥" },
    { slug: "energy-waves", title: "Energy & Waves", emoji: "🌊" },
    { slug: "earth-atmosphere", title: "Earth & Atmosphere", emoji: "🌍" },
  ],
};

const GEOGRAPHY_FALLBACK: Record<"8" | "9", TopicItem[]> = {
  "8": [
    { slug: "coasts", title: "Coasts", emoji: "🏖️" },
    { slug: "ecosystems", title: "Ecosystems", emoji: "🌳" },
    { slug: "map-skills", title: "Map Skills", emoji: "🗺️" },
    { slug: "population-and-settlement", title: "Population & Settlement", emoji: "🏙️" },
    { slug: "rivers", title: "Rivers", emoji: "🌊" },
    { slug: "weather-and-climate", title: "Weather & Climate", emoji: "🌦️" },
  ],
  "9": [],
};

function useSubjectYearTopics(year: "8" | "9", subject: "maths" | "science" | "geography"): TopicItem[] {
  const { data } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lessons?year=${year}&subject=${subject}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const missions = data?.missions as { slug: string; title: string }[] | undefined;
  if (missions?.length) {
    return missions.map((m) => ({
      slug: m.slug,
      title: m.title,
      emoji: subject === "maths" ? "📐" : subject === "science" ? "🧪" : "🌍",
    }));
  }
  if (subject === "maths") return MATHS_FALLBACK[year];
  if (subject === "science") return SCIENCE_FALLBACK[year];
  return GEOGRAPHY_FALLBACK[year];
}

function YearGroup({
  year,
  subject,
  onPick,
}: {
  year: "8" | "9";
  subject: "maths" | "science" | "geography";
  onPick: (t: TopicItem) => void;
}) {
  const topics = useSubjectYearTopics(year, subject);
  if (subject === "geography" && year === "9") return null; // Geography is Year 8 only for now
  
  return (
    <div className="flex flex-col gap-1 p-1">
      <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
        <span className={cn(
          "size-1.5 rounded-full animate-pulse",
          subject === "maths" ? "bg-orange-500" : subject === "science" ? "bg-violet-500" : "bg-emerald-500"
        )} />
        Year {year}
      </p>
      <div className="grid grid-cols-1 gap-0.5">
        {topics.map((t) => (
          <button
            className={cn(
              "rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-foreground/80 transition-all duration-200 border border-transparent hover:translate-x-1",
              subject === "maths"
                ? "hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/10"
                : subject === "science"
                  ? "hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/10"
                  : "hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/10"
            )}
            key={t.slug}
            onClick={() => onPick(t)}
            type="button"
          >
            <span className="mr-2">{t.emoji || (subject === "maths" ? "📐" : subject === "science" ? "🧪" : "🌍")}</span>
            {t.title}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Top-nav "Choose a Topic" dropdown popover, overhauled to be a beautiful triple-column Mega Menu.
 * Divided into GCSE Maths (Left), GCSE Science (Middle), and GCSE Geography (Right) with dynamic SWR loading.
 */
export function TopicPicker({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const startTopic = useStartTopic();

  const pick = (t: TopicItem) => {
    setOpen(false);
    startTopic({ id: t.slug, title: t.title, emoji: t.emoji || "📖" });
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-orange-400 transition-all duration-200 hover:translate-y-[-1px] shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.15)]",
            className
          )}
          size="sm"
          variant="ghost"
        >
          Choose a Topic
          <ChevronDownIcon className="ml-1.5 size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[1100px] max-w-[95vw] p-3 bg-slate-950/95 border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
          {/* Maths Column */}
          <div className="flex flex-col gap-2 p-1">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 pb-2">
              <span className="text-xl">📐</span>
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                GCSE Maths
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <YearGroup onPick={pick} subject="maths" year="8" />
              <YearGroup onPick={pick} subject="maths" year="9" />
            </div>
          </div>

          {/* Science Column */}
          <div className="flex flex-col gap-2 p-1 md:pl-3">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 pb-2">
              <span className="text-xl">🧪</span>
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-300 bg-clip-text text-transparent">
                GCSE Science
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <YearGroup onPick={pick} subject="science" year="8" />
              <YearGroup onPick={pick} subject="science" year="9" />
            </div>
          </div>

          {/* Geography Column */}
          <div className="flex flex-col gap-2 p-1 md:pl-3">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 pb-2">
              <span className="text-xl">🌍</span>
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                GCSE Geography
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <YearGroup onPick={pick} subject="geography" year="8" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}