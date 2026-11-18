import { z } from "zod";
import { detectEdexcelTopic } from "@/lib/curriculum/detect-topic";
import {
  EDEXCEL_TOPICS,
  getTopicBySlug,
  pickNextExplanationLens,
} from "@/lib/curriculum/edexcel-1ma1";
import { LENS_META } from "@/lib/curriculum/types";
import type {
  EdexcelTier,
  ExplanationLens,
  StoredTutorTurn,
  ToneStyle,
} from "@/lib/db/schema";
import { sanitizeForSpeech } from "@/lib/math/check-answer";
import { generateStructuredWithFallback } from "./providers";

const VALID_TOPIC_SLUGS = EDEXCEL_TOPICS.map((t) => t.slug) as [
  string,
  ...string[],
];

const askChatLlmSchema = z.object({
  detectedTopicSlug: z.enum(VALID_TOPIC_SLUGS),
  spokenText: z.string().min(8).max(520),
  displayText: z.string().min(12).max(900),
  steps: z
    .array(
      z.object({
        label: z.string().min(2).max(60),
        latex: z.string().min(1).max(200),
        note: z.string().max(160).optional(),
      })
    )
    .min(2)
    .max(5),
  examTip: z.string().min(5).max(220),
});

const ASK_CHAT_SCHEMA_HINT = `{
  "detectedTopicSlug": "one of: ${VALID_TOPIC_SLUGS.join(" | ")}",
  "spokenText": "2 to 4 warm, conversational English podcast-host sentences for Jori explaining how to work out the answer and stating the result in natural words (NO raw LaTeX backslashes or carets).",
  "displayText": "Friendly, crystal-clear written summary of the method and the worked answer.",
  "steps": [
    { "label": "Step 1: Find multiplier", "latex": "1 + 0.05 = 1.05", "note": "Add 5% to 100%" },
    { "label": "Step 2: Apply 3 years", "latex": "800 \\\\times 1.05^3 = £926.10", "note": "Round money to 2 d.p." }
  ],
  "examTip": "Pearson Edexcel 1MA1 mark-scheme tip (M1/A1 working tip)"
}`;

export type AskMathsResponse = {
  detectedTopicSlug: string;
  detectedTopicTitle: string;
  detectedEdexcelCode: string;
  confidence: "high" | "medium" | "fallback";
  lensUsed: ExplanationLens;
  spokenText: string;
  displayText: string;
  boardSteps: Array<{ label: string; latex: string; note?: string }>;
  examTip: string;
  providerUsed: string;
};

export async function answerStudentMathsQuestion(input: {
  question: string;
  tier: EdexcelTier;
  targetGrade: number;
  toneStyle: ToneStyle;
  preferredLens: ExplanationLens;
  explicitTopicSlug?: string;
  alternateLens?: boolean;
  lensesTried?: readonly ExplanationLens[];
  recentTurns?: readonly StoredTutorTurn[];
}): Promise<AskMathsResponse> {
  const detection = detectEdexcelTopic(input.question);
  const initialTopic =
    (input.explicitTopicSlug
      ? getTopicBySlug(input.explicitTopicSlug)
      : undefined) ?? detection.topic;

  const lensToUse = input.alternateLens
    ? pickNextExplanationLens(input.preferredLens, input.lensesTried ?? [])
    : input.preferredLens;

  const topicCatalogue = EDEXCEL_TOPICS.map(
    (t) => `- ${t.slug}: ${t.title} (Edexcel ${t.edexcelCode}, ${t.gradeRange})`
  ).join("\n");

  const system = [
    "=== MR. RANEDEER ASK-ANYTHING GCSE MATHS TUTOR (EDEXCEL 1MA1) ===",
    `Student Tier: ${input.tier === "higher" ? "Higher (Grades 4–9)" : "Foundation (Grades 1–5)"}, Target Grade ${input.targetGrade}, Tone: ${input.toneStyle}.`,
    `Explanation Lens Style: ${LENS_META[lensToUse].label} — ${LENS_META[lensToUse].description}`,
    "",
    "Available Edexcel 1MA1 Topics (pick the closest slug for `detectedTopicSlug`):",
    topicCatalogue,
    "",
    "Rules:",
    "1. Work out which Edexcel 1MA1 topic matches the student's question.",
    "2. Explain BOTH the underlying method AND the step-by-step worked answer clearly so the student genuinely understands every line of working.",
    "3. Put crisp numbered working equations in `steps[].latex` (valid KaTeX without surrounding `$` signs) with short plain-English notes in `steps[].note`.",
    "4. `spokenText` is voiced by Jori in English Podcast Mode AND printed live word-by-word as she speaks: keep it to 2–4 warm, conversational podcast-style sentences (under 65 words) using natural spoken words ('three quarters', 'squared', 'pounds') and NEVER raw LaTeX symbols.",
    "5. Stay strictly within secondary-school GCSE Mathematics and keep everything child-safe.",
  ].join("\n");

  const historyContext = (input.recentTurns ?? [])
    .slice(-4)
    .map((t) => `${t.role === "learner" ? "Student" : "Tutor"}: ${t.text}`)
    .join("\n");

  const prompt = [
    historyContext ? `Recent chat context:\n${historyContext}\n` : "",
    `Pre-detected candidate topic: ${initialTopic.slug} (${initialTopic.title}, confidence: ${detection.confidence})`,
    `Student's question: "${input.question.trim()}"`,
    input.alternateLens
      ? `Explain this using a fresh ${LENS_META[lensToUse].label} perspective!`
      : "Identify the topic, break down the worked steps clearly, and explain the answer.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const generated = await generateStructuredWithFallback({
      system,
      prompt,
      schema: askChatLlmSchema,
      schemaHint: ASK_CHAT_SCHEMA_HINT,
    });

    const finalTopic =
      (detection.confidence === "high"
        ? initialTopic
        : getTopicBySlug(generated.data.detectedTopicSlug)) ?? initialTopic;

    return {
      detectedTopicSlug: finalTopic.slug,
      detectedTopicTitle: finalTopic.title,
      detectedEdexcelCode: finalTopic.edexcelCode,
      confidence:
        detection.confidence === "fallback" ? "medium" : detection.confidence,
      lensUsed: lensToUse,
      spokenText: sanitizeForSpeech(generated.data.spokenText),
      displayText: generated.data.displayText,
      boardSteps: generated.data.steps,
      examTip: generated.data.examTip,
      providerUsed: generated.providerUsed,
    };
  } catch {
    // Reliable curated fallback so Ask-Anything Chat always works even offline or on rate limits!
    const fallbackLens: ExplanationLens = input.alternateLens
      ? lensToUse
      : "exam";
    const pack = initialTopic.lenses[fallbackLens];

    return {
      detectedTopicSlug: initialTopic.slug,
      detectedTopicTitle: initialTopic.title,
      detectedEdexcelCode: initialTopic.edexcelCode,
      confidence: detection.confidence,
      lensUsed: fallbackLens,
      spokenText: `That comes under ${initialTopic.title}. ${pack.spokenText}`,
      displayText: `Topic matched: ${initialTopic.title} (${initialTopic.edexcelCode}). ${pack.displayText}`,
      boardSteps: pack.board.steps,
      examTip:
        pack.board.examTip ??
        `Show every working step clearly to secure Edexcel ${initialTopic.edexcelCode} method marks.`,
      providerUsed: "Edexcel Worked Method Engine",
    };
  }
}
