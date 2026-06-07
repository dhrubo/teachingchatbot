import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { topicSlug } from "@/lib/topic-threads";
import type { ChatMessage } from "@/lib/types";

type Props = { dataStream: UIMessageStreamWriter<ChatMessage> };

// Begins a NEW topic THREAD within the current chat. The tool output carries a
// persisted topic marker ({ topicId, title }) that the client uses to split the
// conversation into per-topic sub-conversations — this survives reload because
// tool outputs are saved in message.parts. It also emits a transient
// data-new-topic-session part so the live UI can immediately select + open the
// new topic's full-screen start gate.
export const startNewTopicSession = ({ dataStream }: Props) =>
  tool({
    description:
      "Begin a NEW topic thread because the student has moved to a different maths topic (e.g. from fractions to probability). Only call this for a genuine topic switch, never for related follow-up questions, and only after telling the student you're switching. The topic opens as its own thread within this chat (previous topics stay accessible from 'Your topics'). After calling this, give a short friendly message that you're starting the new topic, then teach it.",
    inputSchema: z.object({
      topic: z
        .string()
        .describe("The new maths topic to start, e.g. 'Probability'."),
    }),
    execute: ({ topic }) => {
      const topicId = topicSlug(topic);
      dataStream.write({
        type: "data-new-topic-session",
        data: { topic, topicId },
      });
      // The marker below is what persists and drives thread derivation.
      return { switched: true, topicId, title: topic };
    },
  });
