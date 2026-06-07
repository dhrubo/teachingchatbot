import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
} from "ai";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import { askQuestion } from "@/lib/ai/tools/ask-question";
import {
  CHUNKING_MESSAGE,
  detectLargeInput,
  extractTopics,
} from "@/lib/ai/detect-large-input";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { TUTOR_SYSTEM_PROMPT } from "@/lib/ai/prompts-tutor";
import { getLanguageModel } from "@/lib/ai/providers";
import { getCurriculumTopics } from "@/lib/ai/tools/get-curriculum-topics";
import { getStudentProgress } from "@/lib/ai/tools/get-student-progress";
import { manageGoals } from "@/lib/ai/tools/manage-goals";
import { startNewTopicSession } from "@/lib/ai/tools/start-new-topic-session";
import { updateStudentProfile } from "@/lib/ai/tools/update-student-profile";
import { updateTopicProgress } from "@/lib/ai/tools/update-topic-progress";

import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
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

export const maxDuration = 60;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

// True if a message carries something worth showing: non-empty text, or any
// tool call with output. Step markers / empty text alone don't count, so a
// failed (content-less) assistant turn isn't persisted as a blank bubble.
function hasRenderableContent(message: { parts?: unknown[] }): boolean {
  return (message.parts ?? []).some((part) => {
    const p = part as { type?: string; text?: string; output?: unknown };
    if (p.type === "text") {
      return (p.text ?? "").trim().length > 0;
    }
    if (typeof p.type === "string" && p.type.startsWith("tool-")) {
      return p.output !== undefined;
    }
    return false;
  });
}

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

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 1,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
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

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (message?.role === "user") {
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
    const modelCapabilities = await getCapabilities();
    const capabilities = modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;

    const modelMessages = await convertToModelMessages(uiMessages);

    const activeTools = (
      isReasoningModel && !supportsTools
        ? []
        : [
            "getCurriculumTopics",
            "getStudentProgress",
            "updateStudentProfile",
            "updateTopicProgress",
            "manageGoals",
            "startNewTopicSession",
            "askQuestion",
          ]
    ) as (
      | "getCurriculumTopics"
      | "getStudentProgress"
      | "updateStudentProfile"
      | "updateTopicProgress"
      | "manageGoals"
      | "startNewTopicSession"
      | "askQuestion"
    )[];

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(chatModel),
          system: TUTOR_SYSTEM_PROMPT,
          messages: modelMessages,
          stopWhen: stepCountIs(8),
          experimental_activeTools: activeTools,
          providerOptions: {
            ...(modelConfig?.gatewayOrder && {
              gateway: { order: modelConfig.gatewayOrder },
            }),
            ...(modelConfig?.reasoningEffort && {
              openai: { reasoningEffort: modelConfig.reasoningEffort },
            }),
          },
          tools: {
            getCurriculumTopics,
            getStudentProgress: getStudentProgress({ session }),
            updateStudentProfile: updateStudentProfile({ session, dataStream }),
            updateTopicProgress: updateTopicProgress({ session, dataStream }),
            manageGoals: manageGoals({ session }),
            startNewTopicSession: startNewTopicSession({ dataStream }),
            askQuestion,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        dataStream.merge(
          result.toUIMessageStream({ sendReasoning: isReasoningModel })
        );

        if (titlePromise) {
          try {
            const title = await titlePromise;
            dataStream.write({ type: "data-chat-title", data: title });
            updateChatTitleById({ chatId: id, title });
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
      },
      onError: (error) => {
        if (
          error instanceof Error &&
          error.message?.includes(
            "AI Gateway requires a valid credit card on file to service requests"
          )
        ) {
          return "AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card to add a card and unlock your free credits.";
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
