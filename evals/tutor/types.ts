import type { TutorMode } from "@/lib/ai/prompts-tutor";
import type { ViolationCode } from "@/lib/ai/tutor-validator";

export type ProviderErrorCase = {
  errorText: string;
  expectQuotaError: boolean;
};

export type MathsCheck = {
  correctAnswer: string;
  rules?: Record<string, unknown>;
  statedAnswerGood: string;
  statedAnswerBad: string;
};

export type TutorFixture = {
  id: string;
  category: string;
  description: string;
  mode: TutorMode | null;
  studentMessage: string | null;
  context?: {
    finalAnswer?: string | null;
    confirmedMisconceptions?: string[];
    allowedTopics?: string[];
  };
  goodResponse?: string;
  badResponse?: string;
  expectedViolations?: ViolationCode[];
  providerErrorCases?: ProviderErrorCase[];
  mathsCheck?: MathsCheck;
  note?: string;
};

export type CheckOutcome = {
  fixtureId: string;
  category: string;
  checkName: string;
  passed: boolean;
  detail?: string;
};
