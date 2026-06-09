"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ConceptCard } from "@/lib/ai/missions";
import {
  type ChallengeConsentState,
  canStartChallenge,
  consentStateForPhase,
} from "@/lib/challenge-gate";
import type { ChallengeResults } from "./challenge-mode";

export type MissionPhase =
  | "intro" // nothing active
  | "loading" // fetching the mission's concept cards
  | "cards" // showing a batch of concept cards
  | "gate" // lesson footer: Continue Learning / Start Challenge / Choose Another Topic
  | "challenge" // full-screen challenge running
  | "results" // challenge results
  | "complete";

// How many concept cards are shown per batch before the footer choices appear.
const CARDS_PER_BATCH = 3;

export type ActiveMission = {
  // The bare slug (e.g. "ratio-and-proportion") used by the adaptive engine.
  slug: string;
  title: string;
  emoji: string;
};

type MissionContextValue = {
  mission: ActiveMission | null;
  phase: MissionPhase;
  // The concept cards for the CURRENT batch (≤ CARDS_PER_BATCH).
  currentCards: ConceptCard[];
  // Total distinct cards the student has seen this mission (drives the gate).
  conceptCardsSeen: number;
  // Are there more card batches after the current one?
  hasMoreCards: boolean;
  // Single source of truth for the challenge gate, derived from phase + cards.
  consentState: ChallengeConsentState;
  // Start a mission with its (already-loaded) concept cards.
  startMissionWithCards: (mission: ActiveMission, cards: ConceptCard[]) => void;
  // Show a loading state while cards are fetched.
  beginMissionLoading: (mission: ActiveMission) => void;
  recordCardSeen: () => void;
  // Cards batch finished → show the lesson footer (NOT a challenge).
  completeCards: () => void;
  // "Continue Learning" → reveal the next batch of cards.
  continueLearning: () => void;
  // The ONLY action that opens the challenge gate. Requires an explicit click
  // AND ≥ MIN_CONCEPT_CARDS_BEFORE_CHALLENGE cards seen — both, no exceptions.
  startChallengeMode: () => void;
  finishChallenge: (results: ChallengeResults) => void;
  // Leave the mission UI entirely (Choose Another Topic / Return Home).
  exitMission: () => void;
  isInMission: boolean;
  challengeResults: ChallengeResults | null;
};

const MissionContext = createContext<MissionContextValue | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [mission, setMission] = useState<ActiveMission | null>(null);
  const [allCards, setAllCards] = useState<ConceptCard[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [phase, setPhase] = useState<MissionPhase>("intro");
  const [conceptCardsSeen, setConceptCardsSeen] = useState(0);
  const [challengeResults, setChallengeResults] =
    useState<ChallengeResults | null>(null);

  const currentCards = useMemo(
    () =>
      allCards.slice(
        batchIndex * CARDS_PER_BATCH,
        batchIndex * CARDS_PER_BATCH + CARDS_PER_BATCH
      ),
    [allCards, batchIndex]
  );

  const hasMoreCards = (batchIndex + 1) * CARDS_PER_BATCH < allCards.length;

  const beginMissionLoading = useCallback((m: ActiveMission) => {
    setMission(m);
    setAllCards([]);
    setBatchIndex(0);
    setConceptCardsSeen(0);
    setChallengeResults(null);
    setPhase("loading");
  }, []);

  const startMissionWithCards = useCallback(
    (m: ActiveMission, cards: ConceptCard[]) => {
      setMission(m);
      setAllCards(cards);
      setBatchIndex(0);
      setConceptCardsSeen(0);
      setChallengeResults(null);
      setPhase("cards");
    },
    []
  );

  const recordCardSeen = useCallback(() => {
    setConceptCardsSeen((n) => n + 1);
  }, []);

  // Cards finished → lesson footer (NOT a challenge). The student decides next.
  const completeCards = useCallback(() => {
    setPhase("gate");
  }, []);

  const continueLearning = useCallback(() => {
    setBatchIndex((i) => i + 1);
    setPhase("cards");
  }, []);

  // The ONLY path that activates Challenge Mode. Topic selection, lesson start,
  // LLM tool calls, message reloads, auto-send and typed acknowledgements
  // ("ok", "next", …) must never reach this. The guard enforces both required
  // conditions regardless of how it is called.
  const startChallengeMode = useCallback(() => {
    if (
      !canStartChallenge({
        explicitUserClick: true,
        conceptCardsSeen,
      })
    ) {
      return;
    }
    setChallengeResults(null);
    setPhase("challenge");
  }, [conceptCardsSeen]);

  const finishChallenge = useCallback((results: ChallengeResults) => {
    setChallengeResults(results);
    setPhase("results");
  }, []);

  const exitMission = useCallback(() => {
    setMission(null);
    setAllCards([]);
    setBatchIndex(0);
    setConceptCardsSeen(0);
    setChallengeResults(null);
    setPhase("intro");
  }, []);

  const value = useMemo(
    () => ({
      mission,
      phase,
      currentCards,
      conceptCardsSeen,
      hasMoreCards,
      consentState: consentStateForPhase(phase, conceptCardsSeen),
      startMissionWithCards,
      beginMissionLoading,
      recordCardSeen,
      completeCards,
      continueLearning,
      startChallengeMode,
      finishChallenge,
      exitMission,
      isInMission: mission !== null,
      challengeResults,
    }),
    [
      mission,
      phase,
      currentCards,
      conceptCardsSeen,
      hasMoreCards,
      startMissionWithCards,
      beginMissionLoading,
      recordCardSeen,
      completeCards,
      continueLearning,
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
