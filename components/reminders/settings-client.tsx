"use client";

import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCircle2,
  Cpu,
  Send,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TopNavBar } from "@/components/ranedeer/top-nav-bar";
import type { AiSetupStatus } from "@/lib/ai/providers";
import { ALL_LENSES, LENS_META } from "@/lib/curriculum/types";
import type { EdexcelTier, ExplanationLens, ToneStyle } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type SettingsClientProps = {
  initialLearner: {
    nickname: string;
    tier: EdexcelTier;
    targetGrade: number;
    preferredLens: ExplanationLens;
    toneStyle: ToneStyle;
    speechSpeed: string;
    dailyGoalMinutes: number;
    reminderEnabled: boolean;
    reminderHour: number;
    reminderMinute: number;
    timezone: string;
    currentStreak: number;
    longestStreak: number;
    streakFreezes: number;
    totalXp: number;
  };
  vapidPublicKey: string | null;
  pushSubscriptionCount: number;
  setup: AiSetupStatus;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const REMINDER_HOURS = [
  { hour: 7, label: "07:00 AM (Before school)" },
  { hour: 16, label: "04:00 PM (Right after school)" },
  { hour: 17, label: "05:00 PM (Afternoon study)" },
  { hour: 18, label: "06:00 PM (Early evening)" },
  { hour: 19, label: "07:00 PM (Evening revision)" },
  { hour: 20, label: "08:00 PM (Streak saver)" },
];

export function SettingsClient({
  initialLearner,
  vapidPublicKey,
  pushSubscriptionCount,
  setup,
}: SettingsClientProps) {
  const [nickname, setNickname] = useState(initialLearner.nickname);
  const [tier, setTier] = useState<EdexcelTier>(initialLearner.tier);
  const [targetGrade, setTargetGrade] = useState(initialLearner.targetGrade);
  const [preferredLens, setPreferredLens] = useState<ExplanationLens>(
    initialLearner.preferredLens
  );
  const [toneStyle, setToneStyle] = useState<ToneStyle>(
    initialLearner.toneStyle
  );
  const [speechSpeed, setSpeechSpeed] = useState<"0.85" | "1.0" | "1.15">(
    initialLearner.speechSpeed === "0.85" ||
      initialLearner.speechSpeed === "1.15"
      ? initialLearner.speechSpeed
      : "1.0"
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(
    initialLearner.dailyGoalMinutes
  );
  const [reminderEnabled, setReminderEnabled] = useState(
    initialLearner.reminderEnabled
  );
  const [reminderHour, setReminderHour] = useState(initialLearner.reminderHour);
  const [timezone, setTimezone] = useState(initialLearner.timezone);
  const [activeSubCount, setActiveSubCount] = useState(pushSubscriptionCount);

  const [savingConfig, setSavingConfig] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setTimezone(detected);
      }
    } catch {
      // Keep server default timezone
    }
  }, []);

  const validGrades =
    tier === "foundation" ? [1, 2, 3, 4, 5] : [4, 5, 6, 7, 8, 9];

  const handleTierSwitch = (nextTier: EdexcelTier) => {
    setTier(nextTier);
    if (nextTier === "foundation" && targetGrade > 5) {
      setTargetGrade(5);
    } else if (nextTier === "higher" && targetGrade < 4) {
      setTargetGrade(6);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigNotice(null);

    try {
      const res = await fetch("/api/learner/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim() || "Scholar",
          tier,
          targetGrade,
          preferredLens,
          toneStyle,
          speechSpeed,
          dailyGoalMinutes,
          reminderHour,
          reminderMinute: 0,
          timezone,
        }),
      });

      if (!res.ok) {
        throw new Error("Could not save configuration");
      }
      setConfigNotice(
        "Saved! Mr. Ranedeer will use your updated /config profile across every lesson."
      );
    } catch {
      setConfigNotice("Could not save settings — please try again.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleEnablePushReminders = async () => {
    setPushBusy(true);
    setPushStatus(null);

    try {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setPushStatus(
          "This browser doesn't support Web Push. On iPhone/iPad, tap Share → Add to Home Screen first!"
        );
        return;
      }

      if (!vapidPublicKey) {
        setPushStatus(
          "VAPID keys aren't set on this host yet. Run `pnpm vapid:generate` and add them to .env.local."
        );
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(
          "Notification permission was declined. Enable notifications in your browser address bar to get daily streak nudges."
        );
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;

      const existingSub = await registration.pushManager.getSubscription();
      const subscription =
        existingSub ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error("Incomplete browser push subscription keys");
      }

      const res = await fetch("/api/reminders/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          },
          reminderHour,
          reminderMinute: 0,
          timezone,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to store push subscription");
      }

      setReminderEnabled(true);
      setActiveSubCount((c) => Math.max(1, c));
      setPushStatus(
        `Daily practice reminders enabled for ${String(reminderHour).padStart(2, "0")}:00 (${timezone})!`
      );
    } catch (err) {
      setPushStatus(
        err instanceof Error
          ? `Could not enable push notifications: ${err.message}`
          : "Could not enable push notifications."
      );
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePushReminders = async () => {
    setPushBusy(true);
    setPushStatus(null);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/reminders/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      }
      await fetch("/api/learner/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderEnabled: false }),
      });
      setReminderEnabled(false);
      setActiveSubCount(0);
      setPushStatus("Daily push reminders paused.");
    } catch {
      setPushStatus("Could not pause reminders — please try again.");
    } finally {
      setPushBusy(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushBusy(true);
    setPushStatus(null);
    try {
      const res = await fetch("/api/reminders/test", { method: "POST" });
      if (res.ok) {
        setPushStatus(
          "Test streak reminder sent! Check your desktop or mobile notification banner."
        );
        return;
      }

      // Fallback local Service Worker notification preview if not subscribed yet
      if (
        "serviceWorker" in navigator &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(
          `🦌 Keep your ${initialLearner.currentStreak}-day Maths streak alive!`,
          {
            body: "5-minute Edexcel GCSE voice warmup ready — Compound Interest & Fractions.",
            icon: "/favicon.ico",
          }
        );
        setPushStatus(
          "Displayed local preview notification via Service Worker!"
        );
        return;
      }

      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setPushStatus(
        body.message ?? "Enable Daily Push Reminders first to test delivery."
      );
    } catch {
      setPushStatus("Test notification failed — check browser permissions.");
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <TopNavBar
        currentStreak={initialLearner.currentStreak}
        nickname={nickname}
        reminderEnabled={reminderEnabled}
        streakFreezes={initialLearner.streakFreezes}
        targetGrade={targetGrade}
        tier={tier}
        totalXp={initialLearner.totalXp}
      />

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              className="inline-flex items-center gap-1.5 text-slate-400 text-xs hover:text-orange-300"
              href="/"
            >
              <ArrowLeft className="size-3.5" />
              Back to Topics
            </Link>
            <h1 className="mt-1 font-extrabold text-2xl text-white">
              Learner Settings &amp; Daily Practice Reminders
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3.5 py-2 font-semibold text-cyan-100 text-xs transition hover:bg-cyan-500/25"
              href="/guardian"
            >
              Watcher Code &amp; Parent Hub →
            </Link>
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 font-semibold text-slate-200 text-xs transition hover:bg-white/10"
              href="/login"
            >
              Accounts / Kid PIN
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Mr. Ranedeer /config Form */}
          <form
            className="glass-panel flex flex-col gap-5 rounded-3xl p-6 lg:col-span-7"
            onSubmit={handleSaveConfig}
          >
            <div className="flex items-center gap-2 border-white/10 border-b pb-3">
              <SlidersHorizontal className="size-4 text-orange-400" />
              <h2 className="font-bold text-base text-white">
                Student Learning Profile (/config)
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-slate-300">
                  First Name or Nickname
                </span>
                <input
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-white"
                  maxLength={48}
                  onChange={(e) => setNickname(e.target.value)}
                  type="text"
                  value={nickname}
                />
              </label>

              <div className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-slate-300">
                  Pearson Edexcel 1MA1 Tier
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(["foundation", "higher"] as const).map((t) => (
                    <button
                      className={cn(
                        "h-10 rounded-xl border font-semibold capitalize transition",
                        tier === t
                          ? "border-violet-400/60 bg-violet-600/30 text-white"
                          : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                      )}
                      key={t}
                      onClick={() => handleTierSwitch(t)}
                      type="button"
                    >
                      {t === "foundation" ? "Foundation (1–5)" : "Higher (4–9)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Grade */}
            <div className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-slate-300">
                Target GCSE Maths Grade
              </span>
              <div className="flex flex-wrap gap-2">
                {validGrades.map((g) => (
                  <button
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl border font-bold font-mono text-sm transition",
                      targetGrade === g
                        ? "border-orange-400 bg-orange-500/25 text-white"
                        : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                    )}
                    key={g}
                    onClick={() => setTargetGrade(g)}
                    type="button"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Starting Explanation Lens */}
            <div className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-slate-300">
                Default Explanation Style (Mr. Ranedeer Learning Style)
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALL_LENSES.map((lens) => (
                  <button
                    className={cn(
                      "flex flex-col items-start rounded-xl border p-3 text-left transition",
                      preferredLens === lens
                        ? "border-orange-400/60 bg-orange-500/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
                    )}
                    key={lens}
                    onClick={() => setPreferredLens(lens)}
                    type="button"
                  >
                    <span className="font-bold text-xs">
                      {LENS_META[lens].label}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400">
                      {LENS_META[lens].description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone, Speech Speed, Daily Goal */}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-slate-300">
                  Tutor Tone Style
                </span>
                <select
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/80 px-3 text-white"
                  onChange={(e) => setToneStyle(e.target.value as ToneStyle)}
                  value={toneStyle}
                >
                  <option value="encouraging">Encouraging</option>
                  <option value="calm">Calm &amp; Patient</option>
                  <option value="friendly">Friendly &amp; Upbeat</option>
                  <option value="direct">Direct Exam Coach</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-slate-300">
                  British Voice Speed
                </span>
                <select
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/80 px-3 text-white"
                  onChange={(e) =>
                    setSpeechSpeed(e.target.value as "0.85" | "1.0" | "1.15")
                  }
                  value={speechSpeed}
                >
                  <option value="0.85">0.85x (Steady)</option>
                  <option value="1.0">1.0x (Natural)</option>
                  <option value="1.15">1.15x (Brisk)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-slate-300">
                  Daily Practice Goal
                </span>
                <select
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/80 px-3 text-white"
                  onChange={(e) =>
                    setDailyGoalMinutes(Number.parseInt(e.target.value, 10))
                  }
                  value={dailyGoalMinutes}
                >
                  <option value={5}>5 mins / day (Casual)</option>
                  <option value={10}>10 mins / day (Steady)</option>
                  <option value={15}>15 mins / day (Serious)</option>
                  <option value={20}>20 mins / day (Exam Sprint)</option>
                </select>
              </label>
            </div>

            {configNotice ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-2.5 text-emerald-200 text-xs">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                <span>{configNotice}</span>
              </div>
            ) : null}

            <button
              className="rounded-2xl bg-gradient-to-r from-orange-500 to-violet-600 px-5 py-3 font-bold text-sm text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
              disabled={savingConfig}
              type="submit"
            >
              {savingConfig ? "Saving /config..." : "Save Mr. Ranedeer /config"}
            </button>
          </form>

          {/* Right Column: Duolingo Daily Push Reminders + Free AI Setup Health */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <section className="glass-panel flex flex-col gap-4 rounded-3xl p-6">
              <div className="flex items-center justify-between border-white/10 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-emerald-400" />
                  <h2 className="font-bold text-base text-white">
                    Duolingo-Style Daily Reminders
                  </h2>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-semibold text-[11px]",
                    reminderEnabled
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/10 text-slate-400"
                  )}
                >
                  {reminderEnabled
                    ? `Active (${activeSubCount} device${activeSubCount === 1 ? "" : "s"})`
                    : "Off"}
                </span>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">
                Get a gentle mobile or desktop push notification if you
                haven&apos;t completed your 5-minute Edexcel Maths warmup yet.
                Missing 1 day automatically uses a{" "}
                <strong className="text-cyan-300">
                  <Shield className="mr-0.5 inline size-3" />
                  Streak Freeze
                </strong>{" "}
                ({initialLearner.streakFreezes} available).
              </p>

              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-slate-300">
                  Preferred Daily Reminder Time ({timezone})
                </span>
                <select
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/80 px-3 text-white"
                  onChange={(e) =>
                    setReminderHour(Number.parseInt(e.target.value, 10))
                  }
                  value={reminderHour}
                >
                  {REMINDER_HOURS.map((opt) => (
                    <option key={opt.hour} value={opt.hour}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-2.5">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 font-bold text-white text-xs shadow transition hover:bg-emerald-500 disabled:opacity-50"
                  disabled={pushBusy}
                  onClick={handleEnablePushReminders}
                  type="button"
                >
                  <Bell className="size-4" />
                  {reminderEnabled
                    ? "Update Push Reminder Schedule"
                    : "Enable Daily Push Reminders"}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-semibold text-slate-200 text-xs hover:bg-white/10 disabled:opacity-50"
                    disabled={pushBusy}
                    onClick={handleSendTestPush}
                    type="button"
                  >
                    <Send className="size-3.5 text-orange-400" />
                    Send Test Push
                  </button>

                  {reminderEnabled ? (
                    <button
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-semibold text-red-200 text-xs hover:bg-red-500/20 disabled:opacity-50"
                      disabled={pushBusy}
                      onClick={handleDisablePushReminders}
                      type="button"
                    >
                      <BellOff className="size-3.5" />
                      Pause
                    </button>
                  ) : null}
                </div>
              </div>

              {pushStatus ? (
                <p className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-slate-200 text-xs">
                  {pushStatus}
                </p>
              ) : null}
            </section>

            {/* Free AI Provider & Storage Diagnostics */}
            <section className="glass-panel flex flex-col gap-3 rounded-3xl p-6 text-xs">
              <div className="flex items-center gap-2 border-white/10 border-b pb-2.5">
                <Cpu className="size-4 text-violet-400" />
                <h2 className="font-bold text-sm text-white">
                  100% Free AI &amp; Voice Stack Status
                </h2>
              </div>

              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center justify-between">
                  <span>Groq Free Tier (Whisper STT + Qwen3 32B)</span>
                  <span
                    className={
                      setup.groqConfigured
                        ? "font-semibold text-emerald-300"
                        : "text-amber-300"
                    }
                  >
                    {setup.groqConfigured ? "Connected" : "Browser STT Active"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Google AI Studio (Gemini Flash-Lite)</span>
                  <span
                    className={
                      setup.geminiConfigured
                        ? "font-semibold text-emerald-300"
                        : "text-slate-400"
                    }
                  >
                    {setup.geminiConfigured ? "Connected" : "Optional"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>British Neural Voice (en-GB Sonia)</span>
                  <span className="font-semibold text-emerald-300">
                    Ready (Zero Key)
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Storage Mode</span>
                  <span className="font-mono text-slate-200">
                    {setup.databaseConfigured
                      ? "Neon Postgres"
                      : "Local JSON Store"}
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
