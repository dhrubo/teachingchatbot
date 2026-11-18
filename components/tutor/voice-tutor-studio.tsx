"use client";

import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  HelpCircle,
  Layers,
  Lock,
  Mic,
  RefreshCw,
  Sparkles,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AntiCheatQuiz } from "@/components/quiz/anti-cheat-quiz";
import { TopNavBar } from "@/components/ranedeer/top-nav-bar";
import { LivePodcastScript } from "@/components/voice/live-podcast-script";
import { useVoiceEngine } from "@/components/voice/use-voice-engine";
import { VoiceOrbBar } from "@/components/voice/voice-orb-bar";
import { LiveMathsBoard } from "@/components/whiteboard/live-maths-board";
import type {
  TutorTurnAction,
  TutorTurnResponse,
} from "@/lib/ai/ranedeer-engine";
import {
  ALL_LENSES,
  type EdexcelTopic,
  LENS_META,
} from "@/lib/curriculum/types";
import type {
  EdexcelTier,
  ExplanationLens,
  StoredTutorTurn,
  ToneStyle,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type VoiceTutorStudioProps = {
  topic: EdexcelTopic;
  initialMode?: "tutorial" | "quiz";
  initialLearner: {
    nickname: string;
    tier: EdexcelTier;
    targetGrade: number;
    preferredLens: ExplanationLens;
    toneStyle: ToneStyle;
    speechSpeed: string;
    currentStreak: number;
    streakFreezes: number;
    totalXp: number;
    reminderEnabled: boolean;
  };
  initialMasteryScore: number;
  initialLensesTried: ExplanationLens[];
  initialStage: string;
  initialTurns: StoredTutorTurn[];
};

export function VoiceTutorStudio({
  topic,
  initialMode = "tutorial",
  initialLearner,
  initialMasteryScore,
  initialLensesTried,
  initialStage,
  initialTurns,
}: VoiceTutorStudioProps) {
  const [studioMode, setStudioMode] = useState<"tutorial" | "quiz">(
    initialMode
  );
  const startingLens = initialLearner.preferredLens;
  const startingPack = topic.lenses[startingLens];

  const [activeLens, setActiveLens] = useState<ExplanationLens>(startingLens);
  const [stage, setStage] = useState<string>(initialStage || "1.1");
  const [masteryScore, setMasteryScore] = useState<number>(initialMasteryScore);
  const [lensesTried, setLensesTried] = useState<ExplanationLens[]>(
    initialLensesTried.length > 0 ? initialLensesTried : [startingLens]
  );
  const [streak, setStreak] = useState(initialLearner.currentStreak);
  const [freezes, setFreezes] = useState(initialLearner.streakFreezes);
  const [xp, setXp] = useState(initialLearner.totalXp);
  const [streakBanner, setStreakBanner] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [currentTurn, setCurrentTurn] = useState<TutorTurnResponse>({
    spokenText: startingPack.spokenText,
    displayText: startingPack.displayText,
    followUpQuestion: startingPack.followUpQuestion,
    activeLens: startingLens,
    stage: initialStage || "1.1",
    board: startingPack.board,
    providerUsed: "Edexcel Curated Multi-Lens Engine",
  });

  const [dialogue, setDialogue] = useState<
    Array<{
      id: string;
      role: "learner" | "tutor";
      text: string;
      lens?: string;
    }>
  >(() =>
    initialTurns.slice(-8).map((t) => ({
      id: t.id,
      role: t.role,
      text: t.text,
      lens: t.lens,
    }))
  );

  // Keep latest stage/lens in refs so the voice callback never reads stale state
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const activeLensRef = useRef(activeLens);
  activeLensRef.current = activeLens;

  const sendTurnRef = useRef<
    (params: {
      action: TutorTurnAction;
      targetLens?: ExplanationLens;
      learnerMessage?: string;
    }) => Promise<void>
  >(async () => undefined);

  const voice = useVoiceEngine({
    speechSpeed: initialLearner.speechSpeed,
    autoSpeak: true,
    onTranscript: (spokenText) => {
      sendTurnRef.current({
        action: "ask",
        learnerMessage: spokenText,
      });
    },
  });

  const sendTurn = useCallback(
    async ({
      action,
      targetLens,
      learnerMessage,
    }: {
      action: TutorTurnAction;
      targetLens?: ExplanationLens;
      learnerMessage?: string;
    }) => {
      setIsBusy(true);
      setStreakBanner(null);

      if (learnerMessage?.trim()) {
        setDialogue((prev) => [
          ...prev.slice(-10),
          {
            id: `u-${Date.now()}`,
            role: "learner",
            text: learnerMessage.trim(),
          },
        ]);
      }

      try {
        const res = await fetch("/api/tutor/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicSlug: topic.slug,
            action,
            targetLens: targetLens ?? activeLensRef.current,
            stage: stageRef.current,
            learnerMessage,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to reach tutor turn endpoint");
        }

        const data = (await res.json()) as {
          turn: TutorTurnResponse;
          progress: {
            masteryScore: number;
            lensesTried: ExplanationLens[];
            currentStage: string;
          };
          streak: {
            currentStreak: number;
            streakFreezes: number;
            totalXp: number;
            streakIncremented: boolean;
            usedFreeze: boolean;
            earnedBonusFreeze: boolean;
          };
        };

        setCurrentTurn(data.turn);
        setActiveLens(data.turn.activeLens);
        setStage(data.turn.stage);
        setMasteryScore(data.progress.masteryScore);
        setLensesTried(data.progress.lensesTried);
        setStreak(data.streak.currentStreak);
        setFreezes(data.streak.streakFreezes);
        setXp(data.streak.totalXp);

        if (data.streak.streakIncremented) {
          setStreakBanner(
            data.streak.earnedBonusFreeze
              ? `🔥 ${data.streak.currentStreak}-Day Streak! +1 Bonus Streak Freeze earned!`
              : data.streak.usedFreeze
                ? `🛡️ Streak Freeze saved your ${data.streak.currentStreak}-Day Streak!`
                : `🔥 Daily practice logged — ${data.streak.currentStreak}-Day Streak!`
          );
        }

        setDialogue((prev) => [
          ...prev.slice(-10),
          {
            id: `t-${Date.now()}`,
            role: "tutor",
            text: data.turn.displayText,
            lens: LENS_META[data.turn.activeLens].shortLabel,
          },
        ]);

        await voice.speak(data.turn.spokenText);
      } catch {
        // Offline client fallback so buttons stay responsive even if network drops
        const fallbackLens = targetLens ?? activeLensRef.current;
        const pack = topic.lenses[fallbackLens];
        setCurrentTurn({
          spokenText: pack.spokenText,
          displayText: pack.displayText,
          followUpQuestion: pack.followUpQuestion,
          activeLens: fallbackLens,
          stage: "1.1",
          board: pack.board,
          providerUsed: "Offline Curated Lens",
        });
        await voice.speak(pack.spokenText);
      } finally {
        setIsBusy(false);
      }
    },
    [topic, voice]
  );

  sendTurnRef.current = sendTurn;

  const stageBadgeLabel = stage.startsWith("prereq:")
    ? `Prerequisite ${topic.prerequisites[Number.parseInt(stage.slice(7), 10)]?.code ?? "0.1"}`
    : stage === "test:0"
      ? "Mastery Test · Level 3/10"
      : stage === "test:1"
        ? "Mastery Test · Level 6/10"
        : stage === "test:2"
          ? "Mastery Test · Level 9/10"
          : stage === "complete"
            ? "Topic Mastery Complete!"
            : "Main Lesson · 1.1";

  return (
    <div className="min-h-screen pb-36">
      <TopNavBar
        currentStreak={streak}
        nickname={initialLearner.nickname}
        reminderEnabled={initialLearner.reminderEnabled}
        streakFreezes={freezes}
        targetGrade={initialLearner.targetGrade}
        tier={initialLearner.tier}
        totalXp={xp}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-5">
        {/* Breadcrumb + Topic Title + Mastery */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-1.5 text-slate-400 text-xs hover:text-orange-300"
              href="/"
            >
              <ArrowLeft className="size-3.5" />
              Back to Edexcel 1MA1 Topics
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h1 className="font-extrabold text-white text-xl sm:text-2xl">
                {topic.title}
              </h1>
              <span className="rounded-md border border-violet-400/35 bg-violet-500/15 px-2 py-0.5 font-mono text-violet-200 text-xs">
                {topic.edexcelCode} · {topic.gradeRange}
              </span>
              <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-200 text-xs">
                {stageBadgeLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <div className="font-semibold text-slate-200">
                {lensesTried.length}/5 Ways Explored · {masteryScore}% Mastery
              </div>
              <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all"
                  style={{ width: `${Math.max(5, masteryScore)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {streakBanner ? (
          <div className="flex items-center gap-2 rounded-2xl border border-orange-400/40 bg-orange-500/15 px-4 py-2.5 font-semibold text-orange-100 text-xs">
            <Flame className="size-4 text-orange-400" />
            <span>{streakBanner}</span>
          </div>
        ) : null}

        {/* 2-Step Mode Switcher: 1. Guided Voice Tutorial vs 2. No-Cheat Mastery Quiz */}
        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-slate-950/75 p-2 sm:grid-cols-2">
          <button
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-xs transition sm:text-sm",
              studioMode === "tutorial"
                ? "bg-gradient-to-r from-orange-500 to-violet-600 text-white shadow-md"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            )}
            onClick={() => setStudioMode("tutorial")}
            type="button"
          >
            <Mic className="size-4" />
            <span>Step 1: Guided Voice Tutorial (5 Ways)</span>
          </button>

          <button
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-xs transition sm:text-sm",
              studioMode === "quiz"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                : "text-emerald-200 hover:bg-emerald-500/15"
            )}
            onClick={() => {
              voice.stopSpeaking();
              setStudioMode("quiz");
            }}
            type="button"
          >
            <Lock className="size-4" />
            <span>Step 2: No-Cheat Mastery Quiz (5 Qs)</span>
          </button>
        </div>

        {studioMode === "quiz" ? (
          <AntiCheatQuiz
            onBackToTutorial={() => setStudioMode("tutorial")}
            onQuizCompleted={({ currentStreak, xpEarned }) => {
              setStreak(currentStreak);
              setXp((prev) => prev + xpEarned);
            }}
            speechSpeed={initialLearner.speechSpeed}
            topicSlug={topic.slug}
            topicTitle={topic.title}
          />
        ) : (
          <>
            {/* 5 Explanation Lens Tabs + Mr. Ranedeer Quick Actions */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/65 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5" role="tablist">
                  {ALL_LENSES.map((lens) => {
                    const isSelected = activeLens === lens;
                    const wasTried = lensesTried.includes(lens);
                    return (
                      <button
                        aria-selected={isSelected}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold text-xs transition",
                          isSelected
                            ? "border-orange-400/60 bg-gradient-to-r from-orange-500/30 to-violet-500/30 text-white shadow-sm"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
                        )}
                        disabled={isBusy}
                        key={lens}
                        onClick={() =>
                          sendTurn({ action: "switch_lens", targetLens: lens })
                        }
                        role="tab"
                        type="button"
                      >
                        {wasTried ? (
                          <CheckCircle2 className="size-3.5 text-emerald-400" />
                        ) : null}
                        <span>{LENS_META[lens].label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 px-3.5 py-2 font-bold text-white text-xs shadow-md transition hover:brightness-110 disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => sendTurn({ action: "explain_differently" })}
                  type="button"
                >
                  <RefreshCw className="size-3.5" />
                  Explain It Another Way
                </button>
              </div>

              {/* Mr. Ranedeer Command Strip: Prerequisite Ladder, Quiz CTA, Hint, Read Aloud */}
              <div className="flex flex-wrap items-center gap-2 border-white/10 border-t pt-2.5 text-xs">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => sendTurn({ action: "step_back_prerequisite" })}
                  type="button"
                >
                  <Layers className="size-3.5 text-cyan-400" />
                  Step Back: Prerequisites (0.1 → 0.{topic.prerequisites.length}
                  )
                </button>

                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                  onClick={() => {
                    voice.stopSpeaking();
                    setStudioMode("quiz");
                  }}
                  type="button"
                >
                  <Lock className="size-3.5 text-emerald-400" />
                  Ready? Start 5-Q No-Cheat Quiz →
                </button>

                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => sendTurn({ action: "hint" })}
                  type="button"
                >
                  <HelpCircle className="size-3.5 text-amber-400" />
                  Give Me a Hint
                </button>

                <button
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-medium text-slate-200 transition hover:bg-white/10"
                  onClick={() => voice.speak(currentTurn.spokenText, true)}
                  type="button"
                >
                  <Volume2 className="size-3.5 text-orange-400" />
                  Read Aloud
                </button>
              </div>
            </div>

            {/* Main 2-Column Studio: Left = Live Visual Maths Board, Right = Mr. Ranedeer Tutor & Curriculum */}
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <LiveMathsBoard
                  board={currentTurn.board}
                  edexcelCode={topic.edexcelCode}
                />
              </div>

              <div className="flex flex-col gap-4 lg:col-span-5">
                {/* Mr. Ranedeer Spoken / Written Explanation Card */}
                <section className="glass-panel flex flex-col gap-3.5 rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-violet-600 text-base">
                        🎙️
                      </span>
                      <div>
                        <div className="font-bold text-sm text-white">
                          Jori · Podcast Tutor
                        </div>
                        <div className="text-[11px] text-slate-400">
                          English Podcast Mode · {currentTurn.providerUsed}
                        </div>
                      </div>
                    </div>
                    {voice.voiceState === "speaking" ? (
                      <span className="animate-pulse rounded-full bg-orange-500/20 px-2.5 py-0.5 font-semibold text-[11px] text-orange-300">
                        Jori Speaking...
                      </span>
                    ) : null}
                  </div>

                  {currentTurn.answerFeedback ? (
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2 font-semibold text-xs",
                        currentTurn.answerFeedback.isCorrect
                          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                          : "border-amber-400/40 bg-amber-500/15 text-amber-200"
                      )}
                    >
                      <Award className="size-4 shrink-0" />
                      <span>
                        {currentTurn.answerFeedback.isCorrect
                          ? `Spot on! +${currentTurn.answerFeedback.xpAwarded} XP`
                          : currentTurn.answerFeedback.needsClarification
                            ? "Quick spoken-maths check:"
                            : `Keep going (+${currentTurn.answerFeedback.xpAwarded} XP effort) — use the clue below!`}
                      </span>
                    </div>
                  ) : null}

                  {/* Live Synchronized Word-by-Word Podcast Script */}
                  <LivePodcastScript
                    activeScript={voice.activeScript || currentTurn.spokenText}
                    activeWordIndex={
                      voice.activeScript ? voice.activeWordIndex : -1
                    }
                    isLoadingAudio={voice.isLoadingAudio}
                    onReplay={() => voice.speak(currentTurn.spokenText, true)}
                    onStop={voice.stopSpeaking}
                    printedWords={
                      voice.activeScript
                        ? voice.printedWords
                        : currentTurn.spokenText.trim().split(/\s+/)
                    }
                    speechProgress={
                      voice.activeScript ? voice.speechProgress : 1
                    }
                    voiceState={voice.voiceState}
                  />

                  <p className="text-slate-300 text-xs leading-relaxed">
                    {currentTurn.displayText}
                  </p>

                  {/* Guided Next Step / Socratic Question */}
                  <div className="rounded-xl border border-violet-400/35 bg-violet-500/10 p-3.5">
                    <div className="mb-1 flex items-center gap-1.5 font-semibold text-violet-300 text-xs">
                      <Sparkles className="size-3.5" />
                      Your Turn (Speak or Type Below)
                    </div>
                    <p className="font-medium text-sm text-white">
                      {currentTurn.followUpQuestion}
                    </p>
                  </div>
                </section>

                {/* Mr. Ranedeer Curriculum Tree (0.x Prerequisites -> 1.x Main Curriculum) */}
                <section className="glass-panel rounded-2xl p-4 text-xs">
                  <div className="mb-2.5 flex items-center gap-1.5 font-bold text-slate-200">
                    <BookOpen className="size-4 text-violet-400" />
                    Mr. Ranedeer Curriculum Plan ({topic.edexcelCode})
                  </div>

                  <div className="space-y-1.5">
                    {topic.prerequisites.map((pre, idx) => (
                      <div
                        className={cn(
                          "flex items-center justify-between rounded-lg px-2.5 py-1.5",
                          stage === `prereq:${idx}`
                            ? "border border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                            : "bg-white/[0.02] text-slate-400"
                        )}
                        key={pre.code}
                      >
                        <span>
                          <strong className="font-mono text-cyan-300">
                            {pre.code}
                          </strong>{" "}
                          {pre.title}
                        </span>
                        <span className="text-[10px] uppercase">Prereq</span>
                      </div>
                    ))}

                    {topic.mainCurriculum.map((node) => (
                      <div
                        className={cn(
                          "flex items-center justify-between rounded-lg px-2.5 py-1.5",
                          stage === "1.1" && node.code === "1.1"
                            ? "border border-orange-400/40 bg-orange-500/15 text-orange-100"
                            : "bg-white/[0.02] text-slate-300"
                        )}
                        key={node.code}
                      >
                        <span>
                          <strong className="font-mono text-orange-300">
                            {node.code}
                          </strong>{" "}
                          {node.title}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          Core
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Recent Conversation History */}
                {dialogue.length > 0 ? (
                  <section className="glass-panel max-h-52 space-y-2 overflow-y-auto rounded-2xl p-4 text-xs">
                    <div className="font-semibold text-slate-400">
                      Recent Voice &amp; Chat Turns
                    </div>
                    {dialogue.map((item) => (
                      <div
                        className={cn(
                          "rounded-xl px-3 py-2",
                          item.role === "learner"
                            ? "ml-6 bg-violet-500/20 text-violet-100"
                            : "mr-4 bg-white/5 text-slate-200"
                        )}
                        key={item.id}
                      >
                        <span className="mr-1.5 font-bold text-[10px] uppercase opacity-75">
                          {item.role === "learner"
                            ? initialLearner.nickname
                            : `Tutor${item.lens ? ` · ${item.lens}` : ""}`}
                          :
                        </span>
                        {item.text}
                      </div>
                    ))}
                  </section>
                ) : null}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Sticky Bottom Voice Mic + Quiet Keyboard Bar (locked during No-Cheat Quiz) */}
      {studioMode === "tutorial" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-4xl px-4 pb-4">
          <VoiceOrbBar
            canReplay={Boolean(
              voice.lastSpokenText || currentTurn.spokenText.length > 0
            )}
            isBusy={isBusy}
            muted={voice.muted}
            onReplaySpeech={() =>
              voice.speak(voice.lastSpokenText || currentTurn.spokenText, true)
            }
            onStartListening={voice.startListening}
            onStopListening={voice.stopListening}
            onStopSpeech={voice.stopSpeaking}
            onSubmitText={(text) =>
              sendTurn({ action: "ask", learnerMessage: text })
            }
            onToggleMute={() => voice.setMuted((m) => !m)}
            voiceError={voice.voiceError}
            voiceState={voice.voiceState}
            volumeLevel={voice.volumeLevel}
          />
        </div>
      ) : null}
    </div>
  );
}
