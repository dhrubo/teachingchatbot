"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { TopicRequest } from "@/lib/db/schema";

type AdminMission = { slug: string; title: string; yearGroup: number };

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: string;
};

type AdminData = {
  topicRequests: TopicRequest[];
  missions: AdminMission[];
  missionCount: number;
  users: AdminUser[];
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5">
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-orange-500/20 text-orange-400",
  reviewed: "bg-violet-500/20 text-violet-400",
  added: "bg-green-500/20 text-green-400",
  dismissed: "bg-muted text-muted-foreground",
};

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (!res.ok) {
      throw new Error(res.statusText);
    }
    setData((await res.json()) as AdminData);
  }, []);

  useEffect(() => {
    if (authStatus === "loading") {
      return;
    }
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || role !== "admin") {
      setForbidden(true);
      setLoading(false);
      return;
    }
    loadData()
      .catch((e) => console.error("Failed to load admin data", e))
      .finally(() => setLoading(false));
  }, [session, authStatus, loadData]);

  const setUserStatus = useCallback(
    async (userId: string, status: "approved" | "rejected" | "pending") => {
      setBusyUserId(userId);
      try {
        await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, status }),
        });
        await loadData();
      } catch (e) {
        console.error("Failed to set user status", e);
      } finally {
        setBusyUserId(null);
      }
    },
    [loadData]
  );

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  if (loading || authStatus === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground">Loading admin…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Admin</h1>
        <p className="text-muted-foreground">
          You don&apos;t have access to this page.
        </p>
        <button
          className="mt-4 rounded-full bg-[image:var(--gradient-sunset)] px-4 py-1.5 text-sm font-semibold text-white shadow-lg"
          onClick={handleBack}
          type="button"
        >
          Back to app
        </button>
      </div>
    );
  }

  const topicRequests = data?.topicRequests ?? [];
  const missions = data?.missions ?? [];
  const users = data?.users ?? [];
  const openRequests = topicRequests.filter((r) => r.status === "new").length;
  const pendingUsers = users.filter(
    (u) => u.approvalStatus === "pending"
  ).length;
  const year8 = missions.filter((m) => m.yearGroup === 8);
  const year9 = missions.filter((m) => m.yearGroup === 9);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Users, curriculum coverage &amp; topic requests
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

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Users" value={users.length} />
        <StatCard label="Pending approval" value={pendingUsers} />
        <StatCard label="Active missions" value={data?.missionCount ?? 0} />
        <StatCard label="Open topic requests" value={openRequests} />
      </div>

      {/* ---- Users (approve / reject for premium) ---- */}
      <h2 className="mb-1 text-xl font-bold text-foreground">
        👤 Users ({users.length})
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Only <strong className="text-foreground">approved</strong> users get the
        premium model. Pending/rejected users still use the app on the free
        model.
      </p>
      <div className="mb-10 space-y-2">
        {users.length > 0 ? (
          users.map((u) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-4"
              key={u.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {u.email}
                  {u.role === "admin" && (
                    <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium uppercase text-violet-400">
                      admin
                    </span>
                  )}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase ${
                    STATUS_STYLES[u.approvalStatus] ?? STATUS_STYLES.dismissed
                  }`}
                >
                  {u.approvalStatus}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  className="rounded-full bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-400 transition-colors hover:bg-green-500/25 disabled:opacity-50"
                  disabled={busyUserId === u.id || u.approvalStatus === "approved"}
                  onClick={() => setUserStatus(u.id, "approved")}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="rounded-full bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-50"
                  disabled={busyUserId === u.id || u.approvalStatus === "rejected"}
                  onClick={() => setUserStatus(u.id, "rejected")}
                  type="button"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        )}
      </div>

      {/* ---- Topic requests ---- */}
      <h2 className="mb-1 text-xl font-bold text-foreground">
        📋 Topic Requests
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Topics students pasted that aren&apos;t in the curriculum yet, by demand.
      </p>
      <div className="mb-10 space-y-2">
        {topicRequests.length > 0 ? (
          topicRequests.map((r) => (
            <div
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-4"
              key={r.id}
            >
              <span className="font-medium text-foreground">{r.topicText}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  requested {r.requestCount}×
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase ${
                    STATUS_STYLES[r.status] ?? STATUS_STYLES.dismissed
                  }`}
                >
                  {r.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No topic requests yet.
          </p>
        )}
      </div>

      {/* ---- Curriculum coverage ---- */}
      <h2 className="mb-4 text-xl font-bold text-foreground">
        📚 Curriculum ({missions.length})
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {(
          [
            ["Year 8", year8],
            ["Year 9", year9],
          ] as const
        ).map(([label, list]) => (
          <div key={label}>
            <h3 className="mb-2 text-sm font-semibold text-foreground/80">
              {label} ({list.length})
            </h3>
            <div className="space-y-1.5">
              {list.map((m) => (
                <div
                  className="rounded-xl border border-border/30 bg-card/40 px-3 py-2 text-sm text-foreground"
                  key={m.slug}
                >
                  {m.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
