"use client";

import katex from "katex";
import { useMemo } from "react";

type KatexMathProps = {
  latex: string;
  displayMode?: boolean;
  className?: string;
};

export function KatexMath({
  latex,
  displayMode = false,
  className,
}: KatexMathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      return latex;
    }
  }, [latex, displayMode]);

  return (
    <span
      className={className}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX renders sanitized math markup with trust: false
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
