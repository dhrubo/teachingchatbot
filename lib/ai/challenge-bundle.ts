// Challenge bundle types — the LLM emits one bundle per lesson, and the client
// iterates through the challenges locally without extra LLM calls.

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

export type ChallengeBundle = {
  topic: string;
  lessonIntro: string;
  challenges: BundleChallenge[];
};

export type StoredBundle = {
  topicId: string;
  topic: string;
  lessonIntro: string;
  challenges: BundleChallenge[];
  currentIndex: number;
};

export function getCurrentChallenge(
  bundle: StoredBundle
): BundleChallenge | null {
  return bundle.challenges[bundle.currentIndex] ?? null;
}

export function isBundleComplete(bundle: StoredBundle): boolean {
  return bundle.currentIndex >= bundle.challenges.length;
}

export function advanceBundle(bundle: StoredBundle): StoredBundle {
  return { ...bundle, currentIndex: bundle.currentIndex + 1 };
}
