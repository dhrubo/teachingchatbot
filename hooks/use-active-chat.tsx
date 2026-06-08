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
  topicPhase: TopicPhase;
  visibleMessages: ChatMessage[];
  resumeTopic: (topicId: string) => void;
  pickTopic: (title: string) => void;
  activeChallenge: ActiveQuestion | null;
  challengeIndex: number;
  challengeCount: number;
  hasIncompleteChallenges: (topicId: string | null) => boolean;
  requestLeave: (targetId: string | null) => void;
  leaveTopicTarget: string | null;
  confirmLeave: () => void;
  cancelLeave: () => void;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

// True if a message has something to show: non-empty text or a tool call with
// output. Used to detect failed (content-less) assistant turns.
function hasRenderableContent(message: ChatMessage): boolean {
  return (message.parts ?? []).some((part) => {
    if (part.type === "text") {
      return (part.text ?? "").trim().length > 0;
    }
    if (part.type.startsWith("tool-")) {
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
  const retriedEmptyRef = useRef<Set<string>>(new Set());
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
      return (
        lastMessage?.parts?.some(
          (part) =>
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true
        ) ?? false
      );
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
          // Select the new topic thread and open its full-screen start gate.
          // No navigation — the thread lives inside the current chat.
          setSelectedTopicId(d.topicId);
          setTopicEntry({ topicId: d.topicId, title: d.topic });
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
      // A content-less assistant turn (model streamed only step markers and
      // stopped) leaves the student stuck. Auto-retry once; if it's still
      // empty, surface a friendly nudge instead of a silent blank bubble.
      if (message.role === "assistant" && !hasRenderableContent(message)) {
        if (retriedEmptyRef.current.has(message.id)) {
          toast({
            type: "error",
            description: "Hmm, that didn't come through — tap the topic again?",
          });
        } else {
          retriedEmptyRef.current.add(message.id);
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

  const submitAnswer = useCallback(
    (answer: string) => {
      if (!activeQuestion) {
        return;
      }
      // Graded quiz question → tell the tutor the result so it can react.
      // Non-graded prompt (name, topic choice…) → just send the answer plainly.
      const text = isGraded(activeQuestion)
        ? `My answer: ${answer}\n\n[${
            isAnswerCorrect(activeQuestion, answer) ? "CORRECT" : "INCORRECT"
          } — the right answer is ${activeQuestion.correctAnswer}. Confirm briefly and continue with the next tiny step.]`
        : answer;
      sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    },
    [activeQuestion, sendMessage]
  );

  const clearAchievement = useCallback(() => setAchievement(null), []);

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
  const topicPhase: TopicPhase = topicState?.phase ?? "content";

  // Messages shown in the thread view: the selected topic's slice, or — when
  // no topic is selected — the intro messages plus everything (back-compat for
  // old chats with no markers).
  const visibleMessages = useMemo(() => {
    if (!selectedThread) {
      return messages;
    }
    return messages.slice(0, introEndIndex).concat(selectedThread.messages);
  }, [messages, selectedThread, introEndIndex]);

  // The open question in the selected thread that the student should answer in
  // the form — any open askQuestion that ISN'T a control gate (Accept / recovery
  // are rendered as buttons instead). Covers both graded challenges and the
  // tutor's non-graded mid-lesson questions.
  const activeChallenge = useMemo(() => {
    if (!selectedThread) {
      return null;
    }
    const q = getActiveQuestion(selectedThread.messages);
    if (!q || isGateOptions(q.options)) {
      return null;
    }
    return q;
  }, [selectedThread]);

  const challengeCount = topicState?.challengeTotal ?? 0;
  const challengeIndex = topicState?.challengeDone ?? 0;

  const hasIncompleteChallenges = useCallback(
    (topicId: string | null): boolean => {
      if (!topicId) {
        return false;
      }
      const thread = threads.find((t) => t.id === topicId);
      if (!thread) {
        return false;
      }
      const { challengeTotal, challengeDone, phase } = deriveTopicState(thread);
      // Outstanding if there's an open challenge or banked-but-unfinished work.
      return phase === "challenge" || challengeDone < challengeTotal;
    },
    [threads]
  );

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
      if (hasIncompleteChallenges(selectedTopicId)) {
        setLeaveTopicTarget(targetId ?? "__none__");
      } else {
        setSelectedTopicId(targetId);
      }
    },
    [hasIncompleteChallenges, selectedTopicId]
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
      topicPhase,
      visibleMessages,
      resumeTopic,
      pickTopic,
      activeChallenge,
      challengeIndex,
      challengeCount,
      hasIncompleteChallenges,
      requestLeave,
      leaveTopicTarget,
      confirmLeave,
      cancelLeave,
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
      topicPhase,
      visibleMessages,
      resumeTopic,
      pickTopic,
      activeChallenge,
      challengeIndex,
      challengeCount,
      hasIncompleteChallenges,
      requestLeave,
      leaveTopicTarget,
      confirmLeave,
      cancelLeave,
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
