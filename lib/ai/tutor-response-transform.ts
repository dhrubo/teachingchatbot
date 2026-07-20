import { generateText, type LanguageModel, type ModelMessage, type TextStreamPart, type ToolSet } from "ai";
import type { TutorMode } from "./prompts-tutor";
import {
  buildRepairPrompt,
  getFallbackText,
  validateTutorResponse,
  type RepairStatus,
  type TutorValidationContext,
  type ViolationCode,
} from "./tutor-validator";

export type TutorTransformOutcome = {
  repairStatus: RepairStatus;
  violations: ViolationCode[];
  finalText: string;
};

/**
 * A streamText `experimental_transform` that makes bounded response repair
 * actually BLOCKING for a streaming, tool-calling turn (not just an
 * after-the-fact log): it buffers every chunk of the turn (across all
 * multi-step tool calls) instead of forwarding text live, validates the
 * complete visible text once the model has finished, runs at most one
 * repair call if needed, and only then releases the (possibly replaced)
 * chunks to the client.
 *
 * Trade-off, stated plainly: the student no longer sees live token-by-token
 * typing for this route — the whole turn (text + any tool-call UI parts)
 * appears together once generation completes. That's the necessary cost of
 * genuinely gating what's sent, not an accidental regression.
 *
 * Tool `execute()` side effects that write to the outer UI message stream
 * via their own closure (updateStudentProfile, startNewTopicSession — see
 * app/(chat)/api/chat/route.ts) are NOT affected by this transform; they run
 * as part of the model's tool-calling loop independent of when this stream
 * is consumed.
 */
export function createTutorValidationTransform<TOOLS extends ToolSet>(params: {
  mode: TutorMode;
  basePrompt: string;
  validationContext: TutorValidationContext;
  repairModel: LanguageModel;
  messages: ModelMessage[];
  onResult: (result: TutorTransformOutcome) => void;
}): (options: { tools: TOOLS; stopStream: () => void }) => TransformStream<
  TextStreamPart<TOOLS>,
  TextStreamPart<TOOLS>
> {
  return () => {
    const buffered: TextStreamPart<TOOLS>[] = [];
    const textById = new Map<string, string>();
    const textOrder: string[] = [];

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, _controller) {
        buffered.push(chunk);
        if (chunk.type === "text-delta") {
          if (!textById.has(chunk.id)) {
            textOrder.push(chunk.id);
          }
          textById.set(chunk.id, (textById.get(chunk.id) ?? "") + chunk.text);
        }
        // Nothing forwarded here — everything is released in flush() below,
        // after the full turn has been validated.
      },
      async flush(controller) {
        const fullText = textOrder
          .map((id) => textById.get(id) ?? "")
          .join("\n")
          .trim();

        let repairStatus: RepairStatus = "none";
        let violations: ViolationCode[] = [];
        let replacementText: string | null = null;

        if (fullText.length > 0) {
          const draftCheck = validateTutorResponse(fullText, params.validationContext);
          if (!draftCheck.valid) {
            let repairedText: string | null = null;
            try {
              const repairPrompt = buildRepairPrompt(params.basePrompt, draftCheck.violations);
              const { text } = await generateText({
                model: params.repairModel,
                system: repairPrompt,
                messages: params.messages,
              });
              repairedText = text;
            } catch {
              repairedText = null;
            }

            const repairedCheck = repairedText
              ? validateTutorResponse(repairedText, params.validationContext)
              : { valid: false as const, violations: draftCheck.violations };

            if (repairedText && repairedCheck.valid) {
              repairStatus = "repaired";
              replacementText = repairedText;
            } else {
              repairStatus = "fallback";
              violations = repairedCheck.valid ? [] : repairedCheck.violations;
              replacementText = getFallbackText(params.mode);
            }
          }
        }

        params.onResult({
          repairStatus,
          violations,
          finalText: replacementText ?? fullText,
        });

        if (replacementText === null) {
          // Draft passed validation (or there was no text at all) — replay
          // the buffered turn exactly as generated.
          for (const chunk of buffered) {
            controller.enqueue(chunk);
          }
          return;
        }

        // Replace every original text segment with ONE new block carrying
        // the repaired/fallback text, in the position of the first original
        // text segment — everything else (tool calls, step markers) replays
        // unchanged and in original order.
        const replacementId = textOrder[0] ?? "tutor-repaired-text";
        let injected = false;
        for (const chunk of buffered) {
          if (
            chunk.type === "text-start" ||
            chunk.type === "text-delta" ||
            chunk.type === "text-end"
          ) {
            if (!injected) {
              controller.enqueue({ type: "text-start", id: replacementId } as TextStreamPart<TOOLS>);
              controller.enqueue({
                type: "text-delta",
                id: replacementId,
                text: replacementText,
              } as TextStreamPart<TOOLS>);
              controller.enqueue({ type: "text-end", id: replacementId } as TextStreamPart<TOOLS>);
              injected = true;
            }
            continue;
          }
          controller.enqueue(chunk);
        }
        if (!injected) {
          // No text segment existed at all (e.g. a tool-only turn) — still
          // surface the fallback/repaired text so the student is never left
          // with an empty turn.
          controller.enqueue({ type: "text-start", id: replacementId } as TextStreamPart<TOOLS>);
          controller.enqueue({
            type: "text-delta",
            id: replacementId,
            text: replacementText,
          } as TextStreamPart<TOOLS>);
          controller.enqueue({ type: "text-end", id: replacementId } as TextStreamPart<TOOLS>);
        }
      },
    });
  };
}
