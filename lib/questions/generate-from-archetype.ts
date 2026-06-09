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

const HELPER_NAMES = Object.keys(ANSWER_HELPERS);
const HELPER_VALUES = Object.values(ANSWER_HELPERS);

// JS reserved words that a seed author might legitimately use as a variable
// name (e.g. {new} for a new price). These get aliased before evaluation.
const RESERVED = new Set([
  "new",
  "var",
  "let",
  "const",
  "delete",
  "in",
  "do",
  "if",
  "else",
  "return",
  "function",
  "class",
  "this",
  "void",
  "with",
]);

function safeName(name: string): string {
  return RESERVED.has(name) ? `__${name}` : name;
}

// Rewrite whole-word references to reserved-name variables in an expression.
function aliasExpression(expression: string, scopeNames: string[]): string {
  let out = expression;
  for (const name of scopeNames) {
    if (RESERVED.has(name)) {
      out = out.replace(new RegExp(`\\b${name}\\b`, "g"), safeName(name));
    }
  }
  return out;
}

// Evaluate an archetype expression string against the resolved variable bag.
// Expressions are author-controlled seed data (never user input), and only the
// whitelisted ANSWER_HELPERS plus the bound variables are in scope.
function evaluateExpression(
  expression: string,
  scope: Record<string, unknown>
): unknown {
  const scopeNames = Object.keys(scope);
  const aliasedNames = scopeNames.map(safeName);
  const scopeValues = Object.values(scope);
  const aliased = aliasExpression(expression, scopeNames);
  const fn = new Function(
    ...HELPER_NAMES,
    ...aliasedNames,
    `"use strict"; return (${aliased});`
  );
  return fn(...HELPER_VALUES, ...scopeValues);
}

// A template-literal style expression like "`${a+b}x`". We wrap raw values too.
function evaluateTemplate(
  expression: string,
  scope: Record<string, unknown>
): string {
  return `${evaluateExpression(expression, scope)}`;
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

// Substitute {var} placeholders in a template string.
function substitute(
  template: string,
  variables: Record<string, number | string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in variables ? `${variables[name]}` : match
  );
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
    const hint = archetype.hintTemplate
      ? substitute(archetype.hintTemplate, variables)
      : null;
    const explanation = archetype.explanationTemplate
      ? substitute(archetype.explanationTemplate, variables)
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
