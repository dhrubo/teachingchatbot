"use client";

import { Award, Lightbulb, Sparkles } from "lucide-react";
import { LENS_META, type WhiteboardState } from "@/lib/curriculum/types";
import { KatexMath } from "./katex-math";
import { VisualModelRenderer } from "./visual-models";

type LiveMathsBoardProps = {
  board: WhiteboardState;
  edexcelCode?: string;
};

export function LiveMathsBoard({ board, edexcelCode }: LiveMathsBoardProps) {
  const lensInfo = LENS_META[board.lens];

  return (
    <section
      aria-label="Live Visual Maths Whiteboard"
      className="glass-panel flex flex-col gap-4 rounded-2xl p-5 shadow-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-white/10 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 font-semibold text-orange-200 text-xs">
            <Sparkles className="size-3.5 text-orange-400" />
            {lensInfo.label}
          </span>
          <span className="hidden text-slate-400 text-xs sm:inline">
            ({lensInfo.ranedeerMapping})
          </span>
        </div>
        {edexcelCode ? (
          <span className="rounded-md border border-white/15 bg-white/5 px-2.5 py-0.5 font-mono text-slate-300 text-xs">
            Edexcel 1MA1 · {edexcelCode}
          </span>
        ) : null}
      </div>

      <h2 className="font-bold text-lg text-white sm:text-xl">
        {board.headline}
      </h2>

      {board.visual ? <VisualModelRenderer model={board.visual} /> : null}

      <div className="space-y-2.5">
        {board.steps.map((step, idx) => (
          <div
            className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            key={`${step.label}-${String(idx)}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500/25 font-bold font-mono text-violet-200 text-xs">
                {idx + 1}
              </span>
              <div>
                <div className="font-medium text-slate-200 text-sm">
                  {step.label}
                </div>
                {step.note ? (
                  <div className="text-slate-400 text-xs">{step.note}</div>
                ) : null}
              </div>
            </div>
            <div className="overflow-x-auto pl-8 text-base text-white sm:pl-0 sm:text-right">
              <KatexMath latex={step.latex} />
            </div>
          </div>
        ))}
      </div>

      {board.examTip ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3.5 text-amber-100 text-xs leading-relaxed">
          <Award className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div>
            <span className="font-semibold text-amber-300">
              Edexcel Mark-Scheme Tip:{" "}
            </span>
            {board.examTip}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Lightbulb className="size-3.5 text-orange-400" />
          <span>
            Say <strong>&ldquo;Explain it another way&rdquo;</strong> or tap any
            lens tab above to switch how this maths is taught.
          </span>
        </div>
      )}
    </section>
  );
}
