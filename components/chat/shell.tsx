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
import { conceptCardsForLesson } from "@/lib/ai/missions";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AchievementToast } from "./achievement-toast";
import { Artifact } from "./artifact";
import { ChallengeMode, type ChallengeResults } from "./challenge-mode";
import { ChallengeResultsScreen } from "./challenge-results";
import { ChatHeader } from "./chat-header";
import { ConceptCardSlides } from "./concept-card-slides";
import { DataStreamHandler } from "./data-stream-handler";
import { submitEditedMessage } from "./message-editor";
import { Messages } from "./messages";
import { useMission } from "./mission-orchestrator";
import { MultimodalInput } from "./multimodal-input";
import { SaraDashboard } from "./sara-dashboard";
import { TopicSelectScreen } from "./topic-select-screen";

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
    activeLessonId,
    consentState,
    recordCardSeen,
    completeCards,
    startChallengeMode,
    finishChallenge,
    exitMission,
    challengeResults,
  } = useMission();

  // Mission ids look like "missions/percentages"; archetypes key off the bare slug.
  const missionSlug = mission?.id.replace(/^missions\//, "") ?? "";

  const handleMissionContinue = useCallback(() => {
    exitMission();
  }, [exitMission]);

  const handleMissionReview = useCallback(() => {
    exitMission();
    sendMessage({
      role: "user",
      parts: [
        { type: "text", text: "I'd like to review my mistakes, please." },
      ],
    });
  }, [exitMission, sendMessage]);

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
            "flex min-w-0 flex-col bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isArtifactVisible ? "w-[40%]" : "w-full"
          )}
        >
          <AchievementToast />
          <ChatHeader
            chatId={chatId}
            isReadonly={isReadonly}
            selectedVisibilityType={visibilityType}
          />

          {messages.length === 0 && !isLoading && (
            <div className="flex-1 overflow-y-auto">
              <SaraDashboard />
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

              {phase === "cards" && mission && activeLessonId && (
                <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-background/95 pt-8 backdrop-blur-sm">
                  <div className="w-full max-w-lg px-4">
                    <div className="mb-3 text-center">
                      <span className="text-2xl">{mission.emoji}</span>
                      <h3 className="mt-1 text-lg font-bold text-foreground">
                        {mission.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Concept review
                      </p>
                    </div>
                    <ConceptCardSlides
                      cards={conceptCardsForLesson(mission, activeLessonId)}
                      onCardSeen={recordCardSeen}
                      onComplete={completeCards}
                      onHelp={() => {
                        exitMission();
                        sendMessage({
                          role: "user",
                          parts: [
                            {
                              type: "text",
                              text: "Can you explain this concept differently?",
                            },
                          ],
                        });
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CHALLENGE GATE — explicit consent before any question is fetched
                  or rendered. Reached only after the concept cards are complete. */}
              {phase === "gate" && mission && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
                  <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 text-center">
                    <span className="text-3xl">{mission.emoji}</span>
                    <h3 className="mt-2 text-lg font-bold text-foreground">
                      Ready for Challenge Mode?
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You've reviewed the concepts. Try {mission.title} with 5
                      adaptive questions — or keep learning first.
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                      <Button
                        className="rounded-full bg-[image:var(--gradient-sunset)] px-6 font-semibold text-white shadow-lg"
                        onClick={startChallengeMode}
                        size="sm"
                      >
                        Start Challenge Mode
                      </Button>
                      <Button
                        className="rounded-full"
                        onClick={exitMission}
                        size="sm"
                        variant="ghost"
                      >
                        Keep Learning
                      </Button>
                      <Button
                        className="rounded-full"
                        onClick={() => {
                          exitMission();
                          sendMessage({
                            role: "user",
                            parts: [
                              {
                                type: "text",
                                text: "Can you explain this concept differently?",
                              },
                            ],
                          });
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Explain Differently
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {phase === "results" && challengeResults && mission && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                  <ChallengeResultsScreen
                    missionTitle={mission.title}
                    onContinue={handleMissionContinue}
                    onReview={
                      challengeResults.questionCount -
                        challengeResults.finalScore >
                      0
                        ? handleMissionReview
                        : undefined
                    }
                    results={challengeResults}
                  />
                </div>
              )}

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
          onComplete={(results: ChallengeResults) => finishChallenge(results)}
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
