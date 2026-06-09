"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type DashboardData = {
  student: { id: string; name: string; schoolYear: number } | null;
  missions: { id: string; title: string; emoji: string; description: string }[];
  progress: {
    missionId: string;
    status: string;
    score: number;
    challengesDone: number;
    challengesTotal: number;
    completedAt: string | null;
  }[];
};

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    not_started: "bg-muted text-muted-foreground",
    in_progress: "bg-primary/20 text-primary",
    completed: "bg-green-500/20 text-green-400",
    mastered: "bg-violet-500/20 text-violet-400",
  };
  return colors[status] ?? colors.not_started;
}

export default function ParentDashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session?.user || (session.user as any).type === "guest") {
      router.replace("/");
      return;
    }
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((json: DashboardData) => {
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load dashboard", e);
        setLoading(false);
      });
  }, [session, authStatus, router]);

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  if (loading || authStatus === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Parent Dashboard</h1>
        <p className="text-muted-foreground">No students linked to your account yet.</p>
      </div>
    );
  }

  const { student, missions, progress } = data;
  const progressMap = new Map(progress.map((p) => [p.missionId, p]));
  const completedList = progress.filter((p) => p.status === "completed" || p.status === "mastered");
  const inProgressList = progress.filter((p) => p.status === "in_progress");
  const currentMission = inProgressList[0] ?? null;
  const currentMissionDef = currentMission
    ? missions.find((m) => m.id === currentMission.missionId) ?? null
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Parent Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {student.name} &middot; Year {student.schoolYear}
          </p>
        </div>
        <button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-4 py-1.5 text-sm font-semibold text-white shadow-lg"
          onClick={handleBack}
          type="button"
        >
          Back to app
        </button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Completed", value: completedList.length, emoji: "✅" },
          { label: "In Progress", value: inProgressList.length, emoji: "📖" },
          { label: "Mastered", value: progress.filter((p) => p.status === "mastered").length, emoji: "🏆" },
          { label: "Remaining", value: missions.length - completedList.length - inProgressList.length, emoji: "📋" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/50 bg-card p-4 text-center"
          >
            <span className="text-2xl">{stat.emoji}</span>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {currentMissionDef && currentMission && (
        <div className="mb-8 rounded-2xl border border-primary/30 bg-card p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Current Mission
          </p>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentMissionDef.emoji}</span>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">{currentMissionDef.title}</h3>
              <p className="text-sm text-muted-foreground">
                Score: {currentMission.score}/{currentMission.challengesTotal} &middot;{" "}
                {currentMission.challengesDone} challenges done
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-border/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                  style={{
                    width: `${currentMission.challengesTotal > 0 ? (currentMission.challengesDone / currentMission.challengesTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(currentMission.status)}`}
            >
              {currentMission.status.replace("_", " ")}
            </span>
          </div>
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold text-foreground">All Missions ({missions.length})</h2>
      <div className="space-y-3">
        {missions.map((mission) => {
          const mp = progressMap.get(mission.id);
          const status = mp?.status ?? "not_started";
          const pct = mp && mp.challengesTotal > 0
            ? Math.round((mp.challengesDone / mp.challengesTotal) * 100)
            : 0;

          return (
            <div
              key={mission.id}
              className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card p-4"
            >
              <span className="text-2xl">{mission.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground">{mission.title}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${statusBadge(status)}`}
                  >
                    {status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{mission.description}</p>
                {mp && mp.challengesTotal > 0 && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-border/30">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {mp.score}/{mp.challengesTotal}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
