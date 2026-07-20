import { describe, expect, it } from "vitest";
import { resolveVoiceCommand } from "./voice-commands";

describe("resolveVoiceCommand — repeat", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("repeat that")).toEqual({
      command: "repeat",
      matchedPhrase: "repeat that",
    });
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("come again")?.command).toBe("repeat");
  });

  it("matches a politeness-wrapped variant", () => {
    expect(resolveVoiceCommand("Can you say that again?")?.command).toBe(
      "repeat"
    );
  });
});

describe("resolveVoiceCommand — slower", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("slow down")?.command).toBe("slower");
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("too fast")?.command).toBe("slower");
  });
});

describe("resolveVoiceCommand — faster", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("speed up")?.command).toBe("faster");
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("go faster")?.command).toBe("faster");
  });

  it("matches the bare command word with a trailing please stripped", () => {
    expect(resolveVoiceCommand("faster please")?.command).toBe("faster");
  });
});

describe("resolveVoiceCommand — stop", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("stop")).toEqual({
      command: "stop",
      matchedPhrase: "stop",
    });
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("be quiet")?.command).toBe("stop");
  });

  it("matches stop talking", () => {
    expect(resolveVoiceCommand("stop talking")?.command).toBe("stop");
  });
});

describe("resolveVoiceCommand — hint", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("give me a hint")?.command).toBe("hint");
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("can i get a hint")?.command).toBe("hint");
  });

  it("matches i need a hint", () => {
    expect(resolveVoiceCommand("i need a hint")?.command).toBe("hint");
  });
});

describe("resolveVoiceCommand — next", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("next question")?.command).toBe("next");
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("skip this")?.command).toBe("next");
  });

  it("matches move on", () => {
    expect(resolveVoiceCommand("move on")?.command).toBe("next");
  });
});

describe("resolveVoiceCommand — back", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("go back")?.command).toBe("back");
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("previous question")?.command).toBe("back");
  });

  it("matches go back one", () => {
    expect(resolveVoiceCommand("go back one")?.command).toBe("back");
  });
});

describe("resolveVoiceCommand — retry_transcription", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("that's not what I said")?.command).toBe(
      "retry_transcription"
    );
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("that's wrong")?.command).toBe(
      "retry_transcription"
    );
  });

  it("matches try again", () => {
    expect(resolveVoiceCommand("try again")?.command).toBe(
      "retry_transcription"
    );
  });
});

describe("resolveVoiceCommand — confirm_transcription", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("yes that's right")?.command).toBe(
      "confirm_transcription"
    );
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("that's correct")?.command).toBe(
      "confirm_transcription"
    );
  });

  it("matches the bare confirm/use this phrasings", () => {
    expect(resolveVoiceCommand("confirm")?.command).toBe(
      "confirm_transcription"
    );
    expect(resolveVoiceCommand("use this")?.command).toBe(
      "confirm_transcription"
    );
  });
});

describe("resolveVoiceCommand — do_not_know", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("I don't know")?.command).toBe("do_not_know");
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("not sure")?.command).toBe("do_not_know");
  });

  it("matches no idea", () => {
    expect(resolveVoiceCommand("no idea")?.command).toBe("do_not_know");
  });
});

describe("resolveVoiceCommand — pause_lesson", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("pause")?.command).toBe("pause_lesson");
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("hold on")?.command).toBe("pause_lesson");
  });

  it("matches wait a second", () => {
    expect(resolveVoiceCommand("wait a second")?.command).toBe(
      "pause_lesson"
    );
  });
});

describe("resolveVoiceCommand — resume_lesson", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("resume")?.command).toBe("resume_lesson");
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("keep going")?.command).toBe("resume_lesson");
  });

  it("matches continue", () => {
    expect(resolveVoiceCommand("continue")?.command).toBe("resume_lesson");
  });
});

describe("resolveVoiceCommand — end_lesson", () => {
  it("matches the main phrasing", () => {
    expect(resolveVoiceCommand("end lesson")?.command).toBe("end_lesson");
  });

  it("matches a synonym", () => {
    expect(resolveVoiceCommand("I'm done")?.command).toBe("end_lesson");
  });

  it("matches stop the lesson and finish", () => {
    expect(resolveVoiceCommand("stop the lesson")?.command).toBe(
      "end_lesson"
    );
    expect(resolveVoiceCommand("finish")?.command).toBe("end_lesson");
  });
});

describe("resolveVoiceCommand — case-insensitivity", () => {
  it("matches regardless of case and surrounding whitespace", () => {
    expect(resolveVoiceCommand("  STOP  ")?.command).toBe("stop");
    expect(resolveVoiceCommand("Give Me A HINT")?.command).toBe("hint");
    expect(resolveVoiceCommand("NEXT QUESTION!")?.command).toBe("next");
  });
});

describe("resolveVoiceCommand — multiple-choice answers are never commands (mandatory)", () => {
  it("does NOT treat 'option B' as a command when a multiple_choice answer is expected", () => {
    expect(resolveVoiceCommand("option B", "multiple_choice")).toBeNull();
  });

  it("does NOT treat the phonetic spelling 'option bee' as a command", () => {
    expect(resolveVoiceCommand("option bee", "multiple_choice")).toBeNull();
  });

  it("does NOT treat a bare letter 'B' as a command", () => {
    expect(resolveVoiceCommand("B", "multiple_choice")).toBeNull();
  });

  it("does NOT treat 'the answer is B' as a command", () => {
    expect(
      resolveVoiceCommand("the answer is B", "multiple_choice")
    ).toBeNull();
  });

  it("does NOT treat 'it's C' as a command", () => {
    expect(resolveVoiceCommand("it's C", "multiple_choice")).toBeNull();
  });
});

describe("resolveVoiceCommand — conservative, whole-utterance anchoring", () => {
  it("does NOT match 'next' merely appearing inside an ordinary maths sentence", () => {
    expect(
      resolveVoiceCommand(
        "what comes next in the sequence",
        "numeric"
      )
    ).toBeNull();
  });

  it("does NOT match an ordinary numeric answer sentence", () => {
    expect(resolveVoiceCommand("the answer is 42", "numeric")).toBeNull();
  });

  it("does NOT match an ordinary short_text answer", () => {
    expect(
      resolveVoiceCommand("it is a right angle triangle", "short_text")
    ).toBeNull();
  });

  it("returns null for an empty or whitespace-only transcript", () => {
    expect(resolveVoiceCommand("")).toBeNull();
    expect(resolveVoiceCommand("   ")).toBeNull();
  });

  it("does NOT match a command word buried mid-sentence generally (stop)", () => {
    expect(
      resolveVoiceCommand("i think the train will stop at the station")
    ).toBeNull();
  });
});
