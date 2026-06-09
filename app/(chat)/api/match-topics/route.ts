import { generateObject } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getTitleModel } from "@/lib/ai/providers";
import { extractTopics } from "@/lib/ai/detect-large-input";
import {
  getActiveMissions,
  recordTopicRequest,
} from "@/lib/db/queries/topic-requests";

export type MatchedTopic = {
  input: string;
  slug: string;
  title: string;
};

export type MatchTopicsResponse = {
  matched: MatchedTopic[];
  unavailable: string[];
};

const matchSchema = z.object({
  matches: z.array(
    z.object({
      input: z.string().describe("the original pasted topic line"),
      slug: z
        .string()
        .nullable()
        .describe("the matching mission slug, or null if none is a good match"),
    })
  ),
});

// POST { text } → { matched:[{input,slug,title}], unavailable:[string] }
// Maps each pasted topic to a DB mission via the LLM (one call), records the
// unmatched ones as TopicRequests for the admin, and returns both lists.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const { text } = (await req.json()) as { text?: string };
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ matched: [], unavailable: [] });
  }

  const topics = extractTopics(text);
  if (topics.length === 0) {
    return NextResponse.json({ matched: [], unavailable: [] });
  }

  const missions = await getActiveMissions();
  const bySlug = new Map(missions.map((m) => [m.slug, m]));

  let matchResult: z.infer<typeof matchSchema>;
  try {
    const { object } = await generateObject({
      model: getTitleModel(),
      schema: matchSchema,
      prompt: `You map a student's pasted GCSE maths topics to our available missions.

Available missions (slug — title):
${missions.map((m) => `${m.slug} — ${m.title}`).join("\n")}

For each pasted topic below, return the slug of the SINGLE best-matching mission, or null if none is a genuinely good match (do not force weak matches).

Pasted topics:
${topics.map((t) => `- ${t}`).join("\n")}`,
    });
    matchResult = object;
  } catch (error) {
    console.error("[match-topics] LLM matching failed:", error);
    // Fail soft: nothing matched, everything is a request candidate.
    matchResult = { matches: topics.map((t) => ({ input: t, slug: null })) };
  }

  const matched: MatchedTopic[] = [];
  const unavailable: string[] = [];

  for (const m of matchResult.matches) {
    const mission = m.slug ? bySlug.get(m.slug) : undefined;
    if (mission) {
      matched.push({ input: m.input, slug: mission.slug, title: mission.title });
    } else {
      unavailable.push(m.input);
    }
  }

  // Any pasted topic the model omitted is treated as unavailable.
  const seen = new Set(matchResult.matches.map((m) => m.input));
  for (const t of topics) {
    if (!seen.has(t)) {
      unavailable.push(t);
    }
  }

  // Record curiculum gaps for the admin (fire-and-forget; never blocks the user).
  await Promise.all(
    unavailable.map((t) =>
      recordTopicRequest({ topicText: t, requestedByUserId: userId }).catch(
        (e) => console.error("[match-topics] recordTopicRequest failed:", e)
      )
    )
  );

  return NextResponse.json({ matched, unavailable } satisfies MatchTopicsResponse);
}
