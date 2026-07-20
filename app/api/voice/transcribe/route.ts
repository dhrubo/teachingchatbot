import { type NextRequest, NextResponse } from "next/server";
import { getAppConfig } from "@/lib/app-config";
import { recordAiCall } from "@/lib/ai/ai-call-log";
import { getTutorProviderCandidates, isQuotaError } from "@/lib/ai/providers";
import type { TutorMode } from "@/lib/ai/prompts-tutor";
import {
  buildVoiceTutorPrompt,
  VOICE_TUTOR_PROMPT_VERSION,
  type AnswerPolicy,
  type Representation,
  type VoiceLessonContext,
} from "@/lib/ai/voice-tutor-prompt";
import { runVoiceTutorTurn } from "@/lib/ai/voice-tutor-validator";
import { transcribeAudio } from "@/lib/ai/stt-providers";
import { logAICall } from "@/lib/db/queries/analytics";
import { getConfirmedWeaknesses } from "@/lib/db/queries/learning-science";
import {
  getVoiceSessionById,
  touchVoiceSession,
} from "@/lib/db/queries/voice-sessions";
import { ChatbotError } from "@/lib/errors";
import { checkVoiceRateLimit } from "@/lib/ratelimit";
import { notifyHighRiskMessage } from "@/lib/privacy/escalation";
import { classifyVoiceTurn } from "@/lib/voice/classify-voice-turn";
import { resolveVoiceCaller } from "@/lib/voice/resolve-voice-caller";
import type { ExpectedResponseType } from "@/lib/voice/voice-commands";
import {
  checkVoiceSessionOwnership,
  isVoiceSessionActive,
} from "@/lib/voice/voice-session";

const VALID_MODES: readonly TutorMode[] = [
  "teach",
  "reteach",
  "hint",
  "mistake_explanation",
  "reflection",
  "worked_solution",
];
const VALID_ANSWER_POLICIES: readonly AnswerPolicy[] = [
  "do_not_reveal",
  "may_explain_after_submission",
];
const VALID_EXPECTED_RESPONSE_TYPES: readonly ExpectedResponseType[] = [
  "multiple_choice",
  "short_text",
  "numeric",
  "free_text",
];
const VALID_REPRESENTATIONS: readonly Representation[] = [
  "concrete",
  "visual",
  "symbolic",
  "analogy",
];

function parseStringField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseNumberField(formData: FormData, key: string): number | undefined {
  const value = parseStringField(formData, key);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRepresentations(formData: FormData): Representation[] | undefined {
  const raw = parseStringField(formData, "representationsAlreadyTried");
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    return parsed.filter((r): r is Representation =>
      VALID_REPRESENTATIONS.includes(r)
    );
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = getAppConfig();
    if (!config.voiceEnabled) {
      return new ChatbotError(
        "bad_request:voice",
        "Voice is not enabled on this deployment"
      ).toResponse();
    }

    const caller = await resolveVoiceCaller();
    if (!caller) {
      return new ChatbotError("unauthorized:voice").toResponse();
    }

    if (!checkVoiceRateLimit(caller.callerId, config.voiceRequestsPerHour)) {
      return new ChatbotError("rate_limit:voice").toResponse();
    }

    const formData = await request.formData();
    const voiceSessionId = parseStringField(formData, "voiceSessionId");
    const audio = formData.get("audio");
    if (!voiceSessionId || !(audio instanceof Blob)) {
      return new ChatbotError(
        "bad_request:voice",
        "voiceSessionId and an audio file are required"
      ).toResponse();
    }

    if (audio.size > config.voiceMaxAudioFileBytes) {
      return new ChatbotError(
        "bad_request:voice",
        "Audio file is too large"
      ).toResponse();
    }

    const voiceSession = await getVoiceSessionById(voiceSessionId);
    if (!voiceSession) {
      return new ChatbotError("not_found:voice").toResponse();
    }
    if (!checkVoiceSessionOwnership(voiceSession, caller)) {
      return new ChatbotError("forbidden:voice").toResponse();
    }
    if (!isVoiceSessionActive(voiceSession)) {
      return new ChatbotError("not_found:voice").toResponse();
    }
    await touchVoiceSession(voiceSessionId);

    let transcript: string;
    try {
      const audioBuffer = await audio.arrayBuffer();
      const transcription = await transcribeAudio({
        data: audioBuffer,
        mimeType: audio.type || "audio/webm",
      });
      transcript = transcription.text;
    } catch (error) {
      return new ChatbotError(
        "bad_request:voice",
        error instanceof Error ? error.message : "Voice transcription failed"
      ).toResponse();
    }

    const rawExpectedResponseType = parseStringField(formData, "expectedResponseType");
    const expectedResponseType = VALID_EXPECTED_RESPONSE_TYPES.includes(
      rawExpectedResponseType as ExpectedResponseType
    )
      ? (rawExpectedResponseType as ExpectedResponseType)
      : undefined;

    const classification = classifyVoiceTurn(transcript, expectedResponseType);

    if (classification.kind === "command") {
      return NextResponse.json({
        kind: "command",
        command: classification.command,
        matchedPhrase: classification.matchedPhrase,
        transcript,
      });
    }

    if (classification.kind === "clarification_needed") {
      return NextResponse.json({
        kind: "clarification_needed",
        transcript,
        candidates: classification.candidates,
        ambiguityReason: classification.ambiguityReason,
        ...classification.clarification,
      });
    }

    if (classification.kind === "answer") {
      // Never graded here — the client submits this candidate text through
      // the existing, server-authoritative /api/adaptive-challenge
      // submit-answer flow (see lib/adaptive/engine.ts).
      return NextResponse.json({
        kind: "answer",
        transcript,
        candidateAnswer: classification.candidateAnswer,
        confidence: classification.confidence,
      });
    }

    // classification.kind === "teaching_turn" — the only path that calls the LLM.
    const rawMode = parseStringField(formData, "mode");
    const mode: TutorMode = VALID_MODES.includes(rawMode as TutorMode)
      ? (rawMode as TutorMode)
      : "teach";
    const rawAnswerPolicy = parseStringField(formData, "answerPolicy");
    const answerPolicy: AnswerPolicy = VALID_ANSWER_POLICIES.includes(
      rawAnswerPolicy as AnswerPolicy
    )
      ? (rawAnswerPolicy as AnswerPolicy)
      : "do_not_reveal";
    const activeTopic = parseStringField(formData, "activeTopic") ?? "this topic";
    const learningObjective =
      parseStringField(formData, "learningObjective") ?? activeTopic;
    const skillSlug = parseStringField(formData, "skillSlug");
    const maxDisplayWords = parseNumberField(formData, "maxDisplayWords");
    const maxSpokenWords = parseNumberField(formData, "maxSpokenWords");
    const representationsAlreadyTried = parseRepresentations(formData);

    // Only ever revealed for modes that legitimately need it, and only once
    // the answer has ALREADY been graded server-side and revealed to the
    // client via submit-answer — same convention as
    // app/api/ai/explain-error/route.ts's correctAnswer param. Never passed
    // when answerPolicy is do_not_reveal.
    const finalAnswer =
      answerPolicy === "may_explain_after_submission"
        ? parseStringField(formData, "finalAnswer") ?? null
        : null;

    // Server-derived ONLY — never accept a misconception claim from the
    // client. Deliberately scoped to an exact skillSlug match so a
    // confirmed weakness from an unrelated topic is never misattributed to
    // this conversation (see lib/ai/voice-tutor-prompt.ts's VoiceLessonContext
    // comment).
    let misconceptionTag: string | null = null;
    if (caller.studentId && skillSlug) {
      const confirmed = await getConfirmedWeaknesses(caller.studentId);
      misconceptionTag =
        confirmed.find((w) => w.skillSlug === skillSlug)?.misconception ?? null;
    }

    const voiceContext: VoiceLessonContext = {
      mode,
      activeTopic,
      learningObjective,
      answerPolicy,
      misconception: misconceptionTag
        ? { description: misconceptionTag.replace(/_/g, " "), status: "confirmed" }
        : null,
      representationsAlreadyTried,
      maxDisplayWords,
      maxSpokenWords,
    };

    const basePrompt = buildVoiceTutorPrompt(voiceContext);
    const candidates = getTutorProviderCandidates();
    if (candidates.length === 0) {
      return new ChatbotError(
        "bad_request:voice",
        "No AI provider is configured"
      ).toResponse();
    }

    const startedAt = Date.now();
    let turn: Awaited<ReturnType<typeof runVoiceTutorTurn>>;
    try {
      turn = await runVoiceTutorTurn({
        mode,
        basePrompt,
        userMessage: transcript,
        finalAnswer,
        confirmedMisconceptions: misconceptionTag ? [misconceptionTag] : undefined,
        maxDisplayWords,
        maxSpokenWords,
        candidates,
      });
    } catch (error) {
      if (isQuotaError(error)) {
        return new ChatbotError(
          "bad_request:voice",
          "Voice tutor is temporarily overloaded — please try again shortly"
        ).toResponse();
      }
      throw error;
    }

    recordAiCall(turn.provider, turn.modelName, "voice_tutor", `voice-${Date.now()}`, {
      promptVersion: VOICE_TUTOR_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      repairStatus: turn.repairStatus,
      violations: turn.violations,
    });

    if (turn.repairStatus === "fallback") {
      notifyHighRiskMessage({
        studentId: caller.studentId,
        mode,
        violations: turn.violations,
      }).catch(() => {
        /* best-effort — never block or fail the response */
      });
    }

    await logAICall({
      studentId: caller.studentId ?? null,
      purpose: "voice_tutor",
      modelUsed: turn.modelName,
      promptTokens: 0,
      completionTokens: 0,
    }).catch(() => {
      /* non-fatal — logging should never block the response */
    });

    return NextResponse.json({
      kind: "tutor_reply",
      transcript,
      displayText: turn.displayText,
      spokenText: turn.spokenText,
      repairStatus: turn.repairStatus,
    });
  } catch (error) {
    console.error("[api/voice/transcribe] error:", error);
    return new ChatbotError(
      "bad_request:voice",
      "Failed to process voice input"
    ).toResponse();
  }
}
