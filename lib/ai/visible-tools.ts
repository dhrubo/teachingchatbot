// Tools whose output is actually shown to the student. Other tools
// (updateStudentProfile, manageGoals, startNewTopicSession, getCurriculumTopics)
// persist data or steer state but render NOTHING in the thread.
const VISIBLE_TOOL_TYPES = new Set([
  "tool-askQuestion",
]);

/**
 * True if a message has something the student can see: non-empty text or a
 * visible tool call with output. Silent persistence tools don't count, so a
 * tool-only-silent turn is treated as content-less.
 */
function hasRenderableContent(message: {
  parts?: Array<{ type: string; text?: string; [key: string]: unknown }>;
}): boolean {
  return (message.parts ?? []).some((part) => {
    if (part.type === "text") {
      return (part.text ?? "").trim().length > 0;
    }
    if (VISIBLE_TOOL_TYPES.has(part.type)) {
      return (part as { output?: unknown }).output !== undefined;
    }
    return false;
  });
}

export { VISIBLE_TOOL_TYPES, hasRenderableContent };
