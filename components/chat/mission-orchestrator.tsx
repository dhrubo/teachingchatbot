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
import {
  type LessonAction,
  isValidTransition,
  assertHasNextAction,
} from "@/lib/learning-state-machine";
import type {
  ChallengeResults,
  WrongAnswerRecord,
} from "./challenge-mode";

export type MissionPhase =
  | "intro"
  | "loading"
  | "cards"
  | "gate"
  | "challenge"
  | "review_mistakes"
  | "results"
  | "content_complete"
  | "topic_selection";

const CARDS_PER_BATCH = 3;

export type ActiveMission = {
  slug: string;
  title: string;
  emoji: string;
};

type MissionContextValue = {
  mission: ActiveMission | null;
  phase: MissionPhase;
  currentCards: ConceptCard[];
  allCards: ConceptCard[];
  conceptCardsSeen: number;
  hasMoreCards: boolean;
  consentState: ChallengeConsentState;
  wrongAnswers: WrongAnswerRecord[];
  allowedActions: LessonAction[];

  startMissionWithCards: (mission: ActiveMission, cards: ConceptCard[]) => void;
  beginMissionLoading: (mission: ActiveMission) => void;
  recordCardSeen: () => void;
  completeCards: () => void;
  continueLearning: () => void;
  startChallengeMode: () => void;
  fastTrackChallenge: () => void;
  finishChallenge: (results: ChallengeResults, wrong: WrongAnswerRecord[]) => void;
  startReviewMistakes: () => void;
  retrySimilar: () => void;
  showAnotherExample: () => void;
  performAction: (action: LessonAction) => void;
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
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerRecord[]>([]);

  const currentCards = useMemo(
    () =>
      allCards.slice(
        batchIndex * CARDS_PER_BATCH,
        batchIndex * CARDS_PER_BATCH + CARDS_PER_BATCH
      ),
    [allCards, batchIndex]
  );

  const hasMoreCards = (batchIndex + 1) * CARDS_PER_BATCH < allCards.length;

  const deriveAllowedActions = useCallback(
    (p: MissionPhase): LessonAction[] => {
      const actions: LessonAction[] = [];
      switch (p) {
        case "cards":
        case "gate":
          if (hasMoreCards) actions.push("continue_learning");
          actions.push("start_challenge");
          actions.push("choose_topic");
          break;
        case "challenge":
          actions.push("review_mistakes");
          actions.push("choose_topic");
          break;
        case "review_mistakes":
          if (wrongAnswers.length > 0) actions.push("retry_similar");
          actions.push("show_example");
          actions.push("continue_learning");
          actions.push("choose_topic");
          break;
        case "results":
          if (wrongAnswers.length > 0) actions.push("review_mistakes");
          actions.push("continue_learning");
          actions.push("next_mission");
          actions.push("choose_topic");
          break;
        case "content_complete":
          actions.push("start_challenge");
          if (wrongAnswers.length > 0) actions.push("review_mistakes");
          actions.push("choose_topic");
          break;
        default:
          break;
      }
      return actions;
    },
    [hasMoreCards, wrongAnswers.length]
  );

  const currentAllowedActions = useMemo(
    () => deriveAllowedActions(phase),
    [deriveAllowedActions, phase]
  );

  // After every phase change, assert the state has exits.
  const assertPhase = useCallback((p: MissionPhase) => {
    assertHasNextAction(p as unknown as Parameters<typeof assertHasNextAction>[0]);
  }, []);

  const beginMissionLoading = useCallback((m: ActiveMission) => {
    setMission(m);
    setAllCards([]);
    setBatchIndex(0);
    setConceptCardsSeen(0);
    setChallengeResults(null);
    setWrongAnswers([]);
    setPhase("loading");
  }, []);

  const startMissionWithCards = useCallback(
    (m: ActiveMission, cards: ConceptCard[]) => {
      setMission(m);
      setAllCards(cards);
      setBatchIndex(0);
      setConceptCardsSeen(0);
      setChallengeResults(null);
      setWrongAnswers([]);
      setPhase("cards");
    },
    []
  );

  const recordCardSeen = useCallback(() => {
    setConceptCardsSeen((n) => n + 1);
  }, []);

  const completeCards = useCallback(() => {
    setPhase("gate");
    assertPhase("gate");
  }, [assertPhase]);

  const continueLearning = useCallback(() => {
    // If no more cards, move to content_complete instead of gate loop.
    if (!hasMoreCards) {
      setPhase("content_complete");
      assertPhase("content_complete");
      return;
    }
    setBatchIndex((i) => i + 1);
    setPhase("cards");
    assertPhase("cards");
  }, [hasMoreCards, assertPhase]);

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
    setWrongAnswers([]);
    setPhase("challenge");
    assertPhase("challenge");
  }, [conceptCardsSeen, assertPhase]);

  const fastTrackChallenge = useCallback(() => {
    setConceptCardsSeen(6); // satisfies the MIN_CONCEPT_CARDS_BEFORE_CHALLENGE gate in code
    setChallengeResults(null);
    setWrongAnswers([]);
    setPhase("challenge");
    assertPhase("challenge");
  }, [assertPhase]);

  const finishChallenge = useCallback(
    (results: ChallengeResults, wrong: WrongAnswerRecord[]) => {
      setChallengeResults(results);
      setWrongAnswers(wrong);
      setPhase("results");
      assertPhase("results");
    },
    [assertPhase]
  );

  const startReviewMistakes = useCallback(() => {
    setPhase("review_mistakes");
    assertPhase("review_mistakes");
  }, [assertPhase]);

  const retrySimilar = useCallback(() => {
    setChallengeResults(null);
    setPhase("challenge");
    assertPhase("challenge");
  }, [assertPhase]);

  const showAnotherExample = useCallback(() => {
    // Show next batch of cards or return to teaching state.
    setPhase("cards");
    assertPhase("cards");
  }, [assertPhase]);

  const performAction = useCallback(
    (action: LessonAction) => {
      if (!isValidTransition(phase as never, action)) {
        console.warn(
          `[state-machine] invalid transition: "${phase}" -> "${action}"`
        );
        return;
      }
      switch (action) {
        case "continue_learning":
          continueLearning();
          break;
        case "start_challenge":
          startChallengeMode();
          break;
        case "retry_similar":
          retrySimilar();
          break;
        case "show_example":
          showAnotherExample();
          break;
        case "review_mistakes":
          startReviewMistakes();
          break;
        case "choose_topic":
          exitMission();
          break;
        case "next_mission":
          exitMission();
          break;
        default:
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, continueLearning, startChallengeMode, retrySimilar, showAnotherExample, startReviewMistakes]
  );

  const exitMission = useCallback(() => {
    setMission(null);
    setAllCards([]);
    setBatchIndex(0);
    setConceptCardsSeen(0);
    setChallengeResults(null);
    setWrongAnswers([]);
    setPhase("intro");
  }, []);

  const value = useMemo(
    () => ({
      mission,
      phase,
      currentCards,
      allCards,
      conceptCardsSeen,
      hasMoreCards,
      consentState: consentStateForPhase(phase, conceptCardsSeen),
      wrongAnswers,
      allowedActions: currentAllowedActions,
      startMissionWithCards,
      beginMissionLoading,
      recordCardSeen,
      completeCards,
      continueLearning,
      startChallengeMode,
      fastTrackChallenge,
      finishChallenge,
      startReviewMistakes,
      retrySimilar,
      showAnotherExample,
      performAction,
      exitMission,
      isInMission: mission !== null,
      challengeResults,
    }),
    [
      mission,
      phase,
      currentCards,
      allCards,
      conceptCardsSeen,
      hasMoreCards,
      wrongAnswers,
      currentAllowedActions,
      startMissionWithCards,
      beginMissionLoading,
      recordCardSeen,
      completeCards,
      continueLearning,
      startChallengeMode,
      fastTrackChallenge,
      finishChallenge,
      startReviewMistakes,
      retrySimilar,
      showAnotherExample,
      performAction,
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
