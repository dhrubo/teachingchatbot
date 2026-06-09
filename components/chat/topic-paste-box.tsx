"use client";

import { useState } from "react";
import type { MatchTopicsResponse } from "@/app/(chat)/api/match-topics/route";
import { Button } from "@/components/ui/button";
import { useStartTopic } from "@/hooks/use-start-topic";

/**
 * Homepage "paste your topics" box. The student pastes a list of maths topics
 * (e.g. from a school syllabus); we match each to an available mission via the
 * server, show the matched ones as start buttons, and tell them which aren't
 * available yet (those are logged as admin topic-requests server-side).
 */
export function TopicPasteBox() {
  const startTopic = useStartTopic();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchTopicsResponse | null>(null);

  const handleMatch = async () => {
    if (!text.trim() || loading) {
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(`${base}/api/match-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as MatchTopicsResponse;
      setResult(data);
    } catch (error) {
      console.error("[topic-paste-box] match failed:", error);
      setResult({ matched: [], unavailable: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-primary/20 bg-card/40 p-5 backdrop-blur-sm">
      <h2 className="text-base font-semibold text-foreground">
        What do you want to learn?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a topic from{" "}
        <strong className="text-foreground">Choose a Topic</strong> at the top —
        or paste your topic list below and we&apos;ll match it for you.
      </p>

      <textarea
        className="mt-3 min-h-[88px] w-full resize-y rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "e.g. Calculate percentages, Share in a ratio, Solve equations, Perimeter of shapes…"
        }
        value={text}
      />

      <div className="mt-2 flex justify-end">
        <Button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-5 font-semibold text-white shadow-lg"
          disabled={!text.trim() || loading}
          onClick={handleMatch}
          size="sm"
        >
          {loading ? "Matching…" : "Find my topics"}
        </Button>
      </div>

      {result && (
        <div className="mt-4 flex flex-col gap-3">
          {result.matched.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ready to learn
              </p>
              <div className="flex flex-col gap-2">
                {result.matched.map((m) => (
                  <button
                    className="flex items-center justify-between rounded-xl border border-primary/30 bg-card px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5"
                    key={m.slug + m.input}
                    onClick={() => startTopic({ id: m.slug, title: m.title })}
                    type="button"
                  >
                    <span>{m.title}</span>
                    <span className="text-xs text-primary">Start →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.unavailable.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
              <p className="text-xs font-semibold text-foreground">
                Not available yet
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                We&apos;ve let our team know you&apos;d like these —
                they&apos;ll be added soon:
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {result.unavailable.map((t) => (
                  <li
                    className="rounded-full bg-muted/40 px-2.5 py-0.5 text-[11px] text-muted-foreground"
                    key={t}
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.matched.length === 0 && result.unavailable.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Couldn&apos;t read any topics from that — try one per line.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
