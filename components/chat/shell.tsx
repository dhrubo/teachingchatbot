"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useActiveChat } from "@/hooks/use-active-chat";
import {
  initialArtifactData,
  useArtifact,
  useArtifactSelector,
} from "@/hooks/use-artifact";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn, fetcher } from "@/lib/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { guestRegex } from "@/lib/constants";
import { ProfileSelector } from "./profile-selector";
import { AchievementToast } from "./achievement-toast";
import { Artifact } from "./artifact";
import { ChallengeMode, type ChallengeResults } from "./challenge-mode";
import { ChallengeResultsScreen } from "./challenge-results";
import { ChatHeader } from "./chat-header";
import { ConceptCardSlides } from "./concept-card-slides";
import { ContentCompleteScreen } from "./content-complete-screen";
import { DataStreamHandler } from "./data-stream-handler";
import { submitEditedMessage } from "./message-editor";
import { Messages } from "./messages";
import { useMission } from "./mission-orchestrator";
import { MultimodalInput } from "./multimodal-input";
import { ReviewMistakesScreen } from "./review-mistakes-screen";
import { SaraDashboard } from "./sara-dashboard";
import { TopicSelectScreen } from "./topic-select-screen";
import type { LessonAction } from "@/lib/learning-state-machine";

export function ChatShell() {
  const {
    chatId,
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    addToolApprovalResponse,
    input,
    setInput,
    visibilityType,
    isReadonly,
    isLoading,
    votes,
    currentModelId,
    setCurrentModelId,
    showCreditCardAlert,
    setShowCreditCardAlert,
    leaveTopicTarget,
    confirmLeave,
    cancelLeave,
  } = useActiveChat();

  const {
    mission,
    phase,
    currentCards,
    hasMoreCards,
    consentState,
    isInMission,
    recordCardSeen,
    completeCards,
    continueLearning,
    startChallengeMode,
    fastTrackChallenge,
    finishChallenge,
    exitMission,
    challengeResults,
    wrongAnswers,
    allowedActions,
    startReviewMistakes,
    retrySimilar,
    showAnotherExample,
    performAction,
  } = useMission();

  const { data: sessionData, status: authStatus } = useSession();
  const isGuest = guestRegex.test(sessionData?.user?.email ?? "");
  const isLoggedIn = authStatus === "authenticated" && !isGuest;

  const { data: profilesData } = useSWR(
    isLoggedIn ? "/api/profiles" : null,
    fetcher
  );

  const missionSlug = mission?.slug ?? "";

  const handleMissionContinue = useCallback(() => {
    exitMission();
  }, [exitMission]);

  const handleMissionAction = useCallback(
    (action: LessonAction) => {
      if (action === "choose_topic" || action === "next_mission") {
        exitMission();
      } else if (action === "start_challenge") {
        startChallengeMode();
      } else if (action === "review_mistakes") {
        startReviewMistakes();
      } else if (action === "retry_similar") {
        retrySimilar();
      } else if (action === "show_example" || action === "continue_learning") {
        continueLearning();
      }
    },
    [exitMission, startChallengeMode, startReviewMistakes, retrySimilar, continueLearning]
  );

  const handleChallengeComplete = useCallback(
    (results: ChallengeResults) => {
      finishChallenge(results, results.wrongAnswers ?? []);
    },
    [finishChallenge]
  );

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { setArtifact } = useArtifact();

  const stopRef = useRef(stop);
  stopRef.current = stop;

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      stopRef.current();
      setArtifact(initialArtifactData);
      setEditingMessage(null);
      setAttachments([]);
    }
  }, [chatId, setArtifact]);

  return (
    <>
      <div className="flex h-dvh w-full flex-row overflow-hidden">
        <div
          className={cn(
            "relative flex min-w-0 flex-col bg-[#090915] transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] border-r border-indigo-950/40",
            isArtifactVisible ? "w-[40%]" : "w-full"
          )}
        >
          <AchievementToast />
          <ChatHeader
            chatId={chatId}
            isReadonly={isReadonly}
            selectedVisibilityType={visibilityType}
          />

          {isLoggedIn && !profilesData?.activeProfile ? (
            <ProfileSelector />
          ) : (
            <>
              {messages.length === 0 && !isLoading && !isInMission && (
                <div className="flex-1 overflow-y-auto">
                  <SaraDashboard />
                </div>
              )}

              {/* ---- Loading ---- */}
              {isInMission && phase === "loading" && mission && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090915]/80 backdrop-blur-md px-4">
                  <div className="relative w-full max-w-2xl border border-indigo-950/50 bg-indigo-950/25 shadow-xl shadow-indigo-950/50 rounded-2xl backdrop-blur-md p-8 md:p-12 flex flex-col items-center justify-center gap-4 text-center">
                    <button
                      onClick={exitMission}
                      className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-indigo-400/60 transition-colors hover:bg-indigo-950/50 hover:text-indigo-200"
                      aria-label="Close"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                    <span className="animate-pulse text-4xl">{mission.emoji}</span>
                    <p className="text-base font-medium text-indigo-200">
                      Loading {mission.title}…
                    </p>
                  </div>
                </div>
              )}

              {/* ---- Concept Cards ---- */}
              {isInMission && phase === "cards" && mission && (
                <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[#090915]/80 p-4 backdrop-blur-md">
                  <div className="relative w-full max-w-2xl border border-indigo-950/50 bg-indigo-950/25 shadow-xl shadow-indigo-950/50 rounded-2xl backdrop-blur-md p-6 md:p-8 transition-all duration-300 hover:border-indigo-800/40 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]">
                    <button
                      onClick={exitMission}
                      className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-indigo-400/60 transition-colors hover:bg-indigo-950/50 hover:text-indigo-200"
                      aria-label="Close"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                    <div className="mb-5 text-center">
                      <span className="text-3xl">{mission.emoji}</span>
                      <h3 className="mt-2 text-xl font-bold text-foreground tracking-tight">
                        {mission.title}
                      </h3>
                      <p className="text-sm text-indigo-300/80">
                        Concept review
                      </p>
                    </div>
                    {currentCards.length > 0 && (
                      <ConceptCardSlides
                        cards={currentCards}
                        onCardSeen={recordCardSeen}
                        onChooseAnother={exitMission}
                        onComplete={completeCards}
                        onSkipToQuiz={fastTrackChallenge}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ---- Lesson Footer / Gate ---- */}
              {isInMission && phase === "gate" && mission && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090915]/80 px-4 backdrop-blur-md">
                  <div className="relative w-full max-w-2xl border border-indigo-950/50 bg-indigo-950/25 shadow-xl shadow-indigo-950/50 rounded-2xl backdrop-blur-md p-8 md:p-10 text-center transition-all duration-300 hover:border-indigo-800/40 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]">
                    <button
                      onClick={exitMission}
                      className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-indigo-400/60 transition-colors hover:bg-indigo-950/50 hover:text-indigo-200"
                      aria-label="Close"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                    <span className="text-4xl">{mission.emoji}</span>
                    <h3 className="mt-3 text-2xl font-bold text-foreground tracking-tight">
                      {mission.title}
                    </h3>
                    <p className="mt-2 text-base text-indigo-200">
                      What would you like to do next?
                    </p>
                    <div className="mt-8 flex flex-col gap-3 max-w-md mx-auto">
                      {hasMoreCards && (
                        <Button
                          className="rounded-full py-5 text-sm font-medium hover:bg-indigo-950/40 border-indigo-950/60 hover:translate-y-[-1px] transition-all"
                          onClick={continueLearning}
                          size="default"
                          variant="outline"
                        >
                          Continue Learning
                        </Button>
                      )}
                      <Button
                        className="rounded-full bg-[image:var(--gradient-sunset)] py-5 font-bold text-white shadow-lg shadow-amber-500/15 hover:opacity-95 hover:translate-y-[-1px] hover:scale-[1.01] transition-all duration-200 text-sm"
                        onClick={startChallengeMode}
                        size="default"
                      >
                        Start Challenge Mode
                      </Button>
                      <Button
                        className="rounded-full py-5 text-sm font-medium text-muted-foreground hover:text-foreground hover:translate-y-[-1px] transition-all"
                        onClick={exitMission}
                        size="default"
                        variant="ghost"
                      >
                        Choose Another Topic
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- Review Mistakes ---- */}
              {isInMission && phase === "review_mistakes" && mission && (
                <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[#090915]/80 p-4 backdrop-blur-md">
                  <div className="relative w-full max-w-2xl border border-indigo-950/50 bg-indigo-950/25 shadow-xl shadow-indigo-950/50 rounded-2xl backdrop-blur-md p-6 md:p-8 transition-all duration-300 hover:border-indigo-800/40 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]">
                    <button
                      onClick={exitMission}
                      className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-indigo-400/60 transition-colors hover:bg-indigo-950/50 hover:text-indigo-200"
                      aria-label="Close"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                    <ReviewMistakesScreen
                      missionTitle={mission.title}
                      missionEmoji={mission.emoji}
                      wrongAnswers={wrongAnswers}
                      allowedActions={allowedActions}
                      onAction={handleMissionAction}
                    />
                  </div>
                </div>
              )}

              {/* ---- Content Complete (end of lesson cards) ---- */}
              {isInMission && phase === "content_complete" && mission && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090915]/80 px-4 backdrop-blur-md">
                  <div className="relative w-full max-w-2xl border border-indigo-950/50 bg-indigo-950/25 shadow-xl shadow-indigo-950/50 rounded-2xl backdrop-blur-md p-8 md:p-10 transition-all duration-300 hover:border-indigo-800/40 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]">
                    <button
                      onClick={exitMission}
                      className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-indigo-400/60 transition-colors hover:bg-indigo-950/50 hover:text-indigo-200"
                      aria-label="Close"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                    <ContentCompleteScreen
                      missionTitle={mission.title}
                      missionEmoji={mission.emoji}
                      allowedActions={allowedActions}
                      onAction={handleMissionAction}
                    />
                  </div>
                </div>
              )}

              {/* ---- Results ---- */}
              {isInMission &&
                phase === "results" &&
                challengeResults &&
                mission && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090915]/80 px-4 backdrop-blur-md">
                    <div className="relative w-full max-w-2xl border border-indigo-950/50 bg-indigo-950/25 shadow-xl shadow-indigo-950/50 rounded-2xl backdrop-blur-md p-8 md:p-10 transition-all duration-300 hover:border-indigo-800/40 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]">
                    <button
                      onClick={exitMission}
                      className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-indigo-400/60 transition-colors hover:bg-indigo-950/50 hover:text-indigo-200"
                      aria-label="Close"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                      <ChallengeResultsScreen
                        missionTitle={mission.title}
                        onContinue={handleMissionContinue}
                        onReview={
                          challengeResults.questionCount -
                            challengeResults.finalScore >
                          0
                            ? () => handleMissionAction("review_mistakes")
                            : undefined
                        }
                        results={challengeResults}
                      />
                    </div>
                  </div>
                )}

              {(messages.length > 0 || isLoading) && (
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
                  <Messages
                    addToolApprovalResponse={addToolApprovalResponse}
                    chatId={chatId}
                    isArtifactVisible={isArtifactVisible}
                    isLoading={isLoading}
                    isReadonly={isReadonly}
                    messages={messages}
                    onEditMessage={(msg) => {
                      const text = msg.parts
                        ?.filter((p) => p.type === "text")
                        .map((p) => p.text)
                        .join("");
                      setInput(text ?? "");
                      setEditingMessage(msg);
                    }}
                    regenerate={regenerate}
                    selectedModelId={currentModelId}
                    setMessages={setMessages}
                    status={status}
                    votes={votes}
                  />

                  <TopicSelectScreen />

                  <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-5xl gap-2 border-t-0 bg-background px-3 pb-3 md:px-6 md:pb-4">
                    {!isReadonly && phase !== "challenge" && (
                      <MultimodalInput
                        attachments={attachments}
                        chatId={chatId}
                        editingMessage={editingMessage}
                        input={input}
                        isLoading={isLoading}
                        messages={messages}
                        onCancelEdit={() => {
                          setEditingMessage(null);
                          setInput("");
                        }}
                        onModelChange={setCurrentModelId}
                        selectedModelId={currentModelId}
                        selectedVisibilityType={visibilityType}
                        sendMessage={
                          editingMessage
                            ? async () => {
                                const msg = editingMessage;
                                setEditingMessage(null);
                                await submitEditedMessage({
                                  message: msg,
                                  text: input,
                                  setMessages,
                                  regenerate,
                                });
                                setInput("");
                              }
                            : sendMessage
                        }
                        setAttachments={setAttachments}
                        setInput={setInput}
                        setMessages={setMessages}
                        status={status}
                        stop={stop}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Artifact
          addToolApprovalResponse={addToolApprovalResponse}
          attachments={attachments}
          chatId={chatId}
          input={input}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={currentModelId}
          selectedVisibilityType={visibilityType}
          sendMessage={sendMessage}
          setAttachments={setAttachments}
          setInput={setInput}
          setMessages={setMessages}
          status={status}
          stop={stop}
          votes={votes}
        />
      </div>

      <DataStreamHandler />

      {phase === "challenge" && mission && (
        <ChallengeMode
          consentState={consentState}
          missionSlug={missionSlug}
          missionTitle={mission.title}
          onComplete={handleChallengeComplete}
          onExit={exitMission}
          onHelp={() => {
            exitMission();
            sendMessage({
              role: "user",
              parts: [
                {
                  type: "text",
                  text: "I need help with this question.",
                },
              ],
            });
          }}
        />
      )}

      <AlertDialog
        onOpenChange={(o) => {
          if (!o) {
            cancelLeave();
          }
        }}
        open={leaveTopicTarget !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this topic?</AlertDialogTitle>
            <AlertDialogDescription>
              You still have challenges left — leave anyway? Your progress is
              saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>
              Keep going
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>
              Leave anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
