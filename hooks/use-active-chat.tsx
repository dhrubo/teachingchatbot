"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname } from "next/navigation";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useDataStream } from "@/components/chat/data-stream-provider";
import { getChatHistoryPaginationKey } from "@/components/chat/sidebar-history";
import { toast } from "@/components/chat/toast";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { useAutoResume } from "@/hooks/use-auto-resume";
import {
  type ActiveQuestion,
  countAnsweredQuestions,
  getActiveQuestion,
  isAnswerCorrect,
  isGraded,
} from "@/lib/active-question";
import type { ChallengeBundle } from "@/lib/ai/challenge-bundle";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { Vote } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { playSound } from "@/lib/sounds";
import {
  deriveTopicState,
  deriveTopicThreads,
  isGateOptions,
  summariseTopics,
  type TopicPhase,
  type TopicSummary,
  topicSlug,
} from "@/lib/topic-threads";
import type { ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";

type ActiveChatContextValue = {
  chatId: string;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  visibilityType: VisibilityType;
  isReadonly: boolean;
  isLoading: boolean;
  votes: Vote[] | undefined;
  currentModelId: string;
  setCurrentModelId: (id: string) => void;
  showCreditCardAlert: boolean;
  setShowCreditCardAlert: Dispatch<SetStateAction<boolean>>;
  activeQuestion: ActiveQuestion | null;
  submitAnswer: (answer: string) => void;
  answeredCount: number;
  topicProgress: { topic: string; score: number } | null;
  xpStreak: { xp: number; streak: number; badges: string[] } | null;
  achievement: {
    label: string;
    kind: "badge" | "level" | "streak";
    at: number;
  } | null;
  clearAchievement: () => void;
  topicList: string[];
  completedTopics: string[];
  // ---- Topic threads ----
  topics: TopicSummary[];
  selectedTopicId: string | null;
  selectTopic: (topicId: string | null) => void;
  topicEntry: { topicId: string; title: string } | null;
  startTopic: (topicId: string) => void;
  dismissTopicEntry: (openMenu?: boolean) => void;
  topicsMenuOpen: boolean;
  setTopicsMenuOpen: Dispatch<SetStateAction<boolean>>;
  visibleMessages: ChatMessage[];
  resumeTopic: (topicId: string) => void;
  pickTopic: (title: string) => void;
  activeChallenge: ActiveQuestion | null;
  requestLeave: (targetId: string | null) => void;
  leaveTopicTarget: string | null;
  confirmLeave: () => void;
  cancelLeave: () => void;
  requestHarderChallenge: () => void;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

// Tools whose output is actually shown to the student (askQuestion renders a
// challenge card). Other tools (updateStudentProfile, manageGoals,
// startNewTopicSession, getCurriculumTopics) persist data or steer state but
// render NOTHING in the thread — a turn made up only of those is invisible to
// the student, which looks like "nothing happened / old explanations remain".
const VISIBLE_TOOL_TYPES = new Set([
  "tool-askQuestion",
]);

// True if a message has something the STUDENT can see: non-empty text or a
// visible tool call with output. Silent persistence tools don't count, so a
// tool-only-silent turn is treated as content-less and triggers the retry.
function hasRenderableContent(message: ChatMessage): boolean {
  return (message.parts ?? []).some((part) => {
    if (part.type === "text") {
      return (part.text ?? "").trim().length > 0;
    }
    if (VISIBLE_TOOL_TYPES.has(part.type)) {
      return (part as { output?: unknown }).output !== undefined;
    }
    return false;
  });
}

function extractChatId(pathname: string): string | null {
  const match = pathname.match(/\/chat\/([^/]+)/);
  return match ? match[1] : null;
}

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  // Latest saved topic progress (0–5), surfaced for the progress UI.
  const [topicProgress, setTopicProgress] = useState<{
    topic: string;
    score: number;
  } | null>(null);

  // Live XP / streak / badges, and the latest earned achievement (for a toast).
  const [xpStreak, setXpStreak] = useState<{
    xp: number;
    streak: number;
    badges: string[];
  } | null>(null);
  const [achievement, setAchievement] = useState<{
    label: string;
    kind: "badge" | "level" | "streak";
    at: number;
  } | null>(null);

  // Pinned list of topics the user pasted (from chunking), and which have
  // been worked on, so the panel can tick them off.
  const [topicList, setTopicList] = useState<string[]>([]);
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);



  // ---- Topic threads (per-topic sub-conversations within one chat) ----
  // The currently open topic thread (null = show the whole chat / intro).
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  // When a topic is freshly started, the full-screen start gate payload.
  const [topicEntry, setTopicEntry] = useState<{
    topicId: string;
    title: string;
  } | null>(null);
  // Whether the "Your topics" sheet is open. Lifted here so the start-gate
  // overlay can offer "choose a different topic" by opening it directly.
  const [topicsMenuOpen, setTopicsMenuOpen] = useState(false);
  // Soft close-lock: the topic the student is trying to leave, pending confirm.
  const [leaveTopicTarget, setLeaveTopicTarget] = useState<string | null>(null);
  // A topic-start whose full-screen gate is held until the turn finishes — so a
  // clarifying question in the same turn isn't buried behind the overlay.
  const pendingTopicEntryRef = useRef<{
    topicId: string;
    title: string;
  } | null>(null);
  // The message id we last auto-sent for, to stop sendAutomaticallyWhen from
  // re-firing in a loop when the triggering message stays at the end.
  const autoSentForRef = useRef<string | null>(null);

  const chatIdFromUrl = extractChatId(pathname);
  const isNewChat = !chatIdFromUrl;
  const newChatIdRef = useRef(generateUUID());
  const prevPathnameRef = useRef(pathname);

  if (isNewChat && prevPathnameRef.current !== pathname) {
    newChatIdRef.current = generateUUID();
  }
  prevPathnameRef.current = pathname;

  const chatId = chatIdFromUrl ?? newChatIdRef.current;

  const [currentModelId, setCurrentModelId] = useState(DEFAULT_CHAT_MODEL);
  const currentModelIdRef = useRef(currentModelId);
  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const [input, setInput] = useState("");
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);

  // Auto-retry bookkeeping for content-less assistant turns. regenerateRef is
  // filled in after useChat returns (regenerate isn't available inside config).
  // NOTE: this is a boolean, not a Set keyed on message.id — because
  // regenerate() creates a NEW assistant message each time with a different
  // id, a per-id guard would never fire and allow infinite retries.
  const retriedEmptyRef = useRef(false);
  const regenerateRef = useRef<(() => void) | null>(null);

  const { data: chatData, isLoading } = useSWR(
    isNewChat
      ? null
      : `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages?chatId=${chatId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const initialMessages: ChatMessage[] = isNewChat
    ? []
    : (chatData?.messages ?? []);
  const visibility: VisibilityType = isNewChat
    ? "private"
    : (chatData?.visibility ?? "private");

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id: chatId,
    messages: initialMessages,
    generateId: generateUUID,
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      const shouldSend =
        lastMessage?.parts?.some(
          (part) =>
            part != null &&
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true
        ) ?? false;
      // Guard against an auto-send loop: if the triggering message stays at the
      // end (e.g. the follow-up request failed auth / produced no output), the
      // predicate would keep returning true and POST /api/chat forever. Fire at
      // most once per message id.
      if (!shouldSend || !lastMessage) {
        return false;
      }
      if (autoSentForRef.current === lastMessage.id) {
        return false;
      }
      autoSentForRef.current = lastMessage.id;
      return true;
    },
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat`,
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        const isToolApprovalContinuation =
          lastMessage?.role !== "user" ||
          request.messages.some((msg) =>
            msg.parts?.some((part) => {
              if (part == null) return false;
              const state = (part as { state?: string }).state;
              return (
                state === "approval-responded" || state === "output-denied"
              );
            })
          );

        return {
          body: {
            id: request.id,
            ...(isToolApprovalContinuation
              ? { messages: request.messages }
              : { message: lastMessage }),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibility,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === "data-new-topic-session") {
        const d = dataPart.data as { topic?: string; topicId?: string };
        if (d?.topic && d?.topicId) {
          // Select the new topic thread now, but DON'T open the full-screen
          // start gate yet — hold it until the turn finishes. If the same turn
          // also poses a clarifying / choice question, opening the overlay would
          // bury the answer panel behind it and leave the student stuck. The
          // decision is made in onFinish once the full message is known.
          setSelectedTopicId(d.topicId);
          pendingTopicEntryRef.current = { topicId: d.topicId, title: d.topic };
        }
      }
      if (dataPart.type === "data-topic-progress") {
        const d = dataPart.data as { topic?: string; score?: number };
        if (d?.topic && typeof d.score === "number") {
          setTopicProgress({ topic: d.topic, score: d.score });
          // Tick a pinned topic off once it's been worked on.
          const t = d.topic;
          setCompletedTopics((prev) =>
            prev.includes(t) ? prev : [...prev, t]
          );
        }
      }
      if (dataPart.type === "data-topic-list") {
        const d = dataPart.data as { topics?: string[] };
        if (d?.topics?.length) {
          setTopicList(d.topics);
        }
      }
      if (dataPart.type === "data-xp-streak") {
        const d = dataPart.data as {
          xp?: number;
          streak?: number;
          badges?: string[];
        };
        setXpStreak({
          xp: d.xp ?? 0,
          streak: d.streak ?? 0,
          badges: d.badges ?? [],
        });
      }
      if (dataPart.type === "data-achievement") {
        const d = dataPart.data as {
          label?: string;
          kind?: "badge" | "level" | "streak";
        };
        if (d?.label) {
          setAchievement({
            label: d.label,
            kind: d.kind ?? "badge",
            at: Date.now(),
          });
        }
      }
    },
    onFinish: ({ message }) => {
      playSound("receive");
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      // Resolve a held topic-start gate. Only open the full-screen overlay if
      // the turn didn't also pose an open question — otherwise the answer panel
      // would be trapped behind the overlay and the student couldn't respond.
      const pending = pendingTopicEntryRef.current;
      if (pending) {
        pendingTopicEntryRef.current = null;
        // "Poses something to answer" = an open askQuestion OR an emitted
        // challenge bundle. Either means the answer panel / readiness gate must
        // be visible, so we must NOT open the full-screen topic overlay on top
        // of it (that buries the controls and the student is stuck).
        const posesQuestion =
          message.role === "assistant" && getActiveQuestion([message]) !== null;
        if (!posesQuestion) {
          setTopicEntry(pending);
        }
      }
      // A content-less assistant turn (model streamed only step markers and
      // stopped) leaves the student stuck. Auto-retry once; if it's still
      // empty, surface a friendly nudge instead of a silent blank bubble.
      if (message.role === "assistant" && !hasRenderableContent(message)) {
        if (retriedEmptyRef.current) {
          toast({
            type: "error",
            description: "Hmm, that didn't come through — tap the topic again?",
          });
        } else {
          retriedEmptyRef.current = true;
          // Defer so we're not regenerating inside the finishing stream's
          // callback.
          setTimeout(() => regenerateRef.current?.(), 50);
        }
      }
    },
    onError: (error) => {
      if (error.message?.includes("AI Gateway requires a valid credit card")) {
        setShowCreditCardAlert(true);
      } else if (error instanceof ChatbotError) {
        toast({ type: "error", description: error.message });
      } else {
        toast({
          type: "error",
          description: error.message || "Oops, an error occurred!",
        });
      }
    },
  });

  // Expose regenerate to the onFinish empty-turn auto-retry above.
  regenerateRef.current = () => regenerate();

  const loadedChatIds = useRef(new Set<string>());

  if (isNewChat && !loadedChatIds.current.has(newChatIdRef.current)) {
    loadedChatIds.current.add(newChatIdRef.current);
  }

  useEffect(() => {
    if (loadedChatIds.current.has(chatId)) {
      return;
    }
    if (chatData?.messages) {
      loadedChatIds.current.add(chatId);
      setMessages(chatData.messages);
    }
  }, [chatId, chatData?.messages, setMessages]);

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      if (isNewChat) {
        setMessages([]);
      }
    }
  }, [chatId, isNewChat, setMessages]);

  useEffect(() => {
    if (chatData && !isNewChat) {
      const cookieModel = document.cookie
        .split("; ")
        .find((row) => row.startsWith("chat-model="))
        ?.split("=")[1];
      if (cookieModel) {
        setCurrentModelId(decodeURIComponent(cookieModel));
      }
    }
  }, [chatData, isNewChat]);

  const hasAppendedQueryRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query");
    if (query && !hasAppendedQueryRef.current) {
      hasAppendedQueryRef.current = true;
      window.history.replaceState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });
    }
  }, [sendMessage, chatId]);

  useAutoResume({
    autoResume: !isNewChat && !!chatData,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const activeQuestion = useMemo(() => getActiveQuestion(messages), [messages]);
  const answeredCount = useMemo(
    () => countAnsweredQuestions(messages),
    [messages]
  );

  // ---- Derived topic-thread state ----
  const { threads, introEndIndex } = useMemo(
    () => deriveTopicThreads(messages),
    [messages]
  );

  const topics = useMemo<TopicSummary[]>(
    () => summariseTopics(messages),
    [messages]
  );

  // Auto-select the most recent topic if nothing is chosen yet and the chat
  // has topics (e.g. after reload). Never overrides an explicit selection.
  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedTopicId) ?? null,
    [threads, selectedTopicId]
  );

  const topicState = useMemo(
    () => (selectedThread ? deriveTopicState(selectedThread) : null),
    [selectedThread]
  );

  const activeChallenge = useMemo(() => {
    if (!selectedThread) return null;
    const q = getActiveQuestion(selectedThread.messages);
    if (!q || isGateOptions(q.options)) return null;
    return q;
  }, [selectedThread]);

  const submitAnswer = useCallback(
    (answer: string) => {
      const q = activeChallenge ?? activeQuestion;
      if (!q) {
        return;
      }

      // If the answer already contains a CORRECT/INCORRECT directive block
      // (e.g. from answer-panel's "Explain differently 🔄" handler), pass it
      // through as-is — the student asked for reteaching, so we call the LLM.
      if (/\[(CORRECT|INCORRECT)/.test(answer)) {
        sendMessage({
          role: "user",
          parts: [{ type: "text", text: answer }],
        });
        return;
      }

      // Non-graded prompt (name, topic choice…) — send plainly to the LLM.
      if (!isGraded(q as ActiveQuestion)) {
        sendMessage({
          role: "user",
          parts: [{ type: "text", text: answer }],
        });
        return;
      }

      // Graded question (no bundle) — tell the tutor the result.
      const text = `My answer: ${answer}\n\n[${
        isAnswerCorrect(q as ActiveQuestion, answer) ? "CORRECT" : "INCORRECT"
      } — the right answer is ${(q as ActiveQuestion).correctAnswer}. Confirm briefly and continue with the next tiny step.]`;
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: text }],
      });
    },
    [activeChallenge, activeQuestion, sendMessage]
  );

  const requestHarderChallenge = useCallback(() => {
    sendMessage({
      role: "user",
      parts: [
        {
          type: "text",
          text: `I got every challenge right - give me harder questions on the same topic to really challenge me.`,
        },
      ],
    });
  }, [sendMessage]);

  const clearAchievement = useCallback(() => setAchievement(null), []);

  // Messages shown in the thread view: the selected topic's slice, or — when
  // no topic is selected — the intro messages plus everything (back-compat for
  // old chats with no markers).
  const visibleMessages = useMemo(() => {
    // Build the list, then ALWAYS dedupe by id. Duplicates can arrive two ways:
    //   - the intro slice and a selected thread's slice overlapping; and
    //   - `messages` itself briefly holding the same id twice during the
    //     new-chat → /chat/{id} transition (streamed state + the SWR
    //     /api/messages refetch), amplified by React Strict Mode.
    // React keys must be unique or messages render twice / vanish, so we dedupe
    // both branches at the render boundary.
    const combined = selectedThread
      ? messages.slice(0, introEndIndex).concat(selectedThread.messages)
      : messages;
    const seen = new Set<string>();
    const deduped = combined.filter((m) => {
      if (seen.has(m.id)) {
        return false;
      }
      seen.add(m.id);
      return true;
    });
    // Preserve referential identity when nothing was removed, so downstream
    // memoised consumers don't re-render needlessly.
    return deduped.length === combined.length ? combined : deduped;
  }, [messages, selectedThread, introEndIndex]);



  // ---- Topic-thread actions ----
  const selectTopic = useCallback((topicId: string | null) => {
    setSelectedTopicId(topicId);
  }, []);

  const startTopic = useCallback((topicId: string) => {
    // Dismiss the full-screen start gate; the thread is already selected.
    setTopicEntry((cur) => (cur?.topicId === topicId ? null : cur));
    setSelectedTopicId(topicId);
  }, []);

  // Close the start gate without committing to the topic, leaving the just-
  // taught topic still selectable from "Your topics". Optionally open the
  // topics sheet so the student can pick a different one straight away.
  const dismissTopicEntry = useCallback((openMenu = false) => {
    setTopicEntry(null);
    if (openMenu) {
      setTopicsMenuOpen(true);
    }
  }, []);

  // Reopen a completed topic and reattach follow-ups to it by re-emitting a
  // marker via the tutor (explicit resume signal).
  const resumeTopic = useCallback(
    (topicId: string) => {
      const thread = threads.find((t) => t.id === topicId);
      setSelectedTopicId(topicId);
      if (thread) {
        sendMessage({
          role: "user",
          parts: [{ type: "text", text: `Let's go back to ${thread.title}.` }],
        });
      }
    },
    [sendMessage, threads]
  );

  // Start a topic from the pasted list that hasn't become a session yet. The
  // tutor responds by calling startNewTopicSession, which emits the marker
  // that turns it into a real thread. If a thread for it already exists, just
  // select that instead of asking the tutor to start it again.
  const pickTopic = useCallback(
    (title: string) => {
      const existing = threads.find((t) => t.id === topicSlug(title));
      if (existing) {
        setSelectedTopicId(existing.id);
        return;
      }
      // Select the topic locally NOW so the full-screen TopicSelectScreen
      // hides immediately (its `show` gate is `!selectedTopicId`). Previously
      // this waited for the tutor to call startNewTopicSession and emit
      // data-new-topic-session; if the model instead asked a clarifying
      // question (or did nothing), the select screen stayed up forever and the
      // student "couldn't select anything". The marker the tutor emits later
      // still drives the persisted thread; this just makes the UI deterministic.
      setSelectedTopicId(topicSlug(title));
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: `Let's start with ${title}.` }],
      });
    },
    [sendMessage, threads]
  );

  // Soft close-lock entry point: leaving/switching with outstanding
  // challenges asks for confirmation first.
  const requestLeave = useCallback(
    (targetId: string | null) => {
      setSelectedTopicId(targetId);
    },
    []
  );

  const confirmLeave = useCallback(() => {
    setLeaveTopicTarget((target) => {
      setSelectedTopicId(target === "__none__" ? null : target);
      return null;
    });
  }, []);

  const cancelLeave = useCallback(() => setLeaveTopicTarget(null), []);

  const isReadonly = isNewChat ? false : (chatData?.isReadonly ?? false);

  const { data: votes } = useSWR<Vote[]>(
    !isReadonly && messages.length >= 2
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const value = useMemo<ActiveChatContextValue>(
    () => ({
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
      visibilityType: visibility,
      isReadonly,
      isLoading: !isNewChat && isLoading,
      votes,
      currentModelId,
      setCurrentModelId,
      showCreditCardAlert,
      setShowCreditCardAlert,
      activeQuestion,
      submitAnswer,
      answeredCount,
      topicProgress,
      xpStreak,
      achievement,
      clearAchievement,
      topicList,
      completedTopics,
      topics,
      selectedTopicId,
      selectTopic,
      topicEntry,
      startTopic,
      dismissTopicEntry,
      topicsMenuOpen,
      setTopicsMenuOpen,
      visibleMessages,
      resumeTopic,
      pickTopic,
      activeChallenge,
      requestLeave,
      leaveTopicTarget,
      confirmLeave,
      cancelLeave,
      requestHarderChallenge,
    }),
    [
      chatId,
      messages,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
      input,
      visibility,
      isReadonly,
      isNewChat,
      isLoading,
      votes,
      currentModelId,
      showCreditCardAlert,
      activeQuestion,
      submitAnswer,
      answeredCount,
      topicProgress,
      xpStreak,
      achievement,
      clearAchievement,
      topicList,
      completedTopics,
      topics,
      selectedTopicId,
      selectTopic,
      topicEntry,
      startTopic,
      dismissTopicEntry,
      topicsMenuOpen,
      visibleMessages,
      resumeTopic,
      pickTopic,
      activeChallenge,
      requestLeave,
      leaveTopicTarget,
      confirmLeave,
      cancelLeave,
      requestHarderChallenge,
    ]
  );

  return (
    <ActiveChatContext.Provider value={value}>
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext);
  if (!context) {
    throw new Error("useActiveChat must be used within ActiveChatProvider");
  }
  return context;
}
