import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { Suggestion } from "./db/schema";
import type { askQuestion } from "./ai/tools/ask-question";
import type { startNewTopicSession } from "./ai/tools/start-new-topic-session";

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type askQuestionTool = InferUITool<typeof askQuestion>;
type startNewTopicSessionTool = InferUITool<
  ReturnType<typeof startNewTopicSession>
>;

export type ChatTools = {
  askQuestion: askQuestionTool;
  startNewTopicSession: startNewTopicSessionTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
  // Signals the client to select + open the start gate for a new topic
  // thread within the current chat (topicId is the stable thread id).
  "new-topic-session": { topic: string; topicId: string };
  // Latest saved progress for the current topic (0–5 mastery score),
  // surfaced so the UI can show topic name + % complete.
  "topic-progress": { topic: string; score: number };
  // Live XP / streak / badges for the header badges.
  "xp-streak": { xp: number; streak: number; badges: string[] };
  // A freshly earned badge or level-up, for the achievement toast.
  achievement: { label: string; kind: "badge" | "level" | "streak" };
  // The list of topics parsed from a big pasted list, for the pinned panel.
  "topic-list": { topics: string[] };
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
