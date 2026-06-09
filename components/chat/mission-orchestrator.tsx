"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { MissionDefinition } from "@/lib/ai/missions";
import {
  type ChallengeConsentState,
  consentStateForPhase,
} from "@/lib/challenge-gate";
import type { ChallengeResults } from "./challenge-mode";

export type MissionPhase =
  | "intro"
  | "lesson"
  | "cards"
  | "gate"
  | "challenge"
  | "results"
  | "complete";

type MissionContextValue = {
  mission: MissionDefinition | null;
  activeLessonId: string | null;
  phase: MissionPhase;
  conceptCardsSeen: number;
  // Single source of truth for the challenge gate, derived from phase + cards.
  consentState: ChallengeConsentState;
  startMission: (mission: MissionDefinition) => void;
  recordCardSeen: () => void;
  completeCards: () => void;
  // The ONLY action that opens the challenge gate (sets consent -> active).
  startChallengeMode: () => void;
  finishChallenge: (results: ChallengeResults) => void;
  exitMission: () => void;
  isInMission: boolean;
  challengeResults: ChallengeResults | null;
};

const MissionContext = createContext<MissionContextValue | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [mission, setMission] = useState<MissionDefinition | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [phase, setPhase] = useState<MissionPhase>("intro");
  const [conceptCardsSeen, setConceptCardsSeen] = useState(0);
  const [challengeResults, setChallengeResults] =
    useState<ChallengeResults | null>(null);

  const startMission = useCallback((m: MissionDefinition) => {
    setMission(m);
    setConceptCardsSeen(0);
    // For now, the first lesson is the active one.
    const firstLessonId = m.lessons[0]?.id;
    if (firstLessonId) {
      setActiveLessonId(firstLessonId);
      setPhase("cards");
    } else {
      setPhase("lesson");
    }
    setChallengeResults(null);
  }, []);

  const recordCardSeen = useCallback(() => {
    setConceptCardsSeen((n) => n + 1);
  }, []);

  // Cards finished -> show the gate (NOT the challenge). The student must
  // explicitly accept before any question is fetched or rendered.
  const completeCards = useCallback(() => {
    setPhase("gate");
  }, []);

  // The ONLY path that activates Challenge Mode. Topic selection, lesson start,
  // LLM tool calls, message reloads and auto-send effects must never call this.
  const startChallengeMode = useCallback(() => {
    setChallengeResults(null);
    setPhase("challenge");
  }, []);

  const finishChallenge = useCallback((results: ChallengeResults) => {
    setChallengeResults(results);
    setPhase("results");
  }, []);

  const exitMission = useCallback(() => {
    setMission(null);
    setActiveLessonId(null);
    setPhase("intro");
    setConceptCardsSeen(0);
    setChallengeResults(null);
  }, []);

  const value = useMemo(
    () => ({
      mission,
      activeLessonId,
      phase,
      conceptCardsSeen,
      consentState: consentStateForPhase(phase, conceptCardsSeen),
      startMission,
      recordCardSeen,
      completeCards,
      startChallengeMode,
      finishChallenge,
      exitMission,
      isInMission: mission !== null,
      challengeResults,
    }),
    [
      mission,
      activeLessonId,
      phase,
      conceptCardsSeen,
      startMission,
      recordCardSeen,
      completeCards,
      startChallengeMode,
      finishChallenge,
      exitMission,
      challengeResults,
    ]
  );

  return (
    <MissionContext.Provider value={value}>{children}</MissionContext.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) {
    throw new Error("useMission must be used within MissionProvider");
  }
  return ctx;
}
