"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mutate } from "swr";
import type { EdexcelTier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export type AuthTab = "signin" | "pin" | "register-student" | "register-parent";

export function AuthForm({ initialTab = "signin" }: { initialTab?: AuthTab }) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdWatcherCode, setCreatedWatcherCode] = useState<string | null>(
    null
  );

  // Sign-in state
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Kid PIN state
  const [pinUsername, setPinUsername] = useState("");
  const [pinCode, setPinCode] = useState("");

  // Student registration state
  const [studentName, setStudentName] = useState("");
  const [studentUsername, setStudentUsername] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [studentTier, setStudentTier] = useState<EdexcelTier>("foundation");
  const [studentGrade, setStudentGrade] = useState(5);
  const [invitedParentEmail, setInvitedParentEmail] = useState("");

  // Parent registration state
  const [parentName, setParentName] = useState("");
  const [parentUsername, setParentUsername] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setErrorMsg(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "password",
          identifier,
          password: loginPassword,
        }),
      });
      const data = (await res.json()) as {
        account?: { role: "parent" | "student" };
        cause?: string;
        message?: string;
      };
      if (!res.ok || !data.account) {
        setErrorMsg(data.cause || data.message || "Sign-in failed.");
        return;
      }
      await mutate("/api/auth/me");
      router.push(data.account.role === "parent" ? "/guardian" : "/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "pin",
          username: pinUsername,
          pin: pinCode,
        }),
      });
      const data = (await res.json()) as {
        account?: { role: "student" };
        cause?: string;
        message?: string;
      };
      if (!res.ok || !data.account) {
        setErrorMsg(
          data.cause || data.message || "Invalid kid username or 4-digit PIN."
        );
        return;
      }
      await mutate("/api/auth/me");
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "student",
          displayName: studentName,
          username: studentUsername,
          password: studentPassword,
          pin: studentPin,
          tier: studentTier,
          targetGrade: studentGrade,
          invitedParentEmail,
        }),
      });
      const data = (await res.json()) as {
        account?: { watcherCode: string | null };
        cause?: string;
        message?: string;
      };
      if (!res.ok || !data.account) {
        setErrorMsg(data.cause || data.message || "Could not create profile.");
        return;
      }
      await mutate("/api/auth/me");
      setCreatedWatcherCode(data.account.watcherCode ?? "000000");
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "parent",
          displayName: parentName,
          username: parentUsername,
          email: parentEmail,
          password: parentPassword,
        }),
      });
      const data = (await res.json()) as {
        account?: { id: string };
        cause?: string;
        message?: string;
      };
      if (!res.ok || !data.account) {
        setErrorMsg(
          data.cause || data.message || "Could not create parent account."
        );
        return;
      }
      await mutate("/api/auth/me");
      router.push("/guardian");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (createdWatcherCode) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="glass-panel space-y-5 rounded-2xl p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-400" />
          <h1 className="font-extrabold text-2xl text-white">
            Student Profile Created!
          </h1>
          <p className="text-slate-300 text-sm">
            Share this 6-digit <strong>Parent / Guardian Watcher Code</strong>{" "}
            with a parent or guardian so they can link to your profile and
            celebrate your progress:
          </p>
          <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/15 py-4 font-extrabold font-mono text-3xl text-cyan-100 tracking-widest">
            {createdWatcherCode}
          </div>
          <p className="text-slate-400 text-xs">
            You can view this code anytime from the top bar under{" "}
            <strong>Watcher Code</strong>.
          </p>
          <button
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 py-3 font-bold text-sm text-white shadow-md transition hover:brightness-110"
            onClick={() => {
              router.push("/");
              router.refresh();
            }}
            type="button"
          >
            Start Learning Edexcel GCSE Maths →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        className="mb-5 inline-flex items-center gap-1.5 text-slate-400 text-xs hover:text-orange-300"
        href="/"
      >
        <ArrowLeft className="size-3.5" />
        Back to Topics
      </Link>

      <div className="glass-panel space-y-6 rounded-2xl p-6">
        <div className="space-y-1">
          <h1 className="font-extrabold text-2xl text-white">
            Student &amp; Parent Watcher Accounts
          </h1>
          <p className="text-slate-400 text-xs">
            Kids can sign up directly (and link a parent watcher), or parents
            can create kid profiles with a fast 4-digit PIN.
          </p>
        </div>

        {/* 4 Clean Mode Tabs */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-slate-950/75 p-1.5 sm:grid-cols-4">
          <button
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 font-semibold text-xs transition",
              tab === "signin"
                ? "bg-orange-500 text-white"
                : "text-slate-300 hover:text-white"
            )}
            onClick={() => switchTab("signin")}
            type="button"
          >
            <LogIn className="size-3.5" />
            Sign In
          </button>

          <button
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 font-semibold text-xs transition",
              tab === "pin"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:text-white"
            )}
            onClick={() => switchTab("pin")}
            type="button"
          >
            <KeyRound className="size-3.5" />
            Kid PIN
          </button>

          <button
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 font-semibold text-xs transition",
              tab === "register-student"
                ? "bg-violet-600 text-white"
                : "text-slate-300 hover:text-white"
            )}
            onClick={() => switchTab("register-student")}
            type="button"
          >
            <UserPlus className="size-3.5" />
            New Student
          </button>

          <button
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 font-semibold text-xs transition",
              tab === "register-parent"
                ? "bg-cyan-600 text-white"
                : "text-slate-300 hover:text-white"
            )}
            onClick={() => switchTab("register-parent")}
            type="button"
          >
            <Eye className="size-3.5" />
            New Parent
          </button>
        </div>

        {errorMsg ? (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3.5 py-2.5 text-rose-100 text-xs">
            {errorMsg}
          </div>
        ) : null}

        {tab === "signin" ? (
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div>
              <label
                className="mb-1 block font-semibold text-slate-200 text-xs"
                htmlFor="signin-identifier"
              >
                Username or Email
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-orange-400 focus:outline-none"
                id="signin-identifier"
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. maya_y9 or parent@example.com"
                required
                value={identifier}
              />
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-slate-200 text-xs"
                htmlFor="signin-password"
              >
                Password
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-orange-400 focus:outline-none"
                id="signin-password"
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter your password"
                required
                type="password"
                value={loginPassword}
              />
            </div>

            <button
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 py-3 font-bold text-sm text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              {busy ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : null}

        {tab === "pin" ? (
          <form className="space-y-4" onSubmit={handlePinLogin}>
            <p className="text-slate-300 text-xs">
              Did a parent or guardian create your profile? Enter your username
              and 4-digit PIN below.
            </p>
            <div>
              <label
                className="mb-1 block font-semibold text-slate-200 text-xs"
                htmlFor="pin-username"
              >
                Kid Username
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                id="pin-username"
                onChange={(e) => setPinUsername(e.target.value)}
                placeholder="e.g. leo_maths"
                required
                value={pinUsername}
              />
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-slate-200 text-xs"
                htmlFor="pin-code"
              >
                4-Digit PIN
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 font-mono text-lg text-white tracking-widest focus:border-amber-400 focus:outline-none"
                id="pin-code"
                inputMode="numeric"
                maxLength={4}
                onChange={(e) =>
                  setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                pattern="\d{4}"
                placeholder="1234"
                required
                type="password"
                value={pinCode}
              />
            </div>

            <button
              className="w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-950 text-sm shadow-md transition hover:brightness-110 disabled:opacity-50"
              disabled={busy || pinCode.length !== 4}
              type="submit"
            >
              {busy ? "Signing in..." : "Enter with 4-Digit PIN"}
            </button>
          </form>
        ) : null}

        {tab === "register-student" ? (
          <form className="space-y-4" onSubmit={handleRegisterStudent}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block font-semibold text-slate-200 text-xs"
                  htmlFor="stu-name"
                >
                  First Name / Nickname
                </label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none"
                  id="stu-name"
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Maya"
                  required
                  value={studentName}
                />
              </div>

              <div>
                <label
                  className="mb-1 block font-semibold text-slate-200 text-xs"
                  htmlFor="stu-username"
                >
                  Username
                </label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none"
                  id="stu-username"
                  onChange={(e) => setStudentUsername(e.target.value)}
                  placeholder="maya_gcse"
                  required
                  value={studentUsername}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block font-semibold text-slate-200 text-xs"
                  htmlFor="stu-password"
                >
                  Password (min 6 chars)
                </label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none"
                  id="stu-password"
                  minLength={6}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  type="password"
                  value={studentPassword}
                />
              </div>

              <div>
                <label
                  className="mb-1 block font-semibold text-slate-200 text-xs"
                  htmlFor="stu-pin"
                >
                  Optional 4-Digit Quick PIN
                </label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 font-mono text-sm text-white focus:border-violet-400 focus:outline-none"
                  id="stu-pin"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(e) =>
                    setStudentPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="Optional (e.g. 2468)"
                  value={studentPin}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block font-semibold text-slate-200 text-xs"
                  htmlFor="stu-tier"
                >
                  Edexcel GCSE Tier
                </label>
                <select
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none"
                  id="stu-tier"
                  onChange={(e) => {
                    const next = e.target.value as EdexcelTier;
                    setStudentTier(next);
                    setStudentGrade(next === "higher" ? 7 : 5);
                  }}
                  value={studentTier}
                >
                  <option value="foundation">Foundation (Grades 1–5)</option>
                  <option value="higher">Higher (Grades 4–9)</option>
                </select>
              </div>

              <div>
                <label
                  className="mb-1 block font-semibold text-slate-200 text-xs"
                  htmlFor="stu-grade"
                >
                  Target Grade
                </label>
                <select
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none"
                  id="stu-grade"
                  onChange={(e) =>
                    setStudentGrade(Number.parseInt(e.target.value, 10))
                  }
                  value={studentGrade}
                >
                  {(studentTier === "foundation"
                    ? [1, 2, 3, 4, 5]
                    : [4, 5, 6, 7, 8, 9]
                  ).map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-cyan-200 text-xs"
                htmlFor="stu-watcher-email"
              >
                Parent or Guardian Watcher Email (Optional)
              </label>
              <input
                className="w-full rounded-xl border border-cyan-400/30 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                id="stu-watcher-email"
                onChange={(e) => setInvitedParentEmail(e.target.value)}
                placeholder="mum@example.com — auto-links them as your Watcher!"
                type="email"
                value={invitedParentEmail}
              />
            </div>

            <button
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 py-3 font-bold text-sm text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              {busy ? "Creating Student Profile..." : "Create Student Profile"}
            </button>
          </form>
        ) : null}

        {tab === "register-parent" ? (
          <form className="space-y-4" onSubmit={handleRegisterParent}>
            <p className="text-slate-300 text-xs">
              Create a Parent / Guardian Watcher account to create kid profiles
              (with 4-digit PINs) or link to your child&apos;s existing profile
              and monitor quiz integrity.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block font-semibold text-slate-200 text-xs"
                  htmlFor="par-name"
                >
                  Your Name
                </label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  id="par-name"
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Sarah"
                  required
                  value={parentName}
                />
              </div>

              <div>
                <label
                  className="mb-1 block font-semibold text-slate-200 text-xs"
                  htmlFor="par-username"
                >
                  Username
                </label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  id="par-username"
                  onChange={(e) => setParentUsername(e.target.value)}
                  placeholder="sarah_guardian"
                  required
                  value={parentUsername}
                />
              </div>
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-slate-200 text-xs"
                htmlFor="par-email"
              >
                Email Address
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                id="par-email"
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="sarah@example.com"
                required
                type="email"
                value={parentEmail}
              />
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-slate-200 text-xs"
                htmlFor="par-password"
              >
                Password (min 6 chars)
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                id="par-password"
                minLength={6}
                onChange={(e) => setParentPassword(e.target.value)}
                placeholder="••••••"
                required
                type="password"
                value={parentPassword}
              />
            </div>

            <button
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 py-3 font-bold text-sm text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              {busy
                ? "Creating Watcher Account..."
                : "Create Parent / Guardian Account"}
            </button>
          </form>
        ) : null}

        <div className="flex items-center gap-2 border-white/10 border-t pt-4 text-slate-400 text-xs">
          <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
          <span>
            Zero external trackers — passwords &amp; PINs are scrypt-hashed and
            stored securely.
          </span>
        </div>
      </div>
    </div>
  );
}
