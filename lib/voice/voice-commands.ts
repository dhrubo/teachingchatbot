/**
 * Deterministic (no LLM) classifier for spoken control commands.
 *
 * After speech-to-text produces a transcript, the app must decide — fast,
 * safely, and testably — whether the student said a CONTROL COMMAND
 * ("repeat that", "slow down", "give me a hint", ...) or an actual ANSWER to
 * the current question. This never calls the model; the app decides from
 * the text alone, same spirit as `resolveTutorMode` (lib/ai/resolve-tutor-mode.ts)
 * and `validateTutorResponse` (lib/ai/tutor-validator.ts).
 *
 * Matching strategy (deliberately conservative — see product spec):
 *   1. Normalize the transcript: trim, lowercase, drop apostrophes (so
 *      "that's"/"thats" and "don't"/"dont" match the same canonical form),
 *      strip trailing punctuation, collapse internal whitespace, then strip
 *      a short leading politeness/question wrapper ("please", "can you",
 *      "could you", "would you") and a trailing "please".
 *   2. Look the ENTIRE normalized utterance up in a small, fixed table of
 *      known phrasings per command — a whole-string equality check, never a
 *      substring/`includes` search. This is what stops a command word
 *      appearing *inside* an ordinary sentence from misfiring, e.g. "what
 *      comes next in the sequence" is not equal to any "next" phrasing, so
 *      it never matches, even though it contains the word "next".
 *   3. Extra guard for multiple-choice: when `expectedResponseType` is
 *      "multiple_choice", an utterance that (as a whole) merely names an
 *      option letter — "B", "option B", "option bee", "the answer is B" —
 *      is recognised as an ANSWER and short-circuits to `null` before any
 *      command lookup runs. This is defense in depth on top of (2): no
 *      command phrase table contains "option b" either way, but this makes
 *      the "must never be treated as a command" requirement explicit and
 *      independently testable.
 *   4. Anything that doesn't match a known phrasing (or is empty) returns
 *      `null` — callers must treat `null` as "this is an answer, not a
 *      command," never as an error.
 */

export type VoiceCommand =
  | "repeat"
  | "slower"
  | "faster"
  | "stop"
  | "hint"
  | "next"
  | "back"
  | "retry_transcription"
  | "confirm_transcription"
  | "do_not_know"
  | "pause_lesson"
  | "resume_lesson"
  | "end_lesson";

export type ExpectedResponseType =
  | "multiple_choice"
  | "short_text"
  | "numeric"
  | "free_text";

export type VoiceCommandMatch =
  | { command: VoiceCommand; matchedPhrase: string }
  | null;

// Fixed, small set of known phrasings per command. Every entry here is
// already in "normalized" form (lowercase, no apostrophes, no trailing
// punctuation) because it's compared against the normalized transcript with
// whole-string equality — never grown or matched as a substring.
const COMMAND_PHRASES: Record<VoiceCommand, readonly string[]> = {
  repeat: [
    "repeat",
    "repeat that",
    "repeat it",
    "say that again",
    "say it again",
    "come again",
    "one more time",
    "what did you say",
  ],
  slower: [
    "slow down",
    "say it slower",
    "too fast",
    "that was too fast",
    "speak slower",
    "can you go slower",
  ],
  faster: [
    "speed up",
    "go faster",
    "faster",
    "speak faster",
    "can you go faster",
  ],
  stop: ["stop", "stop talking", "be quiet", "quiet please"],
  hint: [
    "give me a hint",
    "i need a hint",
    "can i get a hint",
    "give me a clue",
    "i need a clue",
    "hint please",
  ],
  next: ["next question", "skip this", "skip this question", "move on", "next one"],
  back: [
    "go back",
    "previous question",
    "go back one",
    "go back a question",
    "go to the previous question",
  ],
  retry_transcription: [
    "thats not what i said",
    "that is not what i said",
    "thats wrong",
    "try again",
    "thats not right",
    "you misheard me",
    "you misheard",
    "thats not what i meant",
  ],
  confirm_transcription: [
    "yes thats right",
    "yes that is right",
    "thats correct",
    "confirm",
    "use this",
    "yes thats correct",
    "thats right",
  ],
  do_not_know: [
    "i dont know",
    "not sure",
    "no idea",
    "i have no idea",
    "dunno",
    "im not sure",
  ],
  pause_lesson: [
    "pause",
    "wait a second",
    "hold on",
    "wait",
    "hang on",
    "pause the lesson",
  ],
  resume_lesson: [
    "resume",
    "keep going",
    "continue",
    "lets continue",
    "carry on",
    "resume the lesson",
  ],
  end_lesson: [
    "end lesson",
    "end the lesson",
    "im done",
    "i am done",
    "stop the lesson",
    "finish",
    "finish the lesson",
    "thats enough",
  ],
};

// Reverse lookup built once at module load: normalized phrase -> command.
// A flat Map (rather than iterating each command's array per call) keeps the
// hot path a single O(1) lookup.
const PHRASE_TO_COMMAND: ReadonlyMap<string, VoiceCommand> = new Map(
  (Object.entries(COMMAND_PHRASES) as [VoiceCommand, readonly string[]][]).flatMap(
    ([command, phrases]) => phrases.map((phrase) => [phrase, command] as const)
  )
);

// Leading politeness/question wrappers stripped before lookup, so e.g.
// "can you repeat that" and "please repeat that" both normalize down to the
// bare "repeat that" canonical phrase. Applied repeatedly (bounded by input
// length) to also catch "can you please" style stacking.
const LEADING_WRAPPERS: readonly RegExp[] = [
  /^please\s+/,
  /^can you\s+/,
  /^could you\s+/,
  /^would you\s+/,
];

function normalizeTranscript(transcript: string): string {
  let text = transcript.trim().toLowerCase();
  // Normalize curly quotes to straight, then drop apostrophes entirely so
  // "that's"/"thats" and "don't"/"dont" collapse to one canonical form.
  text = text.replace(/[’‘]/g, "'").replace(/'/g, "");
  // Trailing sentence punctuation.
  text = text.replace(/[.!?]+$/g, "");
  text = text.replace(/\s+/g, " ").trim();

  let changed = true;
  while (changed) {
    changed = false;
    for (const wrapper of LEADING_WRAPPERS) {
      const stripped = text.replace(wrapper, "");
      if (stripped !== text) {
        text = stripped;
        changed = true;
      }
    }
  }
  // Trailing politeness.
  text = text.replace(/\s+please$/, "").trim();

  return text;
}

// Phonetic/spelled-out variants for the option letters a small multiple
// choice question is realistically limited to (A-E).
const OPTION_LETTER_WORDS: Record<string, readonly string[]> = {
  a: ["a", "ay"],
  b: ["b", "bee"],
  c: ["c", "see", "cee"],
  d: ["d", "dee"],
  e: ["e"],
};

const ALL_OPTION_LETTER_WORDS = Object.values(OPTION_LETTER_WORDS).flat();

// Short, optional preambles a student might say before naming their choice.
// Whole-utterance anchored (see isMultipleChoiceLetterAnswer), so this only
// matches when the ENTIRE utterance is "<preamble?><letter>" — never a
// substring of a longer sentence.
const MCQ_ANSWER_PATTERN = new RegExp(
  `^(option |the answer is option |the answer is |answer |its |it is |i think its |i think it is |i pick |i pick option |i choose |i choose option )?(${ALL_OPTION_LETTER_WORDS.join("|")})$`
);

function isMultipleChoiceLetterAnswer(normalized: string): boolean {
  return MCQ_ANSWER_PATTERN.test(normalized);
}

/**
 * Deterministically classify a speech-to-text transcript as a control
 * command, or `null` if it should be treated as an answer instead.
 *
 * Never calls the model — see the matching strategy comment at the top of
 * this file.
 */
export function resolveVoiceCommand(
  transcript: string,
  expectedResponseType?: ExpectedResponseType
): VoiceCommandMatch {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) {
    return null;
  }

  if (
    expectedResponseType === "multiple_choice" &&
    isMultipleChoiceLetterAnswer(normalized)
  ) {
    return null;
  }

  const command = PHRASE_TO_COMMAND.get(normalized);
  if (!command) {
    return null;
  }
  return { command, matchedPhrase: normalized };
}
