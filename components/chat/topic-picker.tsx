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

// Static fallback used only when /api/lessons returns nothing (offline / unseeded
// DB). Slugs match the seeded mission slugs where possible.
const FALLBACK: Record<"8" | "9", TopicItem[]> = {
  "8": [
    { slug: "number-skills", title: "Number Skills" },
    { slug: "fractions", title: "Fractions" },
    { slug: "decimals", title: "Decimals" },
    { slug: "percentages", title: "Percentages" },
    { slug: "ratio-and-proportion", title: "Ratio and Proportion" },
    { slug: "algebra-basics", title: "Algebra Basics" },
    { slug: "equations", title: "Equations" },
    { slug: "coordinates", title: "Coordinates" },
    { slug: "straight-line-graphs", title: "Straight-Line Graphs" },
    { slug: "angles-and-geometry", title: "Angles and Geometry" },
    { slug: "area-and-perimeter", title: "Area and Perimeter" },
    { slug: "probability", title: "Probability" },
    { slug: "statistics", title: "Statistics" },
  ],
  "9": [
    { slug: "indices", title: "Indices" },
    { slug: "standard-form", title: "Standard Form" },
    { slug: "simultaneous-equations", title: "Simultaneous Equations" },
    { slug: "pythagoras", title: "Pythagoras" },
    { slug: "trigonometry-intro", title: "Trigonometry Intro" },
    { slug: "transformations", title: "Transformations" },
    { slug: "circle-geometry", title: "Circle Geometry" },
    { slug: "compound-measures", title: "Compound Measures" },
    { slug: "advanced-probability", title: "Advanced Probability" },
    { slug: "histograms", title: "Histograms" },
    { slug: "algebraic-fractions", title: "Algebraic Fractions" },
  ],
};

function useYearTopics(year: "8" | "9"): TopicItem[] {
  const { data } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lessons?year=${year}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const missions = data?.missions as
    | { slug: string; title: string }[]
    | undefined;
  if (missions?.length) {
    return missions.map((m) => ({ slug: m.slug, title: m.title }));
  }
  return FALLBACK[year];
}

function YearGroup({
  year,
  onPick,
}: {
  year: "8" | "9";
  onPick: (t: TopicItem) => void;
}) {
  const topics = useYearTopics(year);
  return (
    <div className="flex flex-col">
      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Year {year}
      </p>
      {topics.map((t) => (
        <button
          className="rounded-lg px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-primary/10"
          key={t.slug}
          onClick={() => onPick(t)}
          type="button"
        >
          {t.title}
        </button>
      ))}
    </div>
  );
}

/**
 * Top-nav "Choose a Topic" dropdown. Topics are grouped by Year 8 / Year 9 and
 * selectable directly — selecting one starts the gated mission flow (concept
 * cards → footer → explicit Start Challenge Mode), never an immediate challenge.
 */
export function TopicPicker({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const startTopic = useStartTopic();

  const pick = (t: TopicItem) => {
    setOpen(false);
    startTopic({ id: t.slug, title: t.title, emoji: t.emoji });
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn("rounded-full px-3 text-sm font-medium", className)}
          size="sm"
          variant="ghost"
        >
          Choose a Topic
          <ChevronDownIcon className="ml-1 size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[70vh] w-64 overflow-y-auto p-1"
      >
        <YearGroup onPick={pick} year="8" />
        <div className="my-1 h-px bg-border/50" />
        <YearGroup onPick={pick} year="9" />
      </PopoverContent>
    </Popover>
  );
}
