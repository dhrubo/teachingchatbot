"use client";

import type { VisualModelSpec } from "@/lib/curriculum/types";
import { cn } from "@/lib/utils";

const BAR_COLORS = {
  coral: "bg-orange-500/85 border-orange-300/60",
  violet: "bg-violet-500/85 border-violet-300/60",
  emerald: "bg-emerald-500/85 border-emerald-300/60",
  amber: "bg-amber-500/85 border-amber-300/60",
} as const;

function FractionWallDiagram({
  model,
}: {
  model: Extract<VisualModelSpec, { kind: "fraction-wall" }>;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="font-medium text-slate-200 text-xs uppercase tracking-wider">
        {model.title}
      </div>
      <div className="space-y-2.5">
        {model.bars.map((bar) => {
          const denom = Math.max(1, Math.min(24, Math.round(bar.denominator)));
          const num = Math.max(0, Math.min(denom, Math.round(bar.numerator)));
          const activeClass = BAR_COLORS[bar.color ?? "coral"];

          return (
            <div className="space-y-1" key={bar.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">{bar.label}</span>
                <span className="font-mono text-slate-400">
                  {num}/{denom}
                </span>
              </div>
              <div
                className="grid h-8 w-full overflow-hidden rounded-lg border border-white/15 bg-white/5"
                style={{
                  gridTemplateColumns: `repeat(${denom}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: denom }).map((_, idx) => {
                  const shaded = idx < num;
                  return (
                    <div
                      className={cn(
                        "border-white/15 border-r transition-all duration-300 last:border-r-0",
                        shaded ? activeClass : "bg-transparent"
                      )}
                      key={`${bar.label}-cell-${String(idx)}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {model.resultNote ? (
        <p className="text-emerald-300/90 text-xs">{model.resultNote}</p>
      ) : null}
    </div>
  );
}

function MultiplierTimelineDiagram({
  model,
}: {
  model: Extract<VisualModelSpec, { kind: "multiplier-timeline" }>;
}) {
  const maxTotal = Math.max(...model.steps.map((s) => s.total), 1);
  const prefix = model.unitPrefix ?? "";

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-slate-200 text-xs uppercase tracking-wider">
          {model.title}
        </span>
        <span className="rounded-full border border-orange-400/40 bg-orange-500/15 px-2.5 py-0.5 font-mono text-orange-300 text-xs">
          Each step: {model.multiplierLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
        {model.steps.map((step) => {
          const totalHeightPct = Math.max(24, (step.total / maxTotal) * 100);
          const interestRatio =
            step.total > 0 ? (step.interestAdded / step.total) * 100 : 0;

          return (
            <div
              className="flex flex-col items-center rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
              key={step.label}
            >
              <div className="mb-1 font-mono font-semibold text-slate-100 text-xs">
                {prefix}
                {step.total.toFixed(step.total % 1 === 0 ? 0 : 2)}
              </div>
              <div className="flex h-28 w-12 items-end overflow-hidden rounded-md bg-white/5 p-0.5">
                <div
                  className="flex w-full flex-col justify-start overflow-hidden rounded-sm bg-violet-500/75 transition-all duration-500"
                  style={{ height: `${totalHeightPct}%` }}
                >
                  {step.interestAdded > 0 ? (
                    <div
                      className="w-full bg-orange-400"
                      style={{ height: `${Math.max(14, interestRatio)}%` }}
                      title={`+${prefix}${step.interestAdded.toFixed(2)} added this step`}
                    />
                  ) : null}
                </div>
              </div>
              <div className="mt-1.5 font-medium text-slate-300 text-xs">
                {step.label}
              </div>
              {step.interestAdded > 0 ? (
                <div className="font-mono text-[11px] text-orange-300">
                  +{prefix}
                  {step.interestAdded.toFixed(2)}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">Principal</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AreaGridDiagram({
  model,
}: {
  model: Extract<VisualModelSpec, { kind: "area-grid" }>;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="font-medium text-slate-200 text-xs uppercase tracking-wider">
        {model.title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center font-mono text-sm">
          <thead>
            <tr>
              <th className="p-2 text-slate-400 text-xs">×</th>
              {model.colHeaders.map((col, idx) => (
                <th
                  className="border border-white/10 bg-violet-500/15 p-2 font-semibold text-violet-200"
                  key={`col-${col}-${String(idx)}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rowHeaders.map((rowHeader, rIdx) => (
              <tr key={`row-${rowHeader}-${String(rIdx)}`}>
                <th className="border border-white/10 bg-orange-500/15 p-2 font-semibold text-orange-200">
                  {rowHeader}
                </th>
                {(model.cells[rIdx] ?? []).map((cell, cIdx) => {
                  const isCheck = cell === "✓";
                  return (
                    <td
                      className={cn(
                        "border border-white/10 p-2.5",
                        isCheck
                          ? "bg-emerald-500/25 font-bold text-emerald-200"
                          : "bg-white/[0.03] text-slate-100"
                      )}
                      key={`cell-${String(rIdx)}-${String(cIdx)}`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {model.caption ? (
        <p className="text-slate-300 text-xs">{model.caption}</p>
      ) : null}
    </div>
  );
}

function NumberLineDiagram({
  model,
}: {
  model: Extract<VisualModelSpec, { kind: "number-line" }>;
}) {
  const span = Math.max(1e-6, model.max - model.min);
  const step = model.tickStep > 0 ? model.tickStep : 1;
  const ticks: number[] = [];
  for (
    let v = model.min;
    v <= model.max + 1e-6 && ticks.length <= 20;
    v += step
  ) {
    ticks.push(Number(v.toFixed(4)));
  }

  const toX = (val: number) => 36 + ((val - model.min) / span) * 328;

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="font-medium text-slate-200 text-xs uppercase tracking-wider">
        {model.title}
      </div>
      <svg className="h-28 w-full" viewBox="0 0 400 105">
        <line
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          x1="24"
          x2="376"
          y1="66"
          y2="66"
        />
        {ticks.map((t) => {
          const x = toX(t);
          return (
            <g key={`tick-${String(t)}`}>
              <line
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
                x1={x}
                x2={x}
                y1="61"
                y2="71"
              />
              <text
                fill="rgba(226,232,240,0.75)"
                fontSize="10"
                textAnchor="middle"
                x={x}
                y="86"
              >
                {t}
              </text>
            </g>
          );
        })}

        {(model.jumps ?? []).map((jump, idx) => {
          const x1 = toX(jump.from);
          const x2 = toX(jump.to);
          const midX = (x1 + x2) / 2;
          return (
            <g key={`jump-${String(idx)}`}>
              <path
                d={`M ${x1} 62 Q ${midX} 26 ${x2} 62`}
                fill="none"
                stroke="#F97316"
                strokeDasharray="4 2"
                strokeWidth="2"
              />
              <text
                fill="#FDBA74"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                x={midX}
                y="34"
              >
                {jump.label}
              </text>
            </g>
          );
        })}

        {(model.points ?? []).map((pt) => {
          const x = toX(pt.value);
          const hollow = pt.style === "hollow";
          return (
            <g key={`pt-${pt.label}-${String(pt.value)}`}>
              <circle
                cx={x}
                cy="66"
                fill={hollow ? "#0B1026" : "#10B981"}
                r="5"
                stroke="#10B981"
                strokeWidth="2"
              />
              <text
                fill="#6EE7B7"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                x={x}
                y="52"
              >
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EquationBalanceDiagram({
  model,
}: {
  model: Extract<VisualModelSpec, { kind: "equation-balance" }>;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-slate-200 text-xs uppercase tracking-wider">
          {model.title}
        </span>
        {model.operationBadge ? (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-0.5 font-mono text-emerald-300 text-xs">
            {model.operationBadge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col items-center pt-1">
        <div className="grid w-full max-w-md grid-cols-2 gap-6">
          <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-3 py-3 text-center font-mono font-semibold text-orange-100 text-sm">
            {model.leftSide}
          </div>
          <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-3 text-center font-mono font-semibold text-sm text-violet-100">
            {model.rightSide}
          </div>
        </div>
        <div className="h-1.5 w-full max-w-md rounded-full bg-white/30" />
        <div className="h-0 w-0 border-r-[14px] border-r-transparent border-b-[18px] border-b-amber-400/80 border-l-[14px] border-l-transparent" />
      </div>

      {model.caption ? (
        <p className="text-center text-slate-300 text-xs">{model.caption}</p>
      ) : null}
    </div>
  );
}

function TriangleTrigDiagram({
  model,
}: {
  model: Extract<VisualModelSpec, { kind: "triangle-trig" }>;
}) {
  const hi = model.highlightSide;

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="font-medium text-slate-200 text-xs uppercase tracking-wider">
        {model.title}
      </div>
      <svg className="mx-auto h-40 w-full max-w-sm" viewBox="0 0 320 155">
        {/* Right-angle square at (70, 125) */}
        <polyline
          fill="none"
          points="70,111 84,111 84,125"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
        />
        {/* Height */}
        <line
          stroke={hi === "height" ? "#F97316" : "#A78BFA"}
          strokeWidth={hi === "height" ? "3.5" : "2.5"}
          x1="70"
          x2="70"
          y1="25"
          y2="125"
        />
        {/* Base */}
        <line
          stroke={hi === "base" ? "#F97316" : "#60A5FA"}
          strokeWidth={hi === "base" ? "3.5" : "2.5"}
          x1="70"
          x2="245"
          y1="125"
          y2="125"
        />
        {/* Hypotenuse */}
        <line
          stroke={hi === "hypotenuse" ? "#F97316" : "#34D399"}
          strokeWidth={hi === "hypotenuse" ? "3.5" : "2.5"}
          x1="70"
          x2="245"
          y1="25"
          y2="125"
        />
        {model.angleLabel ? (
          <g>
            <path
              d="M 212 125 A 33 33 0 0 1 217 109"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="2"
            />
            <text fill="#FDE68A" fontSize="12" fontWeight="700" x="196" y="119">
              {model.angleLabel}
            </text>
          </g>
        ) : null}

        <text
          fill="#DDD6FE"
          fontSize="11"
          fontWeight="600"
          textAnchor="end"
          x="62"
          y="78"
        >
          {model.heightLabel}
        </text>
        <text
          fill="#BFDBFE"
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          x="157"
          y="144"
        >
          {model.baseLabel}
        </text>
        <text
          fill="#FDBA74"
          fontSize="11"
          fontWeight="600"
          textAnchor="start"
          x="166"
          y="68"
        >
          {model.hypotenuseLabel}
        </text>
      </svg>
      {model.formulaNote ? (
        <p className="text-center text-amber-200/90 text-xs">
          {model.formulaNote}
        </p>
      ) : null}
    </div>
  );
}

export function VisualModelRenderer({ model }: { model: VisualModelSpec }) {
  switch (model.kind) {
    case "fraction-wall":
      return <FractionWallDiagram model={model} />;
    case "multiplier-timeline":
      return <MultiplierTimelineDiagram model={model} />;
    case "area-grid":
      return <AreaGridDiagram model={model} />;
    case "number-line":
      return <NumberLineDiagram model={model} />;
    case "equation-balance":
      return <EquationBalanceDiagram model={model} />;
    case "triangle-trig":
      return <TriangleTrigDiagram model={model} />;
    default:
      return null;
  }
}
