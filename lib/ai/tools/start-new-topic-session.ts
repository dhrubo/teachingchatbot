import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { ChatMessage } from "@/lib/types";

type Props = { dataStream: UIMessageStreamWriter<ChatMessage> };

// Signals the client to open a NEW chat session for a different topic.
// Use ONLY when the student clearly switches to an unrelated maths topic
// (e.g. fractions → probability). Related follow-ups stay in the same chat.
export const startNewTopicSession = ({ dataStream }: Props) =>
  tool({
    description:
      "Start a NEW chat session because the student has switched to a different maths topic (e.g. from fractions to probability). Only call this for a genuine topic switch, never for related follow-up questions, and only after telling the student you're switching. The current chat is preserved in history. After calling this, give a short friendly message that you're starting the new topic.",
    inputSchema: z.object({
      topic: z
        .string()
        .describe("The new maths topic to start, e.g. 'Probability'."),
    }),
    execute: ({ topic }) => {
      dataStream.write({ type: "data-new-topic-session", data: { topic } });
      return { switched: true, topic };
    },
  });
