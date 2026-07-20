import { generateObject } from "ai";
import type { TutorMode } from "./prompts-tutor";
import type { ProviderCandidate } from "./providers";
import { isQuotaError } from "./providers";
import {
  buildRepairPrompt,
  getFallbackText,
  validateTutorResponse,
  type RepairStatus,
  type ViolationCode,
} from "./tutor-validator";
import {
  DEFAULT_MAX_DISPLAY_WORDS,
  DEFAULT_MAX_SPOKEN_WORDS,
  voiceTutorResponseSchema,
  type VoiceTutorResponse,
} from "./voice-tutor-prompt";

export type VoiceTutorTurnResult = {
  displayText: string;
  spokenText: string;
  repairStatus: RepairStatus;
  violations: ViolationCode[];
  /** Stable provider id that produced the final result — "none" on total failure. */
  provider: string;
  modelName: string;
};

type ValidationCtx = {
  mode: TutorMode;
  finalAnswer?: string | null;
  confirmedMisconceptions?: string[];
  maxDisplayWords: number;
  maxSpokenWords: number;
};

/** Union of violations across BOTH fields — either one failing fails the whole turn. */
function validateBoth(
  response: VoiceTutorResponse,
  ctx: ValidationCtx
): ViolationCode[] {
  const displayResult = validateTutorResponse(response.displayText, {
    mode: ctx.mode,
    finalAnswer: ctx.finalAnswer,
    confirmedMisconceptions: ctx.confirmedMisconceptions,
    maxWords: ctx.maxDisplayWords,
  });
  const spokenResult = validateTutorResponse(response.spokenText, {
    mode: ctx.mode,
    finalAnswer: ctx.finalAnswer,
    confirmedMisconceptions: ctx.confirmedMisconceptions,
    maxWords: ctx.maxSpokenWords,
  });
  const violations = new Set<ViolationCode>();
  if (!displayResult.valid) {
    for (const v of displayResult.violations) {
      violations.add(v);
    }
  }
  if (!spokenResult.valid) {
    for (const v of spokenResult.violations) {
      violations.add(v);
    }
  }
  return [...violations];
}

/**
 * generateObject with the SAME provider-fallback-on-quota-error loop used by
 * app/api/ai/explain-error/route.ts's generateAttempt — reused here rather
 * than reinvented. Returns null only if every candidate is exhausted by
 * quota errors; a non-quota error still throws immediately.
 */
async function generateVoiceObject(
  systemPrompt: string,
  userMessage: string,
  candidates: ProviderCandidate[]
): Promise<{ object: VoiceTutorResponse; provider: string; modelName: string } | null> {
  for (const candidate of candidates) {
    try {
      const result = await generateObject({
        model: candidate.model,
        schema: voiceTutorResponseSchema,
        system: systemPrompt,
        prompt: userMessage,
      });
      return { object: result.object, provider: candidate.id, modelName: candidate.modelName };
    } catch (error) {
      if (isQuotaError(error)) {
        continue;
      }
      throw error;
    }
  }
  return null;
}

/**
 * Draft -> validate BOTH fields -> (at most ONE constrained repair call) ->
 * validate -> deterministic fallback. Mirrors runTutorTurn's exact
 * three-step sequence (lib/ai/tutor-validator.ts) — never recurses — just
 * validating two fields instead of one and calling generateObject instead
 * of a free-text generate().
 */
export async function runVoiceTutorTurn(params: {
  mode: TutorMode;
  basePrompt: string;
  userMessage: string;
  finalAnswer?: string | null;
  confirmedMisconceptions?: string[];
  maxDisplayWords?: number;
  maxSpokenWords?: number;
  candidates: ProviderCandidate[];
}): Promise<VoiceTutorTurnResult> {
  const ctx: ValidationCtx = {
    mode: params.mode,
    finalAnswer: params.finalAnswer,
    confirmedMisconceptions: params.confirmedMisconceptions,
    maxDisplayWords: params.maxDisplayWords ?? DEFAULT_MAX_DISPLAY_WORDS,
    maxSpokenWords: params.maxSpokenWords ?? DEFAULT_MAX_SPOKEN_WORDS,
  };

  const draft = await generateVoiceObject(
    params.basePrompt,
    params.userMessage,
    params.candidates
  );
  if (!draft) {
    throw new Error("All providers exhausted");
  }

  const draftViolations = validateBoth(draft.object, ctx);
  if (draftViolations.length === 0) {
    return {
      ...draft.object,
      repairStatus: "none",
      violations: [],
      provider: draft.provider,
      modelName: draft.modelName,
    };
  }

  const repairPrompt = buildRepairPrompt(params.basePrompt, draftViolations);
  const repaired = await generateVoiceObject(
    repairPrompt,
    params.userMessage,
    params.candidates
  );
  const repairedViolations = repaired ? validateBoth(repaired.object, ctx) : draftViolations;

  if (repaired && repairedViolations.length === 0) {
    return {
      ...repaired.object,
      repairStatus: "repaired",
      violations: [],
      provider: repaired.provider,
      modelName: repaired.modelName,
    };
  }

  const fallback = getFallbackText(params.mode);
  return {
    displayText: fallback,
    spokenText: fallback,
    repairStatus: "fallback",
    violations: repairedViolations,
    provider: repaired?.provider ?? draft.provider,
    modelName: repaired?.modelName ?? draft.modelName,
  };
}
