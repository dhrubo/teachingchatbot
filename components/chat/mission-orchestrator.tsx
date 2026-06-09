"use client";

import { createContext, useContext, type ReactNode, useState, useCallback, useMemo } from "react";
import type { MissionDefinition } from "@/lib/ai/missions";
import type { ActiveQuestion } from "@/lib/active-question";
import type { ChallengeResults } from "./challenge-mode";

export type MissionPhase = "intro" | "lesson" | "cards" | "gate" | "challenge" | "results" | "complete";

type MissionContextValue = {
  mission: MissionDefinition | null;
  phase: MissionPhase;
  startMission: (mission: MissionDefinition) => void;
  advancePhase: (to: MissionPhase) => void;
  completeCards: () => void;
  startChallenge: (questions: ActiveQuestion[]) => void;
  finishChallenge: (results: ChallengeResults) => void;
  exitMission: () => void;
  isInMission: boolean;
  challengeQuestions: ActiveQuestion[];
  challengeResults: ChallengeResults | null;
};

const MissionContext = createContext<MissionContextValue | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [mission, setMission] = useState<MissionDefinition | null>(null);
  const [phase, setPhase] = useState<MissionPhase>("intro");
  const [challengeQuestions, setChallengeQuestions] = useState<ActiveQuestion[]>([]);
  const [challengeResults, setChallengeResults] = useState<ChallengeResults | null>(null);

  const startMission = useCallback((m: MissionDefinition) => {
    setMission(m);
    setPhase("lesson");
    setChallengeQuestions([]);
    setChallengeResults(null);
  }, []);

  const advancePhase = useCallback((to: MissionPhase) => {
    setPhase(to);
  }, []);

  const completeCards = useCallback(() => {
    setPhase("gate");
  }, []);

  const startChallenge = useCallback((questions: ActiveQuestion[]) => {
    setChallengeQuestions(questions);
    setChallengeResults(null);
    setPhase("challenge");
  }, []);

  const finishChallenge = useCallback((results: ChallengeResults) => {
    setChallengeResults(results);
    setPhase("results");
  }, []);

  const exitMission = useCallback(() => {
    setMission(null);
    setPhase("intro");
    setChallengeQuestions([]);
    setChallengeResults(null);
  }, []);

  const value = useMemo(
    () => ({
      mission,
      phase,
      startMission,
      advancePhase,
      completeCards,
      startChallenge,
      finishChallenge,
      exitMission,
      isInMission: mission !== null,
      challengeQuestions,
      challengeResults,
    }),
    [mission, phase, challengeQuestions, challengeResults]
  );

  return (
    <MissionContext.Provider value={value}>
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMission must be used within MissionProvider");
  return ctx;
}
