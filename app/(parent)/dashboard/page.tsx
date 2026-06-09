"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { bandFromScore } from "@/lib/adaptive/update-mastery";
import type { StudentSkillMastery, TopicRequest } from "@/lib/db/schema";

type DashboardData = {
  student: { id: string; name: string; schoolYear: number } | null;
  skillMastery: StudentSkillMastery[];
  topicRequests?: TopicRequest[];
};

function RequestedTopics({ requests }: { requests: TopicRequest[] }) {
  if (requests.length === 0) {
    return null;
  }
  return (
    <div className="mt-10">
      <h2 className="mb-1 text-xl font-bold text-foreground">
        📋 Requested Topics ({requests.length})
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Topics students pasted that aren&apos;t in the curriculum yet — ordered
        by how often they&apos;ve been asked for.
      </p>
      <div className="space-y-2">
        {requests.map((r) => (
          <div
            className="flex items-center justify-between rounded-2xl border border-border/40 bg-card p-4"
            key={r.id}
          >
            <span className="font-medium text-foreground">{r.topicText}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              requested {r.requestCount}×
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function bandColor(band: string) {
  const colors: Record<string, string> = {
    must: "bg-red-500/20 text-red-400",
    should: "bg-orange-500/20 text-orange-400",
    could: "bg-green-500/20 text-green-400",
    gcse_bridge: "bg-violet-500/20 text-violet-400",
  };
  return colors[band] ?? "bg-muted text-muted-foreground";
}

function SkillMasteryRow({ mastery }: { mastery: StudentSkillMastery }) {
  const band = bandFromScore(mastery.masteryScore);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground">{mastery.skillSlug}</h4>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${bandColor(band)}`}
          >
            {band.replace("_", " ")}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-border/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
              style={{ width: `${mastery.masteryScore}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground">
            {mastery.masteryScore}
            <span className="text-muted-foreground">/100</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ParentDashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (
      !session?.user ||
      (session.user as { type?: string }).type === "guest"
    ) {
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
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Parent Dashboard
        </h1>
        <p className="text-muted-foreground">
          No students linked to your account yet.
        </p>
        <RequestedTopics requests={data?.topicRequests ?? []} />
      </div>
    );
  }

  const { student, skillMastery } = data;
  const topicRequests = data.topicRequests ?? [];
  const strongSkills = skillMastery.filter((s) => s.masteryScore >= 75);
  const weakSkills = skillMastery.filter((s) => s.masteryScore < 50);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Parent Dashboard
          </h1>
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

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-bold text-foreground">
            💪 Strong Skills ({strongSkills.length})
          </h2>
          <div className="space-y-3">
            {strongSkills.length > 0 ? (
              strongSkills.map((skill) => (
                <SkillMasteryRow key={skill.skillSlug} mastery={skill} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No strong skills identified yet.
              </p>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold text-foreground">
            🌱 Weak Skills ({weakSkills.length})
          </h2>
          <div className="space-y-3">
            {weakSkills.length > 0 ? (
              weakSkills.map((skill) => (
                <SkillMasteryRow key={skill.skillSlug} mastery={skill} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No weak skills identified yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold text-foreground">
        All Skills ({skillMastery.length})
      </h2>
      <div className="space-y-3">
        {skillMastery.map((skill) => (
          <SkillMasteryRow key={skill.skillSlug} mastery={skill} />
        ))}
      </div>

      <RequestedTopics requests={topicRequests} />
    </div>
  );
}
