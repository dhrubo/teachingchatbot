import { Parser } from "expr-eval";
import type { QuestionArchetype } from "@/lib/db/schema";
import { ANSWER_HELPERS } from "./answer-helpers";

export type GeneratedQuestionValue = {
  archetypeSlug: string;
  skillSlug: string;
  difficultyBand: QuestionArchetype["difficultyBand"];
  questionType: QuestionArchetype["questionType"];
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  hint: string | null;
  explanation: string | null;
  variables: Record<string, number | string>;
  rules: Record<string, unknown>;
};

// Evaluate an archetype expression string against the resolved variable bag.
// Uses expr-eval Parser which has no access to Node.js globals, file I/O, or
// prototype pollution — safe even if expressions came from untrusted input.
function evaluateExpression(
  expression: string,
  scope: Record<string, unknown>
): unknown {
  const parser = new Parser({ operators: { comparison: true, concatenate: false } });
  const mergedScope = { ...ANSWER_HELPERS, ...scope };
  const normalized = expression.replace(/===/g, "==").replace(/!==/g, "!=");
  if (normalized.startsWith("`") && normalized.endsWith("`")) {
    const inner = normalized.slice(1, -1);
    return inner.replace(/\${([^}]+)}/g, (_, expr) =>
      String(parser.evaluate(expr, mergedScope as any))
    );
  }
  return parser.evaluate(normalized, mergedScope as any);
}

function evaluateTemplate(
  expression: string,
  scope: Record<string, unknown>
): string {
  return String(evaluateExpression(expression, scope));
}

const pickRandom = <T>(arr: T[], rng: () => number): T =>
  arr[Math.floor(rng() * arr.length)];

/**
 * Resolve the archetype's variableSchemaJson into a concrete bag of values.
 *
 * Schema value forms:
 *  - array of scalars      -> pick one at random
 *  - array of arrays       -> pick one tuple, also bound as `<key without trailing s>`
 *                             (the conventional binding is `pair` for `pairs`)
 *  - string                -> a JS expression evaluated against already-bound vars
 */
function resolveVariables(
  archetype: QuestionArchetype,
  rng: () => number
): Record<string, number | string> {
  const schema = (archetype.variableSchemaJson ?? {}) as Record<
    string,
    unknown
  >;
  const scope: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(schema)) {
    if (Array.isArray(def)) {
      const choice = pickRandom(def as unknown[], rng);
      if (Array.isArray(choice)) {
        // Tuple pool (e.g. "pairs"): expose the tuple as a singular binding.
        const singular = key.endsWith("s") ? key.slice(0, -1) : `${key}_item`;
        scope[singular] = choice;
        scope[key] = choice;
      } else {
        scope[key] = choice as number | string;
      }
    } else if (typeof def === "string") {
      scope[key] = evaluateExpression(def, scope) as number | string;
    } else {
      scope[key] = def as number | string;
    }
  }

  // Only return scalar bindings (drop tuple/array helpers) for substitution.
  const out: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(scope)) {
    if (typeof value === "number" || typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

// Substitute {expr} placeholders in a template string. Each placeholder is
// evaluated as a JS expression against the variable bag (so "{a}", "{a+b}",
// "{price*pct/100}" and "{answer}" all work). Falls back to the literal text if
// the expression can't be evaluated, so a stray brace never breaks rendering.
function substitute(
  template: string,
  scope: Record<string, number | string>
): string {
  return template.replace(/\{([^{}]+)\}/g, (match, expr: string) => {
    try {
      return `${evaluateExpression(expr, scope)}`;
    } catch {
      return match;
    }
  });
}

function buildOptions(archetype: QuestionArchetype): string[] | null {
  if (archetype.questionType !== "multiple_choice") {
    return null;
  }
  const rules = (archetype.acceptableAnswerRulesJson ?? {}) as {
    options?: string[];
  };
  return rules.options ?? null;
}

/**
 * Generate a concrete question from an archetype. Pure + deterministic given the
 * provided rng. Returns null only if evaluation fails (bad seed data).
 */
export function generateFromArchetype(
  archetype: QuestionArchetype,
  rng: () => number = Math.random
): GeneratedQuestionValue | null {
  try {
    const variables = resolveVariables(archetype, rng);
    const prompt = substitute(archetype.template, variables);
    const correctAnswer = evaluateTemplate(
      archetype.answerExpression,
      variables
    );
    // Hints/explanations may reference the computed answer via {answer}.
    const withAnswer = { ...variables, answer: correctAnswer };
    const hint = archetype.hintTemplate
      ? substitute(archetype.hintTemplate, withAnswer)
      : null;
    const explanation = archetype.explanationTemplate
      ? substitute(archetype.explanationTemplate, withAnswer)
      : null;
    const options = buildOptions(archetype);

    return {
      archetypeSlug: archetype.slug,
      skillSlug: archetype.skillSlug,
      difficultyBand: archetype.difficultyBand,
      questionType: archetype.questionType,
      prompt,
      options,
      correctAnswer,
      hint,
      explanation,
      variables,
      rules: (archetype.acceptableAnswerRulesJson ?? {}) as Record<
        string,
        unknown
      >,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[generate-from-archetype] failed for ${archetype.slug}:`,
        error
      );
    }
    return null;
  }
}
