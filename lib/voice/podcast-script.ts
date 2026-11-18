export const DEFAULT_PODCAST_VOICE = "Jori" as const;
export const DEFAULT_PODCAST_VOICE_LABEL =
  "Jori · Podcast Mode (English)" as const;

export type ScriptWordToken = {
  word: string;
  index: number;
  startRatio: number;
  endRatio: number;
};

export type PrintedScriptFrame = {
  printedWords: string[];
  printedText: string;
  activeWordIndex: number;
  totalWords: number;
  isComplete: boolean;
};

function computeWordSpeechWeight(word: string): number {
  const baseChars = Math.max(2, word.replace(/[^\w']/g, "").length);
  let pauseBonus = 0;

  if (/[.!?]["')\]]*$/.test(word)) {
    pauseBonus += 4.5;
  } else if (/(?:\.\.\.|…|--|—)$/.test(word)) {
    pauseBonus += 3.5;
  } else if (/[,;:]["')\]]*$/.test(word)) {
    pauseBonus += 2.2;
  }

  return baseChars + pauseBonus;
}

/**
 * Splits a clean spoken script into pause-weighted word timing spans across [0, 1]
 * so the printed podcast transcript stays tightly synchronized with Jori's voice.
 */
export function tokenizeScriptWords(script: string): ScriptWordToken[] {
  const words = script
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    return [];
  }

  const weights = words.map(computeWordSpeechWeight);
  const totalWeight = weights.reduce((acc, w) => acc + w, 0) || 1;

  let cursor = 0;
  return words.map((word, index) => {
    const w = weights[index] ?? 1;
    const startRatio = cursor / totalWeight;
    cursor += w;
    const endRatio =
      index === words.length - 1 ? 1 : Math.min(1, cursor / totalWeight);

    return {
      word,
      index,
      startRatio,
      endRatio,
    };
  });
}

/**
 * Computes which words should be printed on screen at a given playback ratio [0, 1].
 */
export function getPrintedScriptFrame(
  tokens: readonly ScriptWordToken[],
  progressRatio: number
): PrintedScriptFrame {
  const totalWords = tokens.length;
  if (totalWords === 0) {
    return {
      printedWords: [],
      printedText: "",
      activeWordIndex: -1,
      totalWords: 0,
      isComplete: true,
    };
  }

  const clamped = Math.max(0, Math.min(1, progressRatio));
  if (clamped <= 0) {
    return {
      printedWords: [],
      printedText: "",
      activeWordIndex: -1,
      totalWords,
      isComplete: false,
    };
  }

  if (clamped >= 0.995) {
    const allWords = tokens.map((t) => t.word);
    return {
      printedWords: allWords,
      printedText: allWords.join(" "),
      activeWordIndex: totalWords - 1,
      totalWords,
      isComplete: true,
    };
  }

  let activeWordIndex = 0;
  for (const token of tokens) {
    if (clamped >= token.startRatio) {
      activeWordIndex = token.index;
    } else {
      break;
    }
  }

  const printedWords = tokens.slice(0, activeWordIndex + 1).map((t) => t.word);

  return {
    printedWords,
    printedText: printedWords.join(" "),
    activeWordIndex,
    totalWords,
    isComplete: activeWordIndex >= totalWords - 1,
  };
}

/**
 * Wraps headerless 16-bit signed little-endian mono Linear PCM (`audio/l16`) in a
 * 44-byte RIFF WAV header. If `audioBytes` already begins with `"RIFF"`, returns it as-is.
 */
export function wrapPcm16InWav(
  audioBytes: Buffer,
  sampleRate = 24_000
): Buffer {
  if (
    audioBytes.length >= 12 &&
    audioBytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    audioBytes.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return audioBytes;
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = audioBytes.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // AudioFormat = 1 (PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, audioBytes]);
}
