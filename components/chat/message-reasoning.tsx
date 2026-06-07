"use client";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../ai-elements/reasoning";

type MessageReasoningProps = {
  isLoading: boolean;
  reasoning: string;
};

export function MessageReasoning({
  isLoading,
  reasoning,
}: MessageReasoningProps) {
  // Keep the "Thought for…" section collapsed by default — it stays available
  // behind the trigger, but doesn't clutter the (small) reading area.
  return (
    <Reasoning
      data-testid="message-reasoning"
      defaultOpen={false}
      isStreaming={isLoading}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  );
}
