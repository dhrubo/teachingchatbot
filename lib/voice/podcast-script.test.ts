import { describe, expect, it } from "vitest";
import {
  getPrintedScriptFrame,
  tokenizeScriptWords,
  wrapPcm16InWav,
} from "./podcast-script";

describe("podcast-script live teleprompter utilities", () => {
  it("prints words progressively from 0% to 100% as speech plays", () => {
    const script =
      "Welcome back! Let's work out five percent compound interest, step by step.";
    const tokens = tokenizeScriptWords(script);
    expect(tokens).toHaveLength(12);

    const atZero = getPrintedScriptFrame(tokens, 0);
    expect(atZero.printedWords).toHaveLength(0);
    expect(atZero.isComplete).toBe(false);

    const atStart = getPrintedScriptFrame(tokens, 0.02);
    expect(atStart.printedWords[0]).toBe("Welcome");
    expect(atStart.activeWordIndex).toBe(0);

    const atHalf = getPrintedScriptFrame(tokens, 0.5);
    expect(atHalf.printedWords.length).toBeGreaterThan(3);
    expect(atHalf.printedWords.length).toBeLessThan(12);
    expect(atHalf.printedText).toBe(atHalf.printedWords.join(" "));

    const atEnd = getPrintedScriptFrame(tokens, 1);
    expect(atEnd.printedText).toBe(script);
    expect(atEnd.isComplete).toBe(true);
  });

  it("wraps raw 16-bit PCM bytes in a valid 44-byte RIFF WAVE header without double-wrapping existing WAV buffers", () => {
    const rawPcm = Buffer.alloc(480, 0);
    const wav = wrapPcm16InWav(rawPcm, 24_000);
    expect(wav.length).toBe(44 + 480);
    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");

    const idempotent = wrapPcm16InWav(wav, 24_000);
    expect(idempotent.length).toBe(wav.length);
  });
});
