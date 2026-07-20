import {
  type ExpectedResponseType,
  resolveVoiceCommand,
  type VoiceCommand,
} from "./voice-commands";
import {
  buildClarificationQuestion,
  parseSpokenMaths,
  type SpokenMathsCandidate,
  type SpokenMathsClarification,
} from "./spoken-maths";

// Pure decision function extracted from app/api/voice/transcribe/route.ts so
// it's unit-testable without a live audio upload — every piece it calls
// (resolveVoiceCommand, parseSpokenMaths, buildClarificationQuestion) is
// itself already pure/deterministic, so this has no DB/network/audio
// dependency at all.
export type VoiceTurnClassification =
  | { kind: "command"; command: VoiceCommand; matchedPhrase: string }
  | {
      kind: "clarification_needed";
      clarification: SpokenMathsClarification;
      candidates: SpokenMathsCandidate[];
      ambiguityReason: string | null;
    }
  | { kind: "answer"; candidateAnswer: string; confidence: number }
  | { kind: "teaching_turn" };

/**
 * Classifies a speech-to-text transcript into exactly one of:
 *  - a control command the app should handle itself (no LLM call),
 *  - a spoken-maths answer that's ambiguous/low-confidence and needs a
 *    deterministic clarification question (no LLM call),
 *  - a clean answer candidate for the client to submit via the EXISTING
 *    server-authoritative /api/adaptive-challenge submit-answer flow (this
 *    function never grades), or
 *  - a general teaching utterance that needs the voice tutor LLM call.
 *
 * `expectedResponseType` should only be passed when there's an active
 * graded question waiting for an answer — omitting it (e.g. mid-lesson
 * conversation with no pending question) always routes past the
 * command/spoken-maths branches into "teaching_turn" once no command matches.
 */
export function classifyVoiceTurn(
  transcript: string,
  expectedResponseType?: ExpectedResponseType
): VoiceTurnClassification {
  const command = resolveVoiceCommand(transcript, expectedResponseType);
  if (command) {
    return { kind: "command", command: command.command, matchedPhrase: command.matchedPhrase };
  }

  if (expectedResponseType) {
    const parsed = parseSpokenMaths(transcript);
    if (parsed.requiresConfirmation) {
      const clarification = buildClarificationQuestion(parsed);
      // buildClarificationQuestion only returns null when requiresConfirmation
      // is false, which can't happen here — this satisfies the type checker
      // without silently swallowing a real "nothing to ask" case.
      if (clarification) {
        return {
          kind: "clarification_needed",
          clarification,
          candidates: parsed.candidates,
          ambiguityReason: parsed.ambiguityReason,
        };
      }
    }
    const best = parsed.candidates[0];
    return { kind: "answer", candidateAnswer: best.value, confidence: best.confidence };
  }

  return { kind: "teaching_turn" };
}
