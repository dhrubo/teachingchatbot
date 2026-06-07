"use client";

import katex from "katex";
import { Fragment, useMemo } from "react";

// Render a plain string that may contain inline LaTeX delimited by $…$ or
// $$…$$. Used for question prompts and answer options (the challenge card and
// the answer form), which aren't run through the full markdown renderer.
// Anything outside the delimiters is shown as-is.
type Segment = { type: "text" | "math"; value: string; display: boolean };

function parse(input: string): Segment[] {
  const segments: Segment[] = [];
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
