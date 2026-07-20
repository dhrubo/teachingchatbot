import { ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
} from "ai";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import {
  CHUNKING_MESSAGE,
  detectLargeInput,
  extractTopics,
} from "@/lib/ai/detect-large-input";
import { getEntitlements } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getModelCapabilities,
} from "@/lib/ai/models";
import { buildTutorPrompt, TUTOR_PROMPT_VERSION } from "@/lib/ai/prompts-tutor";
import { resolveTutorMode } from "@/lib/ai/resolve-tutor-mode";
import {
  createTutorValidationTransform,
  type TutorTransformOutcome,
} from "@/lib/ai/tutor-response-transform";
import { VISIBLE_TOOL_TYPES, hasRenderableContent } from "@/lib/ai/visible-tools";
import { getTutorProviderCandidates, isUsingGateway } from "@/lib/ai/providers";
import { streamTextWithFallback } from "@/lib/ai/stream-with-provider-fallback";
import { recordAiCall } from "@/lib/ai/ai-call-log";
import { notifyHighRiskMessage } from "@/lib/privacy/escalation";
import { createChatTitle, isLLMTitleEnabled } from "@/lib/ai/title";
import { askQuestion } from "@/lib/ai/tools/ask-question";
import { getCurriculumTopics } from "@/lib/ai/tools/get-curriculum-topics";
import { manageGoals } from "@/lib/ai/tools/manage-goals";
import { startNewTopicSession } from "@/lib/ai/tools/start-new-topic-session";
import { logAICall } from "@/lib/db/queries/analytics";
import { getConfirmedWeaknesses } from "@/lib/db/queries/learning-science";
import { updateStudentProfile } from "@/lib/ai/tools/update-student-profile";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getApprovalStatus,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStudentProfile,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

// The app decides the tutor's mode — never the model. Today the one
// concrete, existing signal for a graded-answer turn is the `[CORRECT`/
// `[INCORRECT` directive text built client-side in
// hooks/use-active-chat.tsx and forwarded verbatim as the user message.
export const maxDuration = 60;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

// VISIBLE_TOOL_TYPES and hasRenderableContent live in lib/ai/visible-tools.ts

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const { id, message, messages, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const [, session] = await Promise.all([
      checkBotId().catch(() => null),
      auth(),
    ]);

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chatModel = allowedModelIds.has(selectedChatModel)
      ? selectedChatModel
      : DEFAULT_CHAT_MODEL;

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.type;

    const isToolApprovalFlow = Boolean(messages);

    // These reads are independent of each other — fire them concurrently rather
    // than paying for serial DB round-trips before the model can start.
    // getMessagesByChatId keyed on the request id returns [] for a not-yet-created
    // chat, which is harmless: we only use it when `chat` exists.
    const [messageCount, chat, chatMessages, approvalStatus, studentProfile] =
      await Promise.all([
        getMessageCountByUserId({
          id: session.user.id,
          differenceInHours: 1,
        }),
        getChatById({ id }),
        getMessagesByChatId({ id }),
        // Premium is admin-gated: only approved, signed-in users get it.
        userType === "guest"
          ? Promise.resolve(null)
          : getApprovalStatus(session.user.id),
        // Read-only learner evidence for the tutor's context, fetched server
        // side before the model call — the model never sees anything beyond
        // this (no raw transcripts, no PII).
        userType === "guest"
          ? Promise.resolve(null)
          : getStudentProfile(session.user.id),
      ]);

    const isPremiumUser = userType !== "guest" && approvalStatus === "approved";

    const confirmedMisconceptions = studentProfile
      ? await getConfirmedWeaknesses(studentProfile.id)
          .then((rows) => rows.slice(0, 3).map((r) => r.misconception))
          .catch(() => [])
      : [];

    if (messageCount > getEntitlements(userType).maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = chatMessages;
    } else if (message?.role === "user") {
      const title = isLLMTitleEnabled()
        ? "New chat"
        : createChatTitle(
            message.parts
              .filter((p) => p.type === "text")
              .map((p) => (p as { text: string }).text)
              .join(" ")
          );
      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
      if (isLLMTitleEnabled()) {
        titlePromise = generateTitleFromUserMessage({ message });
      } else {
        titlePromise = Promise.resolve(title);
      }
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            m.parts
              ?.filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied"
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? []
        )
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    // The app resolves the tutor's mode from the last user turn — the model
    // is never asked or allowed to pick it.
    const lastUserText = [...uiMessages]
      .reverse()
      .find((m) => m.role === "user")
      ?.parts?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n") ?? "";
    const tutorMode = resolveTutorMode(lastUserText);

    if (message?.role === "user") {
      // Persist the user message off the critical path. The current turn builds
      // `uiMessages` from memory (DB rows + this message), so this write only
      // matters for reload/edit on a *later* request — by which point `after()`
      // has flushed. Deferring it removes a DB round-trip from
      // time-to-first-token. Pass a CALLBACK (not an eagerly-started promise) so
      // it truly runs after the response, and swallow errors — a duplicate id
      // (Strict-Mode double-fire / resend) must not surface as an unhandled
      // rejection, and a missed user-message write is non-fatal here.
      after(async () => {
        try {
          await saveMessages({
            messages: [
              {
                chatId: id,
                id: message.id,
                role: "user",
                parts: message.parts,
                attachments: [],
                createdAt: new Date(),
              },
            ],
          });
        } catch {
          /* non-critical: the turn already used the in-memory message */
        }
      });
    }

    // Pre-processor: on the first message of a new chat, short-circuit a
    // pasted list / syllabus before involving the LLM, returning a short
    // chunking reply. Conservative detector — won't trip on normal questions.
    if (!chat && !isToolApprovalFlow && message?.role === "user") {
      const userText = message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n");
      const detection = detectLargeInput(userText);
      if (detection.triggered) {
        console.info("chat pre-processor", {
          mode: "chunking",
          reason: detection.reason,
          topicsCount: detection.topicsCount,
          inputLength: detection.inputLength,
          chatId: id,
        });
        // Must be a UUID — it's persisted into the uuid `id` column.
        const assistantId = generateUUID();
        const textId = generateId();
        const topics = extractTopics(userText);
        const chunkStream = createUIMessageStream<ChatMessage>({
          execute: ({ writer }) => {
            // Pin the parsed topics so the user can work through them.
            if (topics.length > 0) {
              writer.write({
                type: "data-topic-list",
                data: { topics },
              });
            }
            // Frame a complete assistant message so the client can assemble
            // and persist it: start → text-* → finish.
            writer.write({ type: "start", messageId: assistantId });
            writer.write({ type: "text-start", id: textId });
            writer.write({
              type: "text-delta",
              id: textId,
              delta: CHUNKING_MESSAGE,
            });
            writer.write({ type: "text-end", id: textId });
            writer.write({ type: "finish" });
          },
          onFinish: async ({ messages: finished }) => {
            if (finished.length > 0) {
              await saveMessages({
                messages: finished.map((m) => ({
                  id: m.id,
                  role: m.role,
                  parts: m.parts,
                  createdAt: new Date(),
                  attachments: [],
                  chatId: id,
                })),
              });
            }
          },
        });
        // Update the title in the background — never let it block or break
        // the chunking reply (it makes its own LLM call).
        if (titlePromise) {
          titlePromise
            .then((title) =>
              title ? updateChatTitleById({ chatId: id, title }) : null
            )
            .catch(() => {
              /* non-critical */
            });
        }
        return createUIMessageStreamResponse({ stream: chunkStream });
      }
    }

    const modelConfig = chatModels.find((m) => m.id === chatModel);
    const capabilities = await getModelCapabilities(chatModel);
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;

    const modelMessages = await convertToModelMessages(uiMessages);

    const activeTools = (
      isReasoningModel && !supportsTools
        ? []
        : [
            "getCurriculumTopics",
            "updateStudentProfile",
            "manageGoals",
            "startNewTopicSession",
            "askQuestion",
          ]
    ) as (
      | "getCurriculumTopics"
      | "updateStudentProfile"
      | "manageGoals"
      | "startNewTopicSession"
      | "askQuestion"
    )[];

    // Capture the LLM result for token usage logging in onFinish.
    // The execute callback and onFinish share the same closure scope.
    let llmResultRef: Awaited<
      ReturnType<typeof streamTextWithFallback>
    >["result"] | null = null;
    let transformOutcomeRef: TutorTransformOutcome | null = null;
    let providerRef = "unknown";
    let modelRef = "unknown";
    let requestIdRef = "unknown";

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        // Enforce one question / one bundle per response — the model can fire
        // multiple calls in a single generation, flooding the UI with
        // challenges the student can't answer. The guard skips duplicates.
        let questionAsked = false;

        const candidates = getTutorProviderCandidates(isPremiumUser);
        const basePrompt = buildTutorPrompt(tutorMode, { confirmedMisconceptions });

        const {
          result: llmResult,
          requestId,
          provider,
          model,
        } = await streamTextWithFallback(
          candidates,
          {
            system: basePrompt,
            messages: modelMessages,
            stopWhen: stepCountIs(8),
            experimental_activeTools: activeTools,
            // Buffers the whole turn (across every tool-calling step) and
            // validates + repairs the visible text ONCE before any of it
            // reaches the client — see lib/ai/tutor-response-transform.ts
            // for the trade-off this makes (no live token streaming).
            ...(candidates.length > 0 && {
              experimental_transform: createTutorValidationTransform({
                mode: tutorMode,
                basePrompt,
                validationContext: { mode: tutorMode, confirmedMisconceptions },
                repairModel: candidates[0].model,
                messages: modelMessages,
                onResult: (outcome) => {
                  transformOutcomeRef = outcome;
                },
              }),
            }),
            providerOptions: {
              ...(isUsingGateway() &&
                modelConfig?.gatewayOrder && {
                  gateway: { order: modelConfig.gatewayOrder },
                }),
              ...(isUsingGateway() &&
                modelConfig?.reasoningEffort && {
                  openai: { reasoningEffort: modelConfig.reasoningEffort },
                }),
            },
            tools: {
              getCurriculumTopics,
              updateStudentProfile: updateStudentProfile({
                session,
                dataStream,
              }),
              manageGoals: manageGoals({ session }),
              startNewTopicSession: startNewTopicSession({ dataStream }),
              askQuestion: {
                ...askQuestion,
                execute: async (...args: any[]) => {
                  if (questionAsked) {
                    return { skipped: true };
                  }
                  questionAsked = true;
                  return askQuestion.execute!(args[0], args[1]);
                },
              },
            },
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: "stream-text",
            },
          },
          (name) => {
            console.info("provider fallback switched to", name);
          },
          undefined,
          undefined,
          TUTOR_PROMPT_VERSION
        );

        llmResultRef = llmResult;
        providerRef = provider;
        modelRef = model;
        requestIdRef = requestId;

        dataStream.merge(
          llmResult.toUIMessageStream({ sendReasoning: isReasoningModel })
        );

        if (titlePromise) {
          try {
            const title = await titlePromise;
            dataStream.write({ type: "data-chat-title", data: title });
            if (isLLMTitleEnabled()) {
              await updateChatTitleById({ chatId: id, title });
            }
          } catch (_) {
            /* non-fatal */
          }
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          for (const finishedMsg of finishedMessages) {
            const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
            if (existingMsg) {
              await updateMessage({
                id: finishedMsg.id,
                parts: finishedMsg.parts,
              });
            } else {
              await saveMessages({
                messages: [
                  {
                    id: finishedMsg.id,
                    role: finishedMsg.role,
                    parts: finishedMsg.parts,
                    createdAt: new Date(),
                    attachments: [],
                    chatId: id,
                  },
                ],
              });
            }
          }
        } else if (finishedMessages.length > 0) {
          // Don't persist content-less assistant turns (e.g. a model that
          // streamed only step markers and then stopped). Saving them leaves a
          // permanent blank bubble the student can't get past on reload.
          const nonEmpty = finishedMessages.filter((m) =>
            m.role === "assistant" ? hasRenderableContent(m) : true
          );
          if (nonEmpty.length > 0) {
            await saveMessages({
              messages: nonEmpty.map((currentMessage) => ({
                id: currentMessage.id,
                role: currentMessage.role,
                parts: currentMessage.parts,
                createdAt: new Date(),
                attachments: [],
                chatId: id,
              })),
            });
          }
        }

        // Log AI call token usage for efficiency tracking (non-blocking).
        if (llmResultRef) {
          try {
            const usage = await llmResultRef.usage;
            await logAICall({
              purpose: "chat",
              modelUsed: "gemini-3.1-flash-lite",
              promptTokens: usage.inputTokens ?? 0,
              completionTokens: usage.outputTokens ?? 0,
              cachedResponseUsed: false,
            });
          } catch {
            /* non-fatal — logging should never block the response */
          }
        }

        // The response was already validated (and repaired at most once)
        // BEFORE the client ever received it — see the experimental_transform
        // wired above (lib/ai/tutor-response-transform.ts). This just records
        // the outcome: provider, model, promptVersion, latency, repair
        // status, and violation CODES only (never raw text).
        if (transformOutcomeRef) {
          recordAiCall(providerRef, modelRef, "lesson_bundle", requestIdRef, {
            promptVersion: TUTOR_PROMPT_VERSION,
            repairStatus: transformOutcomeRef.repairStatus,
            violations: transformOutcomeRef.violations,
          });
          if (transformOutcomeRef.repairStatus !== "none") {
            console.warn("[chat] tutor response required repair/fallback:", {
              chatId: id,
              mode: tutorMode,
              repairStatus: transformOutcomeRef.repairStatus,
              violations: transformOutcomeRef.violations,
            });
            if (transformOutcomeRef.repairStatus === "fallback") {
              notifyHighRiskMessage({
                studentId: studentProfile?.id,
                mode: tutorMode,
                violations: transformOutcomeRef.violations,
              }).catch(() => {
                /* best-effort — never block or fail the response */
              });
            }
          }
        }
      },
      onError: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("All providers exhausted")) {
          return "All my AI providers are currently overloaded or out of quota. Please try again later, or ask a parent to check the API keys.";
        }
        if (
          error instanceof Error &&
          error.message?.includes(
            "AI Gateway requires a valid credit card on file to service requests"
          )
        ) {
          return "AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card to add a card and unlock your free credits.";
        }
        if (
          error instanceof Error &&
          error.message?.includes("API key not valid")
        ) {
          return "Your AI provider API key is invalid. Please check your GOOGLE_GENERATIVE_AI_API_KEY.";
        }
        return "That didn't work 😅 — give it another try?";
      },
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch (_) {
          /* non-critical */
        }
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatbotError("bad_request:activate_gateway").toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes("All providers exhausted")
    ) {
      return new ChatbotError("offline:chat").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
