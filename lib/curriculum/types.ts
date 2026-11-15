import { z } from "zod";
import type { ExplanationLens } from "@/lib/db/schema";

export type EdexcelStrandId =
  | "number"
  | "algebra"
  | "ratio"
  | "geometry"
  | "probability"
  | "statistics";

export type EdexcelStrandMeta = {
  id: EdexcelStrandId;
  title: string;
  edexcelRef: string;
  summary: string;
  accentColor: string;
};

export const LENS_META: Record<
  ExplanationLens,
  {
    id: ExplanationLens;
    label: string;
    shortLabel: string;
    ranedeerMapping: string;
    description: string;
  }
> = {
  story: {
    id: "story",
    label: "Real-World Story",
    shortLabel: "Story",
    ranedeerMapping: "Storytelling + Analogical",
    description: "Everyday analogies, money, food, and concrete scenarios.",
  },
  visual: {
    id: "visual",
    label: "Visual Diagram",
    shortLabel: "Visual",
    ranedeerMapping: "Visual + Intuitive",
    description: "Bar walls, timelines, area grids, and balance scales.",
  },
  pattern: {
    id: "pattern",
    label: "Why It Works",
    shortLabel: "Why It Works",
    ranedeerMapping: "Inductive + Causal",
    description: "Spot the underlying pattern so you never memorize blindly.",
  },
  exam: {
    id: "exam",
    label: "Edexcel Exam Method",
    shortLabel: "Exam Steps",
    ranedeerMapping: "Formal + Deductive (1MA1 Mark Scheme)",
    description: "Exact M1/A1 working out and Paper 1/2/3 mark-scheme tips.",
  },
  socratic: {
    id: "socratic",
    label: "Socratic Guided Check",
    shortLabel: "Socratic",
    ranedeerMapping: "Active + Socratic",
    description:
      "Short guided back-and-forth questions one micro-step at a time.",
  },
};

export const ALL_LENSES: readonly ExplanationLens[] = [
  "visual",
  "story",
  "pattern",
  "exam",
  "socratic",
];

export const visualModelSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("fraction-wall"),
    title: z.string(),
    bars: z
      .array(
        z.object({
          label: z.string(),
          numerator: z.number(),
          denominator: z.number(),
          equivalentSubdivisions: z.number().optional(),
          color: z.enum(["coral", "violet", "emerald", "amber"]).optional(),
        })
      )
      .min(1)
      .max(4),
    resultNote: z.string().optional(),
  }),
  z.object({
    kind: z.literal("multiplier-timeline"),
    title: z.string(),
    unitPrefix: z.string().optional(),
    multiplierLabel: z.string(),
    steps: z
      .array(
        z.object({
          label: z.string(),
          principal: z.number(),
          interestAdded: z.number(),
          total: z.number(),
        })
      )
      .min(2)
      .max(6),
  }),
  z.object({
    kind: z.literal("area-grid"),
    title: z.string(),
    rowHeaders: z.array(z.string()).min(1).max(4),
    colHeaders: z.array(z.string()).min(1).max(4),
    cells: z.array(z.array(z.string())),
    shadedCount: z.number().optional(),
    totalCells: z.number().optional(),
    caption: z.string().optional(),
  }),
  z.object({
    kind: z.literal("number-line"),
    title: z.string(),
    min: z.number(),
    max: z.number(),
    tickStep: z.number(),
    points: z
      .array(
        z.object({
          value: z.number(),
          label: z.string(),
          style: z.enum(["filled", "hollow"]).optional(),
        })
      )
      .optional(),
    jumps: z
      .array(
        z.object({
          from: z.number(),
          to: z.number(),
          label: z.string(),
        })
      )
      .optional(),
  }),
  z.object({
    kind: z.literal("equation-balance"),
    title: z.string(),
    leftSide: z.string(),
    rightSide: z.string(),
    operationBadge: z.string().optional(),
    caption: z.string().optional(),
  }),
  z.object({
    kind: z.literal("triangle-trig"),
    title: z.string(),
    baseLabel: z.string(),
    heightLabel: z.string(),
    hypotenuseLabel: z.string(),
    angleLabel: z.string().optional(),
    highlightSide: z.enum(["base", "height", "hypotenuse"]).optional(),
    formulaNote: z.string().optional(),
  }),
]);

export type VisualModelSpec = z.infer<typeof visualModelSchema>;

export const whiteboardStepSchema = z.object({
  label: z.string(),
  latex: z.string(),
  note: z.string().optional(),
});

export type WhiteboardStep = z.infer<typeof whiteboardStepSchema>;

export const whiteboardStateSchema = z.object({
  headline: z.string(),
  lens: z.enum(["story", "visual", "pattern", "exam", "socratic"]),
  steps: z.array(whiteboardStepSchema).min(1).max(5),
  visual: visualModelSchema.optional(),
  examTip: z.string().optional(),
});

export type WhiteboardState = z.infer<typeof whiteboardStateSchema>;

export type PrerequisiteNode = {
  code: string; // e.g. "0.1", "0.2" (Mr. Ranedeer Prerequisite Curriculum)
  title: string;
  summary: string;
  spokenExplanation: string;
  checkQuestion: string;
  spokenQuestion: string;
  canonicalAnswer: string;
  acceptedVariants?: string[];
  board: WhiteboardState;
};

export type MainCurriculumNode = {
  code: string; // e.g. "1.1", "1.2", "1.3" (Mr. Ranedeer Main Curriculum)
  title: string;
  summary: string;
};

export type LensExplanation = {
  lens: ExplanationLens;
  spokenText: string;
  displayText: string;
  followUpQuestion: string;
  board: WhiteboardState;
};

export type TestChallenge = {
  difficulty: 3 | 6 | 9; // Mr. Ranedeer 3/10, 6/10, 9/10 ramp
  label: string;
  questionText: string;
  spokenQuestion: string;
  canonicalAnswer: string;
  acceptedVariants?: string[];
  unit?: string;
  hintSpoken: string;
  workedSolutionSpoken: string;
  workedSolutionBoard: WhiteboardState;
};

export type EdexcelTopic = {
  slug: string;
  edexcelCode: string;
  strand: EdexcelStrandId;
  title: string;
  subtitle: string;
  tier: "foundation" | "crossover" | "higher";
  gradeRange: string;
  calculator: "non-calc" | "calc" | "both";
  estimatedMinutes: number;
  featured?: boolean;
  prerequisites: PrerequisiteNode[];
  mainCurriculum: MainCurriculumNode[];
  lenses: Record<ExplanationLens, LensExplanation>;
  testQuestions: TestChallenge[];
};
