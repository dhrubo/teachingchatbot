import { beforeEach, describe, expect, it, vi } from "vitest";

const generateTextMock = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: generateTextMock };
});

const { createTutorValidationTransform } = await import("./tutor-response-transform");

type Chunk = { type: string; [key: string]: unknown };

async function runTransform(
  chunks: Chunk[],
  overrides: Partial<Parameters<typeof createTutorValidationTransform>[0]> = {}
) {
  const onResult = vi.fn();
  const factory = createTutorValidationTransform({
    mode: "teach",
    basePrompt: "BASE PROMPT",
    validationContext: { mode: "teach" },
    repairModel: {} as never,
    messages: [],
    onResult,
    ...overrides,
  });
  const transform = factory({ tools: {}, stopStream: () => {} });

  const input = new ReadableStream<Chunk>({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(c);
      }
      controller.close();
    },
  });

  const output: Chunk[] = [];
  const reader = input.pipeThrough(transform as never).getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    output.push(value as Chunk);
  }
  return { output, onResult };
}

beforeEach(() => {
  generateTextMock.mockReset();
});

describe("createTutorValidationTransform", () => {
  it("replays a valid draft unchanged, including tool chunks in original order", async () => {
    const chunks: Chunk[] = [
      { type: "start" },
      { type: "tool-call", toolCallId: "1", toolName: "getCurriculumTopics" },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Percentages are fractions out of 100." },
      { type: "text-end", id: "t1" },
      { type: "finish" },
    ];
    const { output, onResult } = await runTransform(chunks);
    expect(output).toEqual(chunks);
    expect(onResult).toHaveBeenCalledWith({
      repairStatus: "none",
      violations: [],
      finalText: "Percentages are fractions out of 100.",
    });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("repairs an invalid draft with exactly one call and replaces only the text chunks", async () => {
    generateTextMock.mockResolvedValue({ text: "Percentages are fractions out of 100." });
    const chunks: Chunk[] = [
      { type: "start" },
      { type: "tool-call", toolCallId: "1", toolName: "getCurriculumTopics" },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Now try this: what is 25% of 80?" },
      { type: "text-end", id: "t1" },
      { type: "finish" },
    ];
    const { output, onResult } = await runTransform(chunks);

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({
      repairStatus: "repaired",
      violations: [],
      finalText: "Percentages are fractions out of 100.",
    });

    // Non-text chunks preserved, in order.
    expect(output[0]).toEqual({ type: "start" });
    expect(output[1]).toEqual({ type: "tool-call", toolCallId: "1", toolName: "getCurriculumTopics" });
    expect(output.at(-1)).toEqual({ type: "finish" });

    // Text chunks replaced with the repaired text.
    const textDelta = output.find((c) => c.type === "text-delta");
    expect(textDelta?.text).toBe("Percentages are fractions out of 100.");
  });

  it("falls back to the deterministic safe text when the repair also fails validation", async () => {
    generateTextMock.mockResolvedValue({ text: "Try this too: what is 10% of 40?" });
    const chunks: Chunk[] = [
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Now try this: what is 25% of 80?" },
      { type: "text-end", id: "t1" },
      { type: "finish" },
    ];
    const { output, onResult } = await runTransform(chunks);

    expect(generateTextMock).toHaveBeenCalledTimes(1); // never more than one repair call
    expect(onResult.mock.calls[0][0].repairStatus).toBe("fallback");
    const textDelta = output.find((c) => c.type === "text-delta");
    expect(textDelta?.text).toBe(
      "Let's take this one step at a time — which part would you like to go over first?"
    );
  });

  it("falls back when the repair call itself throws", async () => {
    generateTextMock.mockRejectedValue(new Error("provider exhausted"));
    const chunks: Chunk[] = [
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Now try this: what is 25% of 80?" },
      { type: "text-end", id: "t1" },
      { type: "finish" },
    ];
    const { onResult } = await runTransform(chunks);
    expect(onResult.mock.calls[0][0].repairStatus).toBe("fallback");
  });

  it("still surfaces fallback text for a tool-only turn with no text segment", async () => {
    const chunks: Chunk[] = [
      { type: "start" },
      { type: "tool-call", toolCallId: "1", toolName: "getCurriculumTopics" },
      { type: "finish" },
    ];
    const { output, onResult } = await runTransform(chunks);
    // No text at all -> nothing to validate -> passes through unchanged.
    expect(onResult).toHaveBeenCalledWith({
      repairStatus: "none",
      violations: [],
      finalText: "",
    });
    expect(output).toEqual(chunks);
  });
});
