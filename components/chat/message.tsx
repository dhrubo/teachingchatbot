"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import { logSuppressedQuestion } from "@/lib/challenge-gate";
import type { Vote } from "@/lib/db/schema";
import { isGateOptions } from "@/lib/topic-threads";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { MessageContent, MessageResponse } from "../ai-elements/message";
import { Shimmer } from "../ai-elements/shimmer";
import { useDataStream } from "./data-stream-provider";
import { SparklesIcon } from "./icons";
import { MathText } from "./math-text";
import { MessageActions } from "./message-actions";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";

const PurePreviewMessage = ({
  addToolApprovalResponse: _addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages: _setMessages,
  regenerate: _regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  onEdit,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  onEdit?: (message: ChatMessage) => void;
}) => {
  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const hasAnyContent = message.parts?.some(
    (part) =>
      (part.type === "text" && part.text?.trim().length > 0) ||
      (part.type === "reasoning" &&
        "text" in part &&
        part.text?.trim().length > 0) ||
      part.type.startsWith("tool-")
  );
  const isThinking = isAssistant && isLoading && !hasAnyContent;

  const attachments = attachmentsFromMessage.length > 0 && (
    <div
      className="flex flex-row justify-end gap-2"
      data-testid={"message-attachments"}
    >
      {attachmentsFromMessage.map((attachment) => (
        <PreviewAttachment
          attachment={{
            name: attachment.filename ?? "file",
            contentType: attachment.mediaType,
            url: attachment.url,
          }}
          key={attachment.url}
        />
      ))}
    </div>
  );

  const mergedReasoning = message.parts?.reduce(
    (acc, part) => {
      if (part.type === "reasoning" && part.text?.trim().length > 0) {
        return {
          text: acc.text ? `${acc.text}\n\n${part.text}` : part.text,
          isStreaming: "state" in part ? part.state === "streaming" : false,
          rendered: false,
        };
      }
      return acc;
    },
    { text: "", isStreaming: false, rendered: false }
  ) ?? { text: "", isStreaming: false, rendered: false };

  // The askQuestion prompts/options in THIS message. The tutor often repeats
  // the question (and "A) … B) …" options) as a trailing text part after the
  // tool call; that prose is redundant with the answer card/form, so we hide
  // any text part that merely echoes a question we're already rendering.
  const questionOutputs = (message.parts ?? [])
    .filter((p) => p.type === "tool-askQuestion" && "output" in p && p.output)
    .map(
      (p) => (p as { output: { prompt?: string; options?: string[] } }).output
    );

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const isRedundantQuestionText = (text: string): boolean => {
    const t = normalize(text);
    if (!t) {
      return false;
    }
    return questionOutputs.some((q) => {
      const prompt = normalize(q.prompt ?? "");
      if (
        prompt &&
        (t === prompt || t.includes(prompt) || prompt.includes(t))
      ) {
        return true;
      }
      // Also drop a line that's just the options rattled off as prose.
      const opts = q.options ?? [];
      if (opts.length > 0) {
        const optMatches = opts.filter((o) => t.includes(normalize(o))).length;
        if (optMatches >= Math.ceil(opts.length / 2)) {
          return true;
        }
      }
      return false;
    });
  };

  const parts = message.parts?.map((part, index) => {
    const { type } = part;
    const key = `message-${message.id}-part-${index}`;

    if (type === "reasoning") {
      if (!mergedReasoning.rendered && mergedReasoning.text) {
        mergedReasoning.rendered = true;
        return (
          <MessageReasoning
            isLoading={isLoading || mergedReasoning.isStreaming}
            key={key}
            reasoning={mergedReasoning.text}
          />
        );
      }
      return null;
    }

    if (type === "text") {
      // Hide assistant prose that just repeats a question we already render as
      // a card + answer form.
      if (message.role === "assistant" && isRedundantQuestionText(part.text)) {
        return null;
      }
      // Strip hidden tutor directives we append to user messages (e.g. the
      // grading verdict or recovery instructions in [square brackets]) so the
      // student only sees their own words.
      const display =
        message.role === "user"
          ? part.text.replace(/\s*\[[^\]]*\]\s*$/g, "").trim()
          : part.text;
      if (message.role === "user" && !display) {
        return null;
      }
      return (
        <MessageContent
          className={cn(
            // Tutor text is larger and more spaced for easy reading; user
            // messages stay compact in their bubble.
            message.role === "user"
              ? "w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/30 bg-gradient-to-br from-secondary to-muted px-3.5 py-2 text-[14px] leading-[1.6] shadow-[var(--shadow-card)]"
              : "text-[16px] leading-[1.75]"
          )}
          data-testid="message-content"
          key={key}
        >
          <MessageResponse>{sanitizeText(display)}</MessageResponse>
        </MessageContent>
      );
    }

    if (type === "tool-askQuestion") {
      const output =
        "output" in part
          ? (part.output as
              | {
                  prompt?: string;
                  type?: string;
                  options?: string[];
                  correctAnswer?: string;
                }
              | undefined)
          : undefined;
      if (!output?.prompt) {
        return null;
      }
      // Legacy control gates (older chats from before the gateless flow) are
      // never shown as Challenge cards.
      if (isGateOptions(output.options ?? [])) {
        return null;
      }
      // CHALLENGE GATE: a graded quiz question (has a correctAnswer) must NEVER
      // render inline in the chat thread. Real challenge questions only appear
      // inside full-screen Challenge Mode after the student accepts. Non-graded
      // prompts (name, topic choice, "continue or switch?") are still allowed.
      if (output.correctAnswer && output.correctAnswer.trim() !== "") {
        logSuppressedQuestion("message.tool-askQuestion");
        return null;
      }
      return (
        <div
          className="w-full overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-[var(--shadow-card)]"
          key={key}
        >
          {/* Challenge header strip */}
          <div className="flex items-center gap-1.5 bg-[image:var(--gradient-sunset)] px-5 py-2.5 font-semibold text-[13px] text-white uppercase tracking-wide">
            🎯 Challenge
          </div>
          <div className="p-5">
            <p className="text-[17px] font-medium leading-relaxed text-foreground">
              <MathText>{output.prompt}</MathText>
            </p>
            <p className="mt-3 flex items-center gap-1 text-[12px] font-medium text-primary">
              👉 Your move — answer below 👇
            </p>
          </div>
        </div>
      );
    }

    return null;
  });

  const actions = !isReadonly && (
    <MessageActions
      chatId={chatId}
      isLoading={isLoading}
      key={`action-${message.id}`}
      message={message}
      onEdit={onEdit ? () => onEdit(message) : undefined}
      vote={vote}
    />
  );

  const content = isThinking ? (
    <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
      <Shimmer className="font-medium" duration={1}>
        Thinking...
      </Shimmer>
    </div>
  ) : (
    <>
      {attachments}
      {parts}
      {actions}
    </>
  );

  return (
    <div
      className={cn(
        "group/message w-full",
        !isAssistant && "animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)]"
      )}
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn(
          isUser ? "flex flex-col items-end gap-2" : "flex items-start gap-3"
        )}
      >
        {isAssistant && (
          <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
              <SparklesIcon size={13} />
            </div>
          </div>
        )}
        {isAssistant ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">{content}</div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export const PreviewMessage = PurePreviewMessage;

export const ThinkingMessage = () => {
  return (
    <div
      className="group/message w-full"
      data-role="assistant"
      data-testid="message-assistant-loading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
            <SparklesIcon size={13} />
          </div>
        </div>

        <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
          <Shimmer className="font-medium" duration={1}>
            Thinking...
          </Shimmer>
        </div>
      </div>
    </div>
  );
};
