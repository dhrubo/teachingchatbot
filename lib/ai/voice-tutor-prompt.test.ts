import { describe, expect, it } from "vitest";
import {
  buildVoiceTutorPrompt,
  DEFAULT_MAX_DISPLAY_WORDS,
  DEFAULT_MAX_SPOKEN_WORDS,
  VOICE_TUTOR_PROMPT_VERSION,
  voiceTutorResponseSchema,
  type VoiceLessonContext,
} from "./voice-tutor-prompt";

const baseContext: VoiceLessonContext = {
  mode: "teach",
  activeTopic: "Percentages",
  learningObjective: "Convert a percentage to a decimal",
  answerPolicy: "do_not_reveal",
};

describe("buildVoiceTutorPrompt", () => {
  it("includes the prompt version", () => {
    expect(buildVoiceTutorPrompt(baseContext)).toContain(VOICE_TUTOR_PROMPT_VERSION);
  });

  it("includes only the current mode's instructions, not other modes'", () => {
    const prompt = buildVoiceTutorPrompt({ ...baseContext, mode: "hint" });
    expect(prompt).toContain("HINT");
    expect(prompt).toContain("smallest useful next step");
    expect(prompt).not.toContain("WORKED_SOLUTION");
    expect(prompt).not.toContain("REFLECTION");
  });

  it("interpolates the active topic and learning objective", () => {
    const prompt = buildVoiceTutorPrompt(baseContext);
    expect(prompt).toContain("Percentages");
    expect(prompt).toContain("Convert a percentage to a decimal");
  });

  it("uses do_not_reveal answer-disclosure rules when specified", () => {
    const prompt = buildVoiceTutorPrompt({ ...baseContext, answerPolicy: "do_not_reveal" });
    expect(prompt).toContain("Do not state the final answer");
  });

  it("uses may_explain_after_submission answer-disclosure rules when specified", () => {
    const prompt = buildVoiceTutorPrompt({
      ...baseContext,
      answerPolicy: "may_explain_after_submission",
    });
    expect(prompt).toContain("You may explain the correct result");
  });

  it("includes representationsAlreadyTried when supplied", () => {
    const prompt = buildVoiceTutorPrompt({
      ...baseContext,
      mode: "reteach",
      representationsAlreadyTried: ["concrete", "visual"],
    });
    expect(prompt).toContain("concrete, visual");
  });

  it("includes the misconception description and status when supplied", () => {
    const prompt = buildVoiceTutorPrompt({
      ...baseContext,
      mode: "mistake_explanation",
      misconception: { description: "sign error", status: "confirmed" },
    });
    expect(prompt).toContain("sign error");
    expect(prompt).toContain("confirmed");
  });

  it("omits the misconception line entirely when none is supplied", () => {
    const prompt = buildVoiceTutorPrompt(baseContext);
    expect(prompt).not.toContain("Misconception (");
  });

  it("falls back to the default word limits when none are supplied", () => {
    const prompt = buildVoiceTutorPrompt(baseContext);
    expect(prompt).toContain(String(DEFAULT_MAX_DISPLAY_WORDS));
    expect(prompt).toContain(String(DEFAULT_MAX_SPOKEN_WORDS));
  });

  it("uses supplied word limits over the defaults", () => {
    const prompt = buildVoiceTutorPrompt({
      ...baseContext,
      maxDisplayWords: 60,
      maxSpokenWords: 30,
    });
    expect(prompt).toContain("60");
    expect(prompt).toContain("30");
  });

  it("always includes the child-safety and authority/trust rules", () => {
    const prompt = buildVoiceTutorPrompt(baseContext);
    expect(prompt).toContain("CHILD PRIVACY AND SAFETY");
    expect(prompt).toContain("AUTHORITY AND TRUST");
    expect(prompt).toContain("trusted adult");
  });
});

describe("voiceTutorResponseSchema", () => {
  it("accepts a valid displayText/spokenText object", () => {
    const result = voiceTutorResponseSchema.safeParse({
      displayText: "Percentages are fractions out of 100.",
      spokenText: "Percentages are fractions out of one hundred.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing spokenText", () => {
    const result = voiceTutorResponseSchema.safeParse({ displayText: "hi" });
    expect(result.success).toBe(false);
  });
});
