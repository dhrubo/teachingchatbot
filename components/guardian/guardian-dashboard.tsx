"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Copy,
  Eye,
  Flame,
  Link2,
  Mail,
  ShieldCheck,
  UserPlus,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopNavBar } from "@/components/ranedeer/top-nav-bar";
import { getTopicBySlug } from "@/lib/curriculum/edexcel-1ma1";
import type { AccountRole, EdexcelTier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export type SerializedWatchedKid = {
  learnerId: string;
  nickname: string;
  tier: EdexcelTier;
  targetGrade: number;
  currentStreak: number;
  totalXp: number;
  studentUsername: string;
  watcherCode: string | null;
  relationship: string;
  topicsStudiedCount: number;
  averageMastery: number;
  recentQuizzes: Array<{
    id: string;
    topicSlug: string;
    status: "in_progress" | "completed";
    scorePercent: number;
    correctCount: number;
    totalQuestions: number;
    tabSwitchCount: number;
    pasteCount: number;
    rapidGuessCount: number;
    hintsUsed: number;
    integrityFlags: string[];
    startedAtIso: string;
  }>;
};

type GuardianDashboardProps = {
  navLearner: {
    nickname: string;
    tier: EdexcelTier;
    targetGrade: number;
    currentStreak: number;
    reminderEnabled: boolean;
  };
  sessionInfo: {
    role: AccountRole;
    displayName: string;
    username: string;
    watcherCode: string | null;
    invitedParentEmail: string | null;
  } | null;
  initialWatchedKids: SerializedWatchedKid[];
  activeLearnerId: string;
};

export function GuardianDashboard({
  navLearner,
  sessionInfo,
  initialWatchedKids,
  activeLearnerId,
}: GuardianDashboardProps) {
  const router = useRouter();
  const [kids, setKids] = useState<SerializedWatchedKid[]>(initialWatchedKids);
  const [currentActiveId, setCurrentActiveId] = useState(activeLearnerId);

  // Create kid form state
  const [kidName, setKidName] = useState("");
  const [kidUsername, setKidUsername] = useState("");
  const [kidPin, setKidPin] = useState("");
  const [kidTier, setKidTier] = useState<EdexcelTier>("foundation");
  const [kidGrade, setKidGrade] = useState(5);
  const [creatingKid, setCreatingKid] = useState(false);
  const [kidNotice, setKidNotice] = useState<string | null>(null);
  const [kidError, setKidError] = useState<string | null>(null);

  // Watcher code link state
  const [codeInput, setCodeInput] = useState("");
  const [linkingCode, setLinkingCode] = useState(false);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Student invite parent email state
  const [parentEmailInput, setParentEmailInput] = useState(
    sessionInfo?.invitedParentEmail ?? ""
  );
  const [invitingParent, setInvitingParent] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const refreshKidsFromServer = async () => {
    const res = await fetch("/api/guardian/kids");
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as {
      kids: Array<{
        learner: {
          id: string;
          nickname: string;
          tier: EdexcelTier;
          targetGrade: number;
          currentStreak: number;
          totalXp: number;
        };
        studentUsername: string;
        watcherCode: string | null;
        relationship: string;
        topicsStudiedCount: number;
        averageMastery: number;
        recentQuizzes: Array<{
          id: string;
          topicSlug: string;
          status: "in_progress" | "completed";
          scorePercent: number;
          correctCount: number;
          totalQuestions: number;
          tabSwitchCount: number;
          pasteCount: number;
          rapidGuessCount: number;
          hintsUsed: number;
          integrityFlags: string[];
          startedAt: string;
        }>;
      }>;
      activeLearnerId: string;
    };

    setCurrentActiveId(data.activeLearnerId);
    setKids(
      data.kids.map((k) => ({
        learnerId: k.learner.id,
        nickname: k.learner.nickname,
        tier: k.learner.tier,
        targetGrade: k.learner.targetGrade,
        currentStreak: k.learner.currentStreak,
        totalXp: k.learner.totalXp,
        studentUsername: k.studentUsername,
        watcherCode: k.watcherCode,
        relationship: k.relationship,
        topicsStudiedCount: k.topicsStudiedCount,
        averageMastery: k.averageMastery,
        recentQuizzes: k.recentQuizzes.map((q) => ({
          ...q,
          startedAtIso: q.startedAt,
        })),
      }))
    );
  };

  const handleCreateKid = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingKid(true);
    setKidNotice(null);
    setKidError(null);
    try {
      const res = await fetch("/api/guardian/kids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: kidName,
          username: kidUsername,
          pin: kidPin,
          tier: kidTier,
          targetGrade: kidGrade,
        }),
      });
      const data = (await res.json()) as {
        kid?: { studentUsername: string };
        cause?: string;
        message?: string;
      };
      if (!res.ok || !data.kid) {
        setKidError(data.cause || data.message || "Could not create profile.");
        return;
      }

      setKidNotice(
        `Created profile for ${kidName}! They can sign in on the Kid PIN tab using username "${data.kid.studentUsername}" and PIN ${kidPin}.`
      );
      setKidName("");
      setKidUsername("");
      setKidPin("");
      await refreshKidsFromServer();
      router.refresh();
    } finally {
      setCreatingKid(false);
    }
  };

  const handleLinkWatcherCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkingCode(true);
    setLinkNotice(null);
    setLinkError(null);
    try {
      const res = await fetch("/api/guardian/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "watcher_code",
          watcherCode: codeInput,
        }),
      });
      const data = (await res.json()) as {
        linked?: boolean;
        learnerNickname?: string;
        cause?: string;
        message?: string;
      };
      if (!res.ok || !data.linked) {
        setLinkError(data.cause || data.message || "Invalid Watcher Code.");
        return;
      }
      setLinkNotice(
        `Linked to ${data.learnerNickname}! You can now view their topics, streaks, and No-Cheat Quiz logs below.`
      );
      setCodeInput("");
      await refreshKidsFromServer();
    } finally {
      setLinkingCode(false);
    }
  };

  const handleSwitchLearner = async (learnerId: string) => {
    const res = await fetch("/api/guardian/switch-learner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId }),
    });
    if (res.ok) {
      setCurrentActiveId(learnerId);
      router.push("/");
      router.refresh();
    }
  };

  const handleStudentInviteParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvitingParent(true);
    setInviteNotice(null);
    try {
      const res = await fetch("/api/guardian/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "invite_parent_email",
          parentEmail: parentEmailInput,
        }),
      });
      const data = (await res.json()) as {
        linkedImmediately?: boolean;
        invitedParentEmail?: string;
        cause?: string;
        message?: string;
      };
      if (!res.ok) {
        setInviteNotice(data.cause || data.message || "Could not save email.");
        return;
      }
      setInviteNotice(
        data.linkedImmediately
          ? `Linked immediately to ${data.invitedParentEmail}! They can now view your progress on their Watcher Hub.`
          : `Saved ${data.invitedParentEmail}! As soon as your parent or guardian creates an account with that email, you will be linked automatically.`
      );
    } finally {
      setInvitingParent(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <TopNavBar
        currentStreak={navLearner.currentStreak}
        nickname={navLearner.nickname}
        reminderEnabled={navLearner.reminderEnabled}
        targetGrade={navLearner.targetGrade}
        tier={navLearner.tier}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6">
        <div>
          <Link
            className="inline-flex items-center gap-1.5 text-slate-400 text-xs hover:text-orange-300"
            href="/"
          >
            <ArrowLeft className="size-3.5" />
            Back to Topics
          </Link>
          <h1 className="mt-1 font-extrabold text-2xl text-white sm:text-3xl">
            Parent &amp; Guardian Watcher Hub
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            Create kid profiles with 4-digit PINs, link student-created profiles
            with a 6-digit Watcher Code, and review No-Cheat Quiz integrity.
          </p>
        </div>

        {/* Case 1: Signed out */}
        {sessionInfo ? null : (
          <section className="glass-panel space-y-4 rounded-2xl p-6">
            <h2 className="font-bold text-lg text-white">
              How Parent &amp; Student Profiles Work
            </h2>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>
                • <strong>Parents / Guardians:</strong> Create a Watcher account
                to set up kid profiles (with a 4-digit PIN) or link to your
                child&apos;s existing profile via their 6-digit Watcher Code.
              </li>
              <li>
                • <strong>Students / Kids:</strong> Sign up directly to get your
                own 6-digit Watcher Code (and optionally invite a parent&apos;s
                email as your Watcher).
              </li>
            </ul>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2.5 font-bold text-white text-xs shadow-md transition hover:brightness-110"
                href="/login?tab=register-parent"
              >
                <Eye className="size-4" />
                Create Parent Watcher Account
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-4 py-2.5 font-bold text-white text-xs shadow-md transition hover:brightness-110"
                href="/login?tab=register-student"
              >
                <UserPlus className="size-4" />
                Create Student Profile
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-semibold text-slate-200 text-xs transition hover:bg-white/10"
                href="/login"
              >
                Sign In to Existing Account
              </Link>
            </div>
          </section>
        )}

        {/* Case 2: Student signed in -> show their 6-digit Watcher Code + Parent Email Invite */}
        {sessionInfo?.role === "student" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <section className="glass-panel space-y-4 rounded-2xl p-6">
              <div className="flex items-center gap-2 font-bold text-cyan-200 text-sm">
                <Eye className="size-4 text-cyan-400" />
                Your 6-Digit Parent / Guardian Watcher Code
              </div>
              <p className="text-slate-300 text-xs">
                Give this code to your parent or guardian. When they enter it in
                their Watcher Hub, they can see your streaks, topics mastered,
                and Clean Effort quiz badges.
              </p>
              <div className="flex items-center justify-between rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-5 py-4">
                <span className="font-extrabold font-mono text-3xl text-cyan-100 tracking-widest">
                  {sessionInfo.watcherCode ?? "------"}
                </span>
                {sessionInfo.watcherCode ? (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 font-semibold text-white text-xs transition hover:bg-white/20"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        sessionInfo.watcherCode ?? ""
                      );
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    type="button"
                  >
                    <Copy className="size-3.5" />
                    {copiedCode ? "Copied!" : "Copy"}
                  </button>
                ) : null}
              </div>
            </section>

            <section className="glass-panel space-y-4 rounded-2xl p-6">
              <div className="flex items-center gap-2 font-bold text-sm text-violet-200">
                <Mail className="size-4 text-violet-400" />
                Link a Parent or Guardian by Email
              </div>
              <p className="text-slate-300 text-xs">
                Enter your parent or guardian&apos;s email address to link them
                automatically as your Watcher.
              </p>
              <form className="space-y-3" onSubmit={handleStudentInviteParent}>
                <label className="sr-only" htmlFor="invite-parent-email">
                  Parent or Guardian Email
                </label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none"
                  id="invite-parent-email"
                  onChange={(e) => setParentEmailInput(e.target.value)}
                  placeholder="parent@example.com"
                  required
                  type="email"
                  value={parentEmailInput}
                />
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 font-bold text-white text-xs transition hover:brightness-110 disabled:opacity-50"
                  disabled={invitingParent}
                  type="submit"
                >
                  {invitingParent ? "Saving..." : "Save Parent Watcher Email"}
                </button>
              </form>
              {inviteNotice ? (
                <p className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-emerald-100 text-xs">
                  {inviteNotice}
                </p>
              ) : null}
            </section>
          </div>
        ) : null}

        {/* Case 3: Parent / Guardian signed in -> Create Kid + Link Code + Watched Kids Analytics */}
        {sessionInfo?.role === "parent" ? (
          <>
            <div className="grid gap-5 lg:grid-cols-12">
              {/* Create Kid Profile Card */}
              <section className="glass-panel space-y-4 rounded-2xl p-5 lg:col-span-7">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <UserPlus className="size-4 text-orange-400" />
                  Create a Kid Profile (4-Digit PIN Login)
                </div>

                {kidNotice ? (
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2.5 text-emerald-100 text-xs">
                    {kidNotice}
                  </div>
                ) : null}
                {kidError ? (
                  <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3.5 py-2.5 text-rose-100 text-xs">
                    {kidError}
                  </div>
                ) : null}

                <form className="space-y-3" onSubmit={handleCreateKid}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label
                        className="mb-1 block font-semibold text-slate-300 text-xs"
                        htmlFor="kid-name"
                      >
                        Child&apos;s Name
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                        id="kid-name"
                        onChange={(e) => setKidName(e.target.value)}
                        placeholder="Leo"
                        required
                        value={kidName}
                      />
                    </div>

                    <div>
                      <label
                        className="mb-1 block font-semibold text-slate-300 text-xs"
                        htmlFor="kid-username"
                      >
                        Kid Username
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                        id="kid-username"
                        onChange={(e) => setKidUsername(e.target.value)}
                        placeholder="leo_y9"
                        required
                        value={kidUsername}
                      />
                    </div>

                    <div>
                      <label
                        className="mb-1 block font-semibold text-slate-300 text-xs"
                        htmlFor="kid-pin"
                      >
                        4-Digit PIN
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2 font-mono text-sm text-white tracking-widest focus:border-orange-400 focus:outline-none"
                        id="kid-pin"
                        inputMode="numeric"
                        maxLength={4}
                        onChange={(e) =>
                          setKidPin(
                            e.target.value.replace(/\D/g, "").slice(0, 4)
                          )
                        }
                        pattern="\d{4}"
                        placeholder="1234"
                        required
                        value={kidPin}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label
                        className="mb-1 block font-semibold text-slate-300 text-xs"
                        htmlFor="kid-tier"
                      >
                        Edexcel Tier
                      </label>
                      <select
                        className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                        id="kid-tier"
                        onChange={(e) => {
                          const next = e.target.value as EdexcelTier;
                          setKidTier(next);
                          setKidGrade(next === "higher" ? 7 : 5);
                        }}
                        value={kidTier}
                      >
                        <option value="foundation">Foundation (1–5)</option>
                        <option value="higher">Higher (4–9)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        className="mb-1 block font-semibold text-slate-300 text-xs"
                        htmlFor="kid-grade"
                      >
                        Target Grade
                      </label>
                      <select
                        className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                        id="kid-grade"
                        onChange={(e) =>
                          setKidGrade(Number.parseInt(e.target.value, 10))
                        }
                        value={kidGrade}
                      >
                        {(kidTier === "foundation"
                          ? [1, 2, 3, 4, 5]
                          : [4, 5, 6, 7, 8, 9]
                        ).map((g) => (
                          <option key={g} value={g}>
                            Grade {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 px-4 py-2.5 font-bold text-white text-xs shadow-md transition hover:brightness-110 disabled:opacity-50"
                        disabled={creatingKid || kidPin.length !== 4}
                        type="submit"
                      >
                        {creatingKid ? "Creating..." : "Create Kid Profile"}
                      </button>
                    </div>
                  </div>
                </form>
              </section>

              {/* Link Existing Kid via 6-Digit Watcher Code */}
              <section className="glass-panel space-y-4 rounded-2xl p-5 lg:col-span-5">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <Link2 className="size-4 text-cyan-400" />
                  Link Kid via 6-Digit Watcher Code
                </div>
                <p className="text-slate-400 text-xs">
                  Did your child already create their own student profile? Enter
                  their 6-digit Watcher Code to monitor their progress.
                </p>

                {linkNotice ? (
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2 text-emerald-100 text-xs">
                    {linkNotice}
                  </div>
                ) : null}
                {linkError ? (
                  <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3.5 py-2 text-rose-100 text-xs">
                    {linkError}
                  </div>
                ) : null}

                <form className="flex gap-2" onSubmit={handleLinkWatcherCode}>
                  <label className="sr-only" htmlFor="watcher-code-input">
                    6-Digit Watcher Code
                  </label>
                  <input
                    className="flex-1 rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 font-mono text-base text-white tracking-widest focus:border-cyan-400 focus:outline-none"
                    id="watcher-code-input"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) =>
                      setCodeInput(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    pattern="\d{6}"
                    placeholder="482910"
                    required
                    value={codeInput}
                  />
                  <button
                    className="rounded-xl bg-cyan-600 px-4 py-2.5 font-bold text-white text-xs transition hover:brightness-110 disabled:opacity-50"
                    disabled={linkingCode || codeInput.length !== 6}
                    type="submit"
                  >
                    {linkingCode ? "Linking..." : "Link Kid"}
                  </button>
                </form>
              </section>
            </div>

            {/* Watched Kids Progress + Anti-Cheat Integrity Log */}
            <section className="space-y-4">
              <h2 className="font-bold text-lg text-white">
                Watched Learner Profiles ({kids.length})
              </h2>

              {kids.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 text-sm">
                  No kid profiles linked yet. Create a kid profile on the left
                  or enter your child&apos;s 6-digit Watcher Code on the right!
                </div>
              ) : (
                <div className="space-y-4">
                  {kids.map((kid) => {
                    const isActive = kid.learnerId === currentActiveId;
                    return (
                      <article
                        className="glass-panel space-y-4 rounded-2xl p-5"
                        key={kid.learnerId}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-white/10 border-b pb-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-extrabold text-lg text-white">
                                {kid.nickname}
                              </h3>
                              <span className="font-mono text-slate-400 text-xs">
                                @{kid.studentUsername}
                              </span>
                              <span className="rounded-full border border-violet-400/35 bg-violet-500/15 px-2.5 py-0.5 font-semibold text-[11px] text-violet-200">
                                {kid.tier === "higher"
                                  ? "Higher (4–9)"
                                  : "Foundation (1–5)"}{" "}
                                · Target Grade {kid.targetGrade}
                              </span>
                              {kid.watcherCode ? (
                                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                                  Code: {kid.watcherCode}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                              <span className="inline-flex items-center gap-1 font-semibold text-orange-200">
                                <Flame className="size-3.5 text-orange-400" />
                                {kid.currentStreak}d Streak
                              </span>
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-200">
                                <Zap className="size-3.5 text-amber-400" />
                                {kid.totalXp} XP
                              </span>
                              <span className="text-slate-300">
                                <strong>{kid.topicsStudiedCount}</strong> topics
                                studied · Avg Mastery{" "}
                                <strong>{kid.averageMastery}%</strong>
                              </span>
                            </div>
                          </div>

                          <button
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold text-xs transition",
                              isActive
                                ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                            )}
                            onClick={() => handleSwitchLearner(kid.learnerId)}
                            type="button"
                          >
                            <span>
                              {isActive
                                ? `Active View (${kid.nickname})`
                                : `Open ${kid.nickname}'s Topics`}
                            </span>
                            <ArrowRight className="size-3.5" />
                          </button>
                        </div>

                        {/* Quiz Integrity Table */}
                        <div className="space-y-2">
                          <div className="font-semibold text-slate-300 text-xs">
                            Recent No-Cheat Quiz Attempts &amp; Integrity Flags
                          </div>

                          {kid.recentQuizzes.length === 0 ? (
                            <p className="text-slate-500 text-xs">
                              No quizzes taken yet — ask {kid.nickname} to pick
                              a topic and try Step 2: No-Cheat Quiz!
                            </p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {kid.recentQuizzes.map((q) => {
                                const topicTitle =
                                  getTopicBySlug(q.topicSlug)?.title ??
                                  q.topicSlug;
                                const clean = q.integrityFlags.length === 0;
                                return (
                                  <div
                                    className="flex flex-col justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs"
                                    key={q.id}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-white">
                                        {topicTitle}
                                      </span>
                                      <span
                                        className={cn(
                                          "rounded-full px-2 py-0.5 font-bold text-[11px]",
                                          q.status !== "completed"
                                            ? "bg-slate-700 text-slate-200"
                                            : q.scorePercent >= 80
                                              ? "bg-emerald-500/20 text-emerald-200"
                                              : "bg-amber-500/20 text-amber-200"
                                        )}
                                      >
                                        {q.status === "completed"
                                          ? `${q.scorePercent}% (${q.correctCount}/${q.totalQuestions})`
                                          : "In progress"}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                      {clean ? (
                                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                                          <ShieldCheck className="size-3.5" />
                                          Clean Effort ✓
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                                          <AlertTriangle className="size-3.5" />
                                          {q.tabSwitchCount > 0
                                            ? `Tab switches: ${q.tabSwitchCount} `
                                            : ""}
                                          {q.pasteCount > 0
                                            ? `· Paste blocked: ${q.pasteCount} `
                                            : ""}
                                          {q.rapidGuessCount >= 2
                                            ? `· Rapid guesses: ${q.rapidGuessCount}`
                                            : ""}
                                        </span>
                                      )}

                                      <span className="text-slate-400">
                                        Hints: {q.hintsUsed}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
