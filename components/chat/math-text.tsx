"use client";

import katex from "katex";
import { Fragment, useMemo } from "react";

// Render a plain string that may contain inline LaTeX delimited by $…$ or
// $$…$$. Used for question prompts and answer options (the challenge card and
// the answer form), which aren't run through the full markdown renderer.
// Anything outside the delimiters is shown as-is. If no $ delimiters are found
// but the text contains LaTeX commands (e.g. \frac, \sqrt), the whole string is
// treated as inline math so the askQuestion tool's prompts render correctly.
type Segment = { type: "text" | "math"; value: string; display: boolean };

// Known LaTeX command patterns — catch common ones used by the tutor. If the
// string contains any of these without a $ wrapper, auto-render as inline math.
const LATEX_CMD = /\\(?:frac|sqrt|cdot|times|div|pm|int|sum|prod|lim|log|ln|sin|cos|tan|theta|alpha|beta|gamma|delta|pi|infty|rightarrow|leftarrow|binom|text|mathrm|mathbf|underline|overline|overrightarrow|vec|hat|tilde)\s*[\{\[]/;

function hasBareLatex(input: string): boolean {
  return LATEX_CMD.test(input) && !input.includes("$");
}

function parse(input: string): Segment[] {
  const segments: Segment[] = [];
  // If the text has raw LaTeX commands without $ delimiters, auto-wrap it.
  if (hasBareLatex(input)) {
    return [{ type: "math", value: input, display: false }];
  }
  // Match $$…$$ (display) or $…$ (inline). Non-greedy, no newline spanning for
  // inline to avoid swallowing unrelated dollar signs.
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null = re.exec(input);
  while (m !== null) {
    if (m.index > last) {
      segments.push({
        type: "text",
        value: input.slice(last, m.index),
        display: false,
      });
    }
    const display = m[1] !== undefined;
    segments.push({
      type: "math",
      value: (display ? m[1] : m[2]) ?? "",
      display,
    });
    last = m.index + m[0].length;
    m = re.exec(input);
  }
  if (last < input.length) {
    segments.push({ type: "text", value: input.slice(last), display: false });
  }
  return segments;
}

export function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const segments = useMemo(() => parse(children ?? ""), [children]);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        const key = `${seg.type}-${i}-${seg.value}`;
        if (seg.type === "text") {
          return <Fragment key={key}>{seg.value}</Fragment>;
        }
        let html: string;
        try {
          html = katex.renderToString(seg.value, {
            displayMode: seg.display,
            throwOnError: false,
          });
        } catch {
          // If KaTeX can't parse it, fall back to showing the raw source.
          return <Fragment key={key}>{seg.value}</Fragment>;
        }
        return (
          <span
            // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output
            dangerouslySetInnerHTML={{ __html: html }}
            key={key}
          />
        );
      })}
    </span>
  );
}
