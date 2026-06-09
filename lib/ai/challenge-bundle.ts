export type BundleChallenge = {
  id: string;
  prompt: string;
  type: "multiple_choice" | "short_text";
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  hint: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard" | "boss";
};

export type ConceptCard = {
  title: string;
  body: string;
  visual?: string;
  example?: string;
};

export type ChallengeBundle = {
  topic: string;
  conceptCards: ConceptCard[];
  challenges: BundleChallenge[];
};
