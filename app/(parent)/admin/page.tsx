"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { TopicRequest } from "@/lib/db/schema";

type DB_Mission = {
  id: number;
  slug: string;
  title: string;
  description: string;
  yearGroup: number;
  subject: string;
  gcseDomain: string;
  order: number;
  estimatedMinutes: number;
  isActive: boolean;
};

type DB_Lesson = {
  id: number;
  missionId: number;
  slug: string;
  title: string;
  summary: string;
  order: number;
  difficultyBand: "foundation" | "core" | "stretch" | "gcse_bridge";
  estimatedMinutes: number;
};

type DB_ConceptCard = {
  id: number;
  lessonId: number;
  order: number;
  title: string;
  body: string;
  visual: string | null;
  example: string | null;
  misconception: string | null;
};

type DB_QuestionArchetype = {
  id: string;
  slug: string;
  subject: string;
  yearGroup: number;
  missionSlug: string;
  lessonSlug: string;
  skillSlug: string;
  gcseDomain: string;
  difficultyBand: "must" | "should" | "could" | "gcse_bridge";
  questionType: "short_text" | "multiple_choice" | "numeric" | "algebraic";
  template: string;
  variableSchemaJson: any;
  answerExpression: string;
  acceptableAnswerRulesJson: any;
  hintTemplate: string | null;
  explanationTemplate: string | null;
  misconceptionTagsJson: any;
  calculatorAllowed: boolean;
  isActive: boolean;
};

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
  missions: DB_Mission[];
  lessons: DB_Lesson[];
  conceptCards: DB_ConceptCard[];
  questionArchetypes: DB_QuestionArchetype[];
  missionCount: number;
  users: AdminUser[];
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
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
  const [activeTab, setActiveTab] = useState<"overview" | "cms" | "artifacts">("overview");

  // Expanded Tree Viewer States
  const [expandedMissions, setExpandedMissions] = useState<Record<number, boolean>>({});
  const [expandedLessons, setExpandedLessons] = useState<Record<number, boolean>>({});

  // Form Collapse/Expand States
  const [activeForm, setActiveForm] = useState<"none" | "mission" | "lesson" | "card" | "archetype">("none");

  // Floating Toast Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form States
  const [missionForm, setMissionForm] = useState({
    title: "",
    slug: "",
    description: "",
    yearGroup: "8",
    subject: "maths",
    gcseDomain: "Number",
    order: "1",
    estimatedMinutes: "30",
  });

  const [lessonForm, setLessonForm] = useState({
    missionId: "",
    title: "",
    slug: "",
    summary: "",
    order: "1",
    difficultyBand: "core" as const,
    estimatedMinutes: "15",
  });

  const [cardForm, setCardForm] = useState({
    lessonId: "",
    order: "1",
    title: "",
    body: "",
    visual: "",
    example: "",
    misconception: "",
  });

  const [archetypeForm, setArchetypeForm] = useState({
    slug: "",
    subject: "maths",
    yearGroup: "8",
    missionSlug: "",
    lessonSlug: "",
    skillSlug: "",
    gcseDomain: "Number",
    difficultyBand: "must" as const,
    questionType: "short_text" as const,
    template: "",
    variableSchemaJson: '{\n  "a": [2, 3, 5, 7],\n  "b": [10, 20, 30]\n}',
    answerExpression: "",
    acceptableAnswerRulesJson: '{\n  "numeric": true\n}',
    hintTemplate: "",
    explanationTemplate: "",
    misconceptionTagsJson: "[]",
    calculatorAllowed: false,
  });

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  }, []);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (!res.ok) {
      throw new Error(res.statusText);
    }
    const result = await res.json();
    setData(result as AdminData);
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
      .catch((e) => {
        console.error("Failed to load admin data", e);
        showToast("Failed to load admin curriculum data.", "error");
      })
      .finally(() => setLoading(false));
  }, [session, authStatus, loadData, showToast]);

  const setUserStatus = useCallback(
    async (userId: string, status: "approved" | "rejected" | "pending") => {
      setBusyUserId(userId);
      try {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, status }),
        });
        if (!res.ok) {
          throw new Error("Failed to update user status");
        }
        showToast("User premium status updated successfully!");
        await loadData();
      } catch (e: any) {
        console.error("Failed to set user status", e);
        showToast(e.message || "Failed to update user status", "error");
      } finally {
        setBusyUserId(null);
      }
    },
    [loadData, showToast]
  );

  const handleCreateItem = async (action: string, payload: any) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || result.details || "Failed to save curriculum item");
      }
      showToast(`${action.replace("create-", "").toUpperCase()} added successfully! 🎉`);
      await loadData();
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "An error occurred writing to the database", "error");
      return false;
    }
  };

  // Form Auto-slug Generators
  const handleMissionTitleChange = (val: string) => {
    setMissionForm((prev) => ({
      ...prev,
      title: val,
      slug: val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    }));
  };

  const handleLessonTitleChange = (val: string) => {
    setLessonForm((prev) => ({
      ...prev,
      title: val,
      slug: prev.title ? prev.slug : val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    }));
  };

  const handleArchetypeMissionSelect = (mSlug: string) => {
    const selectedMission = data?.missions.find((m) => m.slug === mSlug);
    setArchetypeForm((prev) => ({
      ...prev,
      missionSlug: mSlug,
      gcseDomain: selectedMission?.gcseDomain || prev.gcseDomain,
      yearGroup: selectedMission?.yearGroup ? String(selectedMission.yearGroup) : prev.yearGroup,
      lessonSlug: "", // Reset lesson on mission slug switch
    }));
  };

  // Form Submission Handlers
  const handleMissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionForm.title || !missionForm.slug || !missionForm.description || !missionForm.gcseDomain) {
      showToast("Please fill in all required fields for the Topic", "error");
      return;
    }
    const success = await handleCreateItem("create-mission", {
      slug: missionForm.slug,
      title: missionForm.title,
      description: missionForm.description,
      yearGroup: Number(missionForm.yearGroup),
      subject: missionForm.subject,
      gcseDomain: missionForm.gcseDomain,
      order: Number(missionForm.order),
      estimatedMinutes: Number(missionForm.estimatedMinutes),
    });
    if (success) {
      setMissionForm({
        title: "",
        slug: "",
        description: "",
        yearGroup: "8",
        subject: "maths",
        gcseDomain: "Number",
        order: "1",
        estimatedMinutes: "30",
      });
      setActiveForm("none");
    }
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.missionId || !lessonForm.title || !lessonForm.slug || !lessonForm.summary) {
      showToast("Please fill in all required fields for the Lesson", "error");
      return;
    }
    const success = await handleCreateItem("create-lesson", {
      missionId: Number(lessonForm.missionId),
      slug: lessonForm.slug,
      title: lessonForm.title,
      summary: lessonForm.summary,
      order: Number(lessonForm.order),
      difficultyBand: lessonForm.difficultyBand,
      estimatedMinutes: Number(lessonForm.estimatedMinutes),
    });
    if (success) {
      setLessonForm({
        missionId: "",
        title: "",
        slug: "",
        summary: "",
        order: "1",
        difficultyBand: "core",
        estimatedMinutes: "15",
      });
      setActiveForm("none");
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.lessonId || !cardForm.title || !cardForm.body) {
      showToast("Please fill in all required fields for the Concept Card", "error");
      return;
    }
    const success = await handleCreateItem("create-card", {
      lessonId: Number(cardForm.lessonId),
      order: Number(cardForm.order),
      title: cardForm.title,
      body: cardForm.body,
      visual: cardForm.visual,
      example: cardForm.example,
      misconception: cardForm.misconception,
    });
    if (success) {
      setCardForm({
        lessonId: "",
        order: "1",
        title: "",
        body: "",
        visual: "",
        example: "",
        misconception: "",
      });
      setActiveForm("none");
    }
  };

  const handleArchetypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !archetypeForm.slug ||
      !archetypeForm.missionSlug ||
      !archetypeForm.lessonSlug ||
      !archetypeForm.skillSlug ||
      !archetypeForm.template ||
      !archetypeForm.answerExpression
    ) {
      showToast("Please fill in all required fields for the Question Archetype", "error");
      return;
    }

    try {
      JSON.parse(archetypeForm.variableSchemaJson);
    } catch {
      showToast("Variable Schema JSON has invalid syntax", "error");
      return;
    }
    try {
      JSON.parse(archetypeForm.acceptableAnswerRulesJson);
    } catch {
      showToast("Rules JSON has invalid syntax", "error");
      return;
    }
    try {
      JSON.parse(archetypeForm.misconceptionTagsJson);
    } catch {
      showToast("Misconception Tags JSON has invalid syntax", "error");
      return;
    }

    const success = await handleCreateItem("create-archetype", {
      slug: archetypeForm.slug,
      subject: archetypeForm.subject,
      yearGroup: Number(archetypeForm.yearGroup),
      missionSlug: archetypeForm.missionSlug,
      lessonSlug: archetypeForm.lessonSlug,
      skillSlug: archetypeForm.skillSlug,
      gcseDomain: archetypeForm.gcseDomain,
      difficultyBand: archetypeForm.difficultyBand,
      questionType: archetypeForm.questionType,
      template: archetypeForm.template,
      variableSchemaJson: archetypeForm.variableSchemaJson,
      answerExpression: archetypeForm.answerExpression,
      acceptableAnswerRulesJson: archetypeForm.acceptableAnswerRulesJson,
      hintTemplate: archetypeForm.hintTemplate,
      explanationTemplate: archetypeForm.explanationTemplate,
      misconceptionTagsJson: archetypeForm.misconceptionTagsJson,
      calculatorAllowed: archetypeForm.calculatorAllowed,
    });

    if (success) {
      setArchetypeForm({
        slug: "",
        subject: "maths",
        yearGroup: "8",
        missionSlug: "",
        lessonSlug: "",
        skillSlug: "",
        gcseDomain: "Number",
        difficultyBand: "must",
        questionType: "short_text",
        template: "",
        variableSchemaJson: '{\n  "a": [2, 3, 5, 7],\n  "b": [10, 20, 30]\n}',
        answerExpression: "",
        acceptableAnswerRulesJson: '{\n  "numeric": true\n}',
        hintTemplate: "",
        explanationTemplate: "",
        misconceptionTagsJson: "[]",
        calculatorAllowed: false,
      });
      setActiveForm("none");
    }
  };

  const toggleMissionTree = (id: number) => {
    setExpandedMissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleLessonTree = (id: number) => {
    setExpandedLessons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  if (loading || authStatus === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground">Loading SARA admin panel…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Admin</h1>
        <p className="text-muted-foreground">
          You don&apos;t have administrative permissions to view this dashboard.
        </p>
        <button
          className="mt-4 rounded-full bg-[image:var(--gradient-sunset)] px-4 py-1.5 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition-all"
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
  const lessons = data?.lessons ?? [];
  const conceptCards = data?.conceptCards ?? [];
  const questionArchetypes = data?.questionArchetypes ?? [];
  const users = data?.users ?? [];

  const filteredLessonsForArchetype = lessons.filter(
    (l) => l.missionId === missions.find((m) => m.slug === archetypeForm.missionSlug)?.id
  );

  const openRequests = topicRequests.filter((r) => r.status === "new").length;
  const pendingUsers = users.filter((u) => u.approvalStatus === "pending").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 relative min-h-screen">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-bounce border max-w-md ${
            toast.type === "success"
              ? "bg-green-500/15 text-green-400 border-green-500/30"
              : "bg-destructive/15 text-destructive border-destructive/30"
          }`}
        >
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-coral-500 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curriculum editor, DB tree browser, and premium member validation
          </p>
        </div>
        <button
          className="rounded-full bg-[image:var(--gradient-sunset)] px-5 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition-all shrink-0"
          onClick={handleBack}
          type="button"
        >
          Back to learning platform 🚀
        </button>
      </div>

      {/* Main Statistics Summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Registered Users" value={users.length} />
        <StatCard label="Pending Approvals" value={pendingUsers} />
        <StatCard label="DB Missions" value={missions.length} />
        <StatCard label="Open Requests" value={openRequests} />
      </div>

      {/* Tab Selectors */}
      <div className="mb-8 flex border-b border-border/40 gap-6">
        <button
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-amber-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("overview")}
          type="button"
        >
          👥 Overview &amp; Member Requests
        </button>
        <button
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "cms"
              ? "border-amber-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("cms")}
          type="button"
        >
          📚 Curriculum CMS &amp; DB Viewer
        </button>
        <button
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "artifacts"
              ? "border-amber-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("artifacts")}
          type="button"
        >
          🏺 Curriculum Artifacts
        </button>
      </div>

      {/* TAB 1: OVERVIEW AND USERS */}
      {activeTab === "overview" && (
        <div className="space-y-10 animate-fade-in">
          {/* Members Gated Verification */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">👤 Users List ({users.length})</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Verify parent/guardian credentials. Only <strong className="text-foreground">approved</strong> users are permitted premium model tokens.
            </p>
            <div className="space-y-2">
              {users.length > 0 ? (
                users.map((u) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-4 shadow-sm"
                    key={u.id}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate flex items-center gap-2">
                        {u.email}
                        {u.role === "admin" && (
                          <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-violet-400">
                            admin
                          </span>
                        )}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          STATUS_STYLES[u.approvalStatus] ?? STATUS_STYLES.dismissed
                        }`}
                      >
                        {u.approvalStatus}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        className="rounded-full bg-green-500/15 px-3 py-1.5 text-xs font-bold text-green-400 transition-colors hover:bg-green-500/25 disabled:opacity-40"
                        disabled={busyUserId === u.id || u.approvalStatus === "approved"}
                        onClick={() => setUserStatus(u.id, "approved")}
                        type="button"
                      >
                        Approve 👍
                      </button>
                      <button
                        className="rounded-full bg-destructive/15 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-40"
                        disabled={busyUserId === u.id || u.approvalStatus === "rejected"}
                        onClick={() => setUserStatus(u.id, "rejected")}
                        type="button"
                      >
                        Reject 👎
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground p-2">No standard users registered yet.</p>
              )}
            </div>
          </div>

          {/* Slipped/Unmatched Topic requests */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">📋 Topic Requests Demand</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Aggregated topics pasted by students that SARA failed to map onto the live curriculum schema.
            </p>
            <div className="space-y-2">
              {topicRequests.length > 0 ? (
                topicRequests.map((r) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-4 shadow-sm"
                    key={r.id}
                  >
                    <span className="font-semibold text-foreground">{r.topicText}</span>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                        {r.requestCount} Requests
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          STATUS_STYLES[r.status] ?? STATUS_STYLES.dismissed
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground p-2">No logged topic requests.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CURRICULUM ARTIFACTS */}
      {activeTab === "artifacts" && (
        <ArtifactManager />
      )}

      {/* TAB 2: CURRICULUM CMS & DB VIEWER */}
      {activeTab === "cms" && (
        <div className="space-y-10 animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* CMS Creation Panel Control Forms (LEFT COLUMN) */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-xl font-bold text-foreground">✍️ Database CMS Creators</h2>
            <p className="text-xs text-muted-foreground -mt-4">
              Write verified records straight to PostgreSQL tables. Select your parent relationships to enforce schemas.
            </p>

            {/* Selector buttons for form drawers */}
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                  activeForm === "mission"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/40"
                    : "bg-card border-border/40 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveForm(activeForm === "mission" ? "none" : "mission")}
                type="button"
              >
                🎯 Add Mission
              </button>
              <button
                className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                  activeForm === "lesson"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/40"
                    : "bg-card border-border/40 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveForm(activeForm === "lesson" ? "none" : "lesson")}
                type="button"
              >
                📖 Add Lesson
              </button>
              <button
                className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                  activeForm === "card"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/40"
                    : "bg-card border-border/40 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveForm(activeForm === "card" ? "none" : "card")}
                type="button"
              >
                🧠 Add Concept Card
              </button>
              <button
                className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                  activeForm === "archetype"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/40"
                    : "bg-card border-border/40 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveForm(activeForm === "archetype" ? "none" : "archetype")}
                type="button"
              >
                📝 Add Archetype
              </button>
            </div>

            {/* FORM 1: CREATE MISSION */}
            {activeForm === "mission" && (
              <form onSubmit={handleMissionSubmit} className="bg-card border border-border/40 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-amber-500">🎯 Create New Mission</h3>
                <div>
                  <label className="block text-xs font-semibold mb-1">Title (Required)</label>
                  <input
                    type="text"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Ratio and Proportion"
                    value={missionForm.title}
                    onChange={(e) => handleMissionTitleChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Database Slug (Required, Auto)</label>
                  <input
                    type="text"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    placeholder="e.g. ratio-proportion"
                    value={missionForm.slug}
                    onChange={(e) => setMissionForm({ ...missionForm, slug: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Description (Required)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    placeholder="A descriptive intro summarizing objectives..."
                    value={missionForm.description}
                    onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Year Group</label>
                    <select
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={missionForm.yearGroup}
                      onChange={(e) => setMissionForm({ ...missionForm, yearGroup: e.target.value })}
                    >
                      <option value="8">Year 8</option>
                      <option value="9">Year 9</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Subject</label>
                    <select
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={missionForm.subject}
                      onChange={(e) => setMissionForm({ ...missionForm, subject: e.target.value })}
                    >
                      <option value="maths">GCSE Maths</option>
                      <option value="science">GCSE Science</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">GCSE Domain</label>
                    <input
                      type="text"
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      placeholder="e.g. Ratio, Proportion"
                      value={missionForm.gcseDomain}
                      onChange={(e) => setMissionForm({ ...missionForm, gcseDomain: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Sequence Order</label>
                    <input
                      type="number"
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={missionForm.order}
                      onChange={(e) => setMissionForm({ ...missionForm, order: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Estimated Minutes</label>
                  <input
                    type="number"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    value={missionForm.estimatedMinutes}
                    onChange={(e) => setMissionForm({ ...missionForm, estimatedMinutes: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl font-bold bg-amber-500 text-white hover:brightness-105 transition-all text-sm shadow-md"
                >
                  Save Mission 🚀
                </button>
              </form>
            )}

            {/* FORM 2: CREATE LESSON */}
            {activeForm === "lesson" && (
              <form onSubmit={handleLessonSubmit} className="bg-card border border-border/40 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-amber-500">📖 Create New Lesson</h3>
                <div>
                  <label className="block text-xs font-semibold mb-1">Parent Mission (Required)</label>
                  <select
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    value={lessonForm.missionId}
                    onChange={(e) => setLessonForm({ ...lessonForm, missionId: e.target.value })}
                  >
                    <option value="">-- Select Mission --</option>
                    {missions.map((m) => (
                      <option key={m.id} value={m.id}>
                        [Y{m.yearGroup}] {m.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Title (Required)</label>
                  <input
                    type="text"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Simplifying Ratio"
                    value={lessonForm.title}
                    onChange={(e) => handleLessonTitleChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Slug (Required, Auto)</label>
                  <input
                    type="text"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    placeholder="e.g. simplifying-ratio"
                    value={lessonForm.slug}
                    onChange={(e) => setLessonForm({ ...lessonForm, slug: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Summary (Required)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    placeholder="A brief explanation summary..."
                    value={lessonForm.summary}
                    onChange={(e) => setLessonForm({ ...lessonForm, summary: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Difficulty Band</label>
                    <select
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={lessonForm.difficultyBand}
                      onChange={(e) => setLessonForm({ ...lessonForm, difficultyBand: e.target.value as any })}
                    >
                      <option value="foundation">Foundation</option>
                      <option value="core">Core</option>
                      <option value="stretch">Stretch</option>
                      <option value="gcse_bridge">GCSE Bridge</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Order</label>
                    <input
                      type="number"
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={lessonForm.order}
                      onChange={(e) => setLessonForm({ ...lessonForm, order: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Estimated Minutes</label>
                  <input
                    type="number"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    value={lessonForm.estimatedMinutes}
                    onChange={(e) => setLessonForm({ ...lessonForm, estimatedMinutes: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl font-bold bg-amber-500 text-white hover:brightness-105 transition-all text-sm shadow-md"
                >
                  Save Lesson 📖
                </button>
              </form>
            )}

            {/* FORM 3: CREATE CONCEPT CARD */}
            {activeForm === "card" && (
              <form onSubmit={handleCardSubmit} className="bg-card border border-border/40 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-amber-500">🧠 Create Concept Card</h3>
                <div>
                  <label className="block text-xs font-semibold mb-1">Parent Lesson (Required)</label>
                  <select
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    value={cardForm.lessonId}
                    onChange={(e) => setCardForm({ ...cardForm, lessonId: e.target.value })}
                  >
                    <option value="">-- Select Lesson --</option>
                    {lessons.map((l) => {
                      const parentMission = missions.find((m) => m.id === l.missionId);
                      return (
                        <option key={l.id} value={l.id}>
                          {parentMission ? `[${parentMission.title}] ` : ""}{l.title}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold mb-1">Card Title (Required)</label>
                    <input
                      type="text"
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      placeholder="e.g. Ratio Simplification"
                      value={cardForm.title}
                      onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Order</label>
                    <input
                      type="number"
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={cardForm.order}
                      onChange={(e) => setCardForm({ ...cardForm, order: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Core Lesson Body (Required, Markdown support)</label>
                  <textarea
                    rows={4}
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500 font-mono text-xs"
                    placeholder="Explain the mathematical concept clearly here..."
                    value={cardForm.body}
                    onChange={(e) => setCardForm({ ...cardForm, body: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Visual Diagram Representation (Optional)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500 font-mono text-xs"
                    placeholder="e.g. [=== 2 ===][====== 5 ======]"
                    value={cardForm.visual}
                    onChange={(e) => setCardForm({ ...cardForm, visual: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Worked Example (Optional)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500 text-xs"
                    placeholder="e.g. Simplify 4:10 -> Divide both by 2 -> 2:5"
                    value={cardForm.example}
                    onChange={(e) => setCardForm({ ...cardForm, example: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Common Misconception Tip (Optional)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500 text-xs text-orange-400"
                    placeholder="Explain what slip-ups are common on this topic..."
                    value={cardForm.misconception}
                    onChange={(e) => setCardForm({ ...cardForm, misconception: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl font-bold bg-amber-500 text-white hover:brightness-105 transition-all text-sm shadow-md"
                >
                  Save Concept Card 🧠
                </button>
              </form>
            )}

            {/* FORM 4: CREATE QUESTION ARCHETYPE */}
            {activeForm === "archetype" && (
              <form onSubmit={handleArchetypeSubmit} className="bg-card border border-border/40 rounded-2xl p-5 space-y-4 shadow-sm max-h-[80vh] overflow-y-auto">
                <h3 className="font-bold text-sm text-amber-500">📝 Create Question Archetype</h3>
                
                {/* Linked Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Target Mission (Slug)</label>
                    <select
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={archetypeForm.missionSlug}
                      onChange={(e) => handleArchetypeMissionSelect(e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {missions.map((m) => (
                        <option key={m.id} value={m.slug}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Target Lesson (Slug)</label>
                    <select
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={archetypeForm.lessonSlug}
                      onChange={(e) => setArchetypeForm({ ...archetypeForm, lessonSlug: e.target.value })}
                      disabled={!archetypeForm.missionSlug}
                    >
                      <option value="">-- Select --</option>
                      {filteredLessonsForArchetype.map((l) => (
                        <option key={l.id} value={l.slug}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Unique Slug (Required)</label>
                    <input
                      type="text"
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      placeholder="e.g. ratio_simplify_easy_1"
                      value={archetypeForm.slug}
                      onChange={(e) => setArchetypeForm({ ...archetypeForm, slug: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Skill Slug (Required)</label>
                    <input
                      type="text"
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      placeholder="e.g. ratio_simplify"
                      value={archetypeForm.skillSlug}
                      onChange={(e) => setArchetypeForm({ ...archetypeForm, skillSlug: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Year Group</label>
                    <select
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={archetypeForm.yearGroup}
                      onChange={(e) => setArchetypeForm({ ...archetypeForm, yearGroup: e.target.value })}
                    >
                      <option value="8">Year 8</option>
                      <option value="9">Year 9</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Subject</label>
                    <select
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={archetypeForm.subject}
                      onChange={(e) => setArchetypeForm({ ...archetypeForm, subject: e.target.value })}
                    >
                      <option value="maths">GCSE Maths</option>
                      <option value="science">GCSE Science</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Difficulty Band</label>
                    <select
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={archetypeForm.difficultyBand}
                      onChange={(e) => setArchetypeForm({ ...archetypeForm, difficultyBand: e.target.value as any })}
                    >
                      <option value="must">Must (Fluency)</option>
                      <option value="should">Should (Secure)</option>
                      <option value="could">Could (Stretch)</option>
                      <option value="gcse_bridge">GCSE Bridge</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Question Type</label>
                    <select
                      className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                      value={archetypeForm.questionType}
                      onChange={(e) => setArchetypeForm({ ...archetypeForm, questionType: e.target.value as any })}
                    >
                      <option value="short_text">Short Text</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="numeric">Numeric</option>
                      <option value="algebraic">Algebraic</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">GCSE Domain</label>
                  <input
                    type="text"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Ratio, Proportion"
                    value={archetypeForm.gcseDomain}
                    onChange={(e) => setArchetypeForm({ ...archetypeForm, gcseDomain: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Question Template (Required)</label>
                  <input
                    type="text"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500 font-serif"
                    placeholder="e.g. Express {a}:{b} in its simplest form."
                    value={archetypeForm.template}
                    onChange={(e) => setArchetypeForm({ ...archetypeForm, template: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Variable Schema JSON (Required)</label>
                  <textarea
                    rows={3}
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                    value={archetypeForm.variableSchemaJson}
                    onChange={(e) => setArchetypeForm({ ...archetypeForm, variableSchemaJson: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Answer Evaluator Expression (Required)</label>
                  <input
                    type="text"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500 font-mono text-xs"
                    placeholder="JS expression, e.g. `${a/gcd}:${b/gcd}`"
                    value={archetypeForm.answerExpression}
                    onChange={(e) => setArchetypeForm({ ...archetypeForm, answerExpression: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Acceptable Rules JSON (Required)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                    value={archetypeForm.acceptableAnswerRulesJson}
                    onChange={(e) => setArchetypeForm({ ...archetypeForm, acceptableAnswerRulesJson: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Socratic Hint Template (Optional)</label>
                  <input
                    type="text"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Find the highest common factor of {a} and {b}."
                    value={archetypeForm.hintTemplate}
                    onChange={(e) => setArchetypeForm({ ...archetypeForm, hintTemplate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Explanation Worked Template (Optional)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500 text-xs"
                    placeholder="Worked solution steps showing calculations..."
                    value={archetypeForm.explanationTemplate}
                    onChange={(e) => setArchetypeForm({ ...archetypeForm, explanationTemplate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Misconception Tags JSON (Optional)</label>
                  <input
                    type="text"
                    className="w-full bg-muted border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                    value={archetypeForm.misconceptionTagsJson}
                    onChange={(e) => setArchetypeForm({ ...archetypeForm, misconceptionTagsJson: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="calc"
                    className="rounded bg-muted border border-border/40 focus:ring-amber-500 text-amber-500 h-4 w-4"
                    checked={archetypeForm.calculatorAllowed}
                    onChange={(e) => setArchetypeForm({ ...archetypeForm, calculatorAllowed: e.target.checked })}
                  />
                  <label htmlFor="calc" className="text-xs font-semibold select-none cursor-pointer">
                    Calculator Permitted for Answer
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl font-bold bg-amber-500 text-white hover:brightness-105 transition-all text-sm shadow-md"
                >
                  Save Question Archetype ⚡
                </button>
              </form>
            )}
          </div>

          {/* Collapsible Database Tree Viewer (RIGHT COLUMN) */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-xl font-bold text-foreground">🔍 Live Database Viewer</h2>
            <p className="text-xs text-muted-foreground -mt-2 mb-4">
              Explore the structured database collections live. Expand Topics to view child Lessons, Concept Cards, and linked Question Archetypes.
            </p>

            {/* Tree hierarchy */}
            <div className="space-y-3 max-h-[120vh] overflow-y-auto pr-2">
              {missions.length > 0 ? (
                missions.map((m) => {
                  const isMissionExpanded = !!expandedMissions[m.id];
                  const missionLessons = lessons.filter((l) => l.missionId === m.id).sort((a, b) => a.order - b.order);

                  return (
                    <div className="bg-card/40 border border-border/30 rounded-2xl overflow-hidden shadow-sm" key={m.id}>
                      {/* Topic (Mission) Header Node */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-card/70 transition-colors select-none"
                        onClick={() => toggleMissionTree(m.id)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                              Y{m.yearGroup}
                            </span>
                            <h3 className="font-bold text-foreground truncate text-sm sm:text-base">{m.title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm sm:max-w-md">
                            {m.description}
                          </p>
                        </div>
                        <span className="text-muted-foreground font-mono text-sm shrink-0">
                          {isMissionExpanded ? "▲" : "▼"}
                        </span>
                      </div>

                      {/* Expanded Mission Lessons Sub-Tree */}
                      {isMissionExpanded && (
                        <div className="border-t border-border/30 bg-card/10 p-4 space-y-3">
                          <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">
                            📖 Lessons ({missionLessons.length})
                          </p>
                          {missionLessons.length > 0 ? (
                            missionLessons.map((l) => {
                              const isLessonExpanded = !!expandedLessons[l.id];
                              const lessonCards = conceptCards.filter((c) => c.lessonId === l.id).sort((a, b) => a.order - b.order);
                              const lessonArchetypes = questionArchetypes.filter(
                                (q) => q.missionSlug === m.slug && q.lessonSlug === l.slug
                              );

                              return (
                                <div className="bg-background/50 border border-border/20 rounded-xl overflow-hidden" key={l.id}>
                                  {/* Lesson Header Node */}
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-background/80 transition-all select-none"
                                    onClick={() => toggleLessonTree(l.id)}
                                  >
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                                        <span className="text-[9px] font-mono text-muted-foreground">#{l.order}</span>
                                        {l.title}
                                      </h4>
                                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs sm:max-w-md">
                                        {l.summary}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[9px] uppercase font-bold text-amber-500 bg-amber-500/10 rounded px-1.5 py-0.5">
                                        {l.difficultyBand}
                                      </span>
                                      <span className="text-muted-foreground font-mono text-xs">
                                        {isLessonExpanded ? "▲" : "▼"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Expanded Lesson Children: Concept Cards and Question Templates */}
                                  {isLessonExpanded && (
                                    <div className="p-3 border-t border-border/15 bg-background/20 space-y-4">
                                      {/* Concept Cards leaf */}
                                      <div className="space-y-1.5">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                          🧠 Concept Cards ({lessonCards.length})
                                        </p>
                                        {lessonCards.length > 0 ? (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {lessonCards.map((c) => (
                                              <div className="p-2.5 bg-card border border-border/20 rounded-lg text-xs" key={c.id}>
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="font-bold text-foreground truncate pr-2">{c.title}</span>
                                                  <span className="text-[9px] font-mono text-muted-foreground shrink-0">Order: {c.order}</span>
                                                </div>
                                                <p className="text-muted-foreground text-[10px] line-clamp-2">{c.body}</p>
                                                {c.example && (
                                                  <p className="text-[9px] text-green-400 font-mono mt-1 truncate">
                                                    Ex: {c.example}
                                                  </p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-[10px] text-muted-foreground italic p-1">No concept cards drafted.</p>
                                        )}
                                      </div>

                                      {/* Question Archetypes leaf */}
                                      <div className="space-y-1.5">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                          ⚡ Question Templates ({lessonArchetypes.length})
                                        </p>
                                        {lessonArchetypes.length > 0 ? (
                                          <div className="space-y-1.5">
                                            {lessonArchetypes.map((q) => (
                                              <div className="p-2.5 bg-card/60 border border-border/20 rounded-lg text-xs font-mono" key={q.id}>
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="font-bold text-amber-500 truncate pr-2 text-[10px]">{q.slug}</span>
                                                  <span className="text-[8px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                                    {q.difficultyBand}
                                                  </span>
                                                </div>
                                                <p className="text-foreground font-serif text-[11px] mb-1">{q.template}</p>
                                                <div className="text-[9px] text-muted-foreground space-y-0.5 leading-normal">
                                                  <p><span className="text-amber-500/70">Skill:</span> {q.skillSlug}</p>
                                                  <p><span className="text-amber-500/70">Vars:</span> {JSON.stringify(q.variableSchemaJson)}</p>
                                                  <p><span className="text-amber-500/70">Eval:</span> {q.answerExpression}</p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-[10px] text-muted-foreground italic p-1">No question archetypes linked.</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-muted-foreground italic p-2">No lessons added for this topic.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground p-4 text-center">No missions in the database.</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ---- Artifact Manager Component ----
function ArtifactManager() {
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<{
    status: string;
    type: string;
  }>({ status: "", type: "" });
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [genForm, setGenForm] = useState({
    subject: "",
    yearGroup: "8",
    examBoard: "AQA",
  });
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{
    artifacts: number;
    errors: string[];
  } | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<
    Record<string, { valid: boolean; issues: { field: string; severity: string; message: string }[]; summary: string }>
  >({});
  const [insightForm, setInsightForm] = useState({ studentId: "" });
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [insightResult, setInsightResult] = useState<{
    report: { summaryText: string; startOfWeek: string; endOfWeek: string };
    insight: { strengths: string[]; weaknesses: string[]; revisionPriorities: string[]; confidenceTrend: string };
  } | null>(null);
  const [quizForm, setQuizForm] = useState({
    subject: "",
    yearGroup: "8",
    examBoard: "AQA",
    title: "",
    numQuestions: "10",
  });
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    quiz: { title: string; description: string; totalQuestions: number; durationMinutes: number; sections: { skillSlug: string; skillName: string; difficultyBand: string; questionCount: number }[] } | null;
    artifacts: number;
    errors: string[];
  } | null>(null);

  const fetchArtifacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.type) params.set("artifactType", filter.type);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/artifacts?${params.toString()}`);
      const data = await res.json();
      setArtifacts(data.artifacts ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setArtifacts([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  const updateStatus = async (id: string, status: string) => {
    setActionMsg("");
    try {
      const res = await fetch("/api/admin/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-status", artifactId: id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg(`Error: ${data.error}`);
        return;
      }
      setActionMsg(`Updated to ${status}`);
      fetchArtifacts();
    } catch (err) {
      setActionMsg(`Error: ${(err as Error).message}`);
    }
  };

  const validateArtifact = async (id: string) => {
    setValidatingId(id);
    try {
      const res = await fetch("/api/admin/agents/artifact-validator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate-one", artifactId: id }),
      });
      const data = await res.json();
      setValidationResults((prev) => ({
        ...prev,
        [id]: data.result,
      }));
    } catch (err) {
      setValidationResults((prev) => ({
        ...prev,
        [id]: {
          valid: false,
          issues: [{ field: "network", severity: "error", message: (err as Error).message }],
          summary: "Network error",
        },
      }));
    } finally {
      setValidatingId(null);
    }
  };

  const generateCurriculum = async () => {
    if (!genForm.subject) {
      setActionMsg("Please enter a subject");
      return;
    }
    setGenerating(true);
    setGenResult(null);
    setActionMsg("Generating curriculum...");
    try {
      const res = await fetch("/api/admin/agents/curriculum-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genForm),
      });
      const data = await res.json();
      setGenResult(data);
      if (data.errors?.length > 0) {
        setActionMsg(
          `Generated ${data.artifacts} artifacts with ${data.errors.length} errors`
        );
      } else {
        setActionMsg(
          `✅ Generated ${data.artifacts} artifacts successfully!`
        );
      }
      fetchArtifacts();
    } catch (err) {
      setActionMsg(`Error: ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const types = [
    "", "mission", "lesson", "concept_card", "skill",
    "question_archetype", "quiz", "subject_map", "topic_map",
  ];
  const statuses = ["", "draft", "approved", "rejected"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">🏺 Curriculum Artifacts ({total})</h2>
        <p className="text-sm text-muted-foreground mb-4">
          View, approve, or reject generated curriculum artifacts.
        </p>
      </div>

      {/* Curriculum Generator */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">🤖 Curriculum Builder Agent</p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Subject</label>
            <input
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs w-32"
              placeholder="e.g. Geography"
              value={genForm.subject}
              onChange={(e) => setGenForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Year</label>
            <select
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
              value={genForm.yearGroup}
              onChange={(e) => setGenForm((f) => ({ ...f, yearGroup: e.target.value }))}
            >
              <option value="8">Year 8</option>
              <option value="9">Year 9</option>
              <option value="10">Year 10</option>
              <option value="11">Year 11</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Exam Board</label>
            <input
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs w-24"
              placeholder="AQA"
              value={genForm.examBoard}
              onChange={(e) => setGenForm((f) => ({ ...f, examBoard: e.target.value }))}
            />
          </div>
          <button
            className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-violet-500/15 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            onClick={generateCurriculum}
            disabled={generating}
            type="button"
          >
            {generating ? "Generating..." : "Generate Curriculum"}
          </button>
        </div>
        {genResult && genResult.errors.length > 0 && (
          <div className="text-[10px] text-red-400 space-y-1">
            {genResult.errors.map((e, i) => (
              <p key={i}>⚠ {e}</p>
            ))}
          </div>
        )}
      </div>

      {/* Guardian Insight Agent */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">🛡️ Guardian Insight Agent</p>
        <p className="text-[10px] text-muted-foreground">
          Generate a weekly parent summary for any student (mastery, weaknesses, revision priorities, confidence trend).
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Student ID</label>
            <input
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs w-48"
              placeholder="e.g. stu_abc123"
              value={insightForm.studentId}
              onChange={(e) =>
                setInsightForm((f) => ({ ...f, studentId: e.target.value }))
              }
            />
          </div>
          <button
            className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-500/15 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            onClick={async () => {
              if (!insightForm.studentId) {
                setActionMsg("Please enter a student ID");
                return;
              }
              setGeneratingInsight(true);
              setInsightResult(null);
              setActionMsg("Generating insight...");
              try {
                const res = await fetch(
                  "/api/admin/agents/guardian-insight",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      studentId: insightForm.studentId,
                    }),
                  }
                );
                const data = await res.json();
                if (!res.ok) {
                  setActionMsg(`Error: ${data.error}`);
                } else {
                  setInsightResult(data);
                  setActionMsg("✅ Insight generated successfully!");
                  setInsightForm({ studentId: "" });
                }
              } catch (err) {
                setActionMsg(`Error: ${(err as Error).message}`);
              } finally {
                setGeneratingInsight(false);
              }
            }}
            disabled={generatingInsight}
            type="button"
          >
            {generatingInsight ? "Generating..." : "Generate Insight Report"}
          </button>
        </div>
        {insightResult && (
          <div className="space-y-2 text-xs">
            <p className="text-emerald-400 font-semibold">✅ Insight Generated</p>
            <p className="text-foreground">{insightResult.report.summaryText}</p>
            <div className="flex gap-4 flex-wrap text-[10px] text-muted-foreground">
              <span>💪 Strong: {insightResult.insight.strengths.join(", ")}</span>
              <span>🎯 Weak: {insightResult.insight.weaknesses.join(", ")}</span>
              <span>📋 Priority: {insightResult.insight.revisionPriorities.join(", ")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quiz Builder Agent */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">📝 Quiz Builder Agent</p>
        <p className="text-[10px] text-muted-foreground">
          Assemble a quiz from approved question archetypes. Selects questions by skill and difficulty, creates a draft
          quiz artifact.
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Subject</label>
            <input
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs w-24"
              placeholder="Maths"
              value={quizForm.subject}
              onChange={(e) => setQuizForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Year</label>
            <select
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
              value={quizForm.yearGroup}
              onChange={(e) => setQuizForm((f) => ({ ...f, yearGroup: e.target.value }))}
            >
              <option value="8">Year 8</option>
              <option value="9">Year 9</option>
              <option value="10">Year 10</option>
              <option value="11">Year 11</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Board</label>
            <input
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs w-16"
              placeholder="AQA"
              value={quizForm.examBoard}
              onChange={(e) => setQuizForm((f) => ({ ...f, examBoard: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Title</label>
            <input
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs w-40"
              placeholder="e.g. Algebra Basics Quiz"
              value={quizForm.title}
              onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Questions</label>
            <input
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs w-12"
              type="number"
              min={1}
              max={50}
              value={quizForm.numQuestions}
              onChange={(e) => setQuizForm((f) => ({ ...f, numQuestions: e.target.value }))}
            />
          </div>
          <button
            className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-amber-500/15 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            onClick={async () => {
              if (!quizForm.subject) {
                setActionMsg("Please enter a subject");
                return;
              }
              setGeneratingQuiz(true);
              setQuizResult(null);
              setActionMsg("Building quiz...");
              try {
                const res = await fetch("/api/admin/agents/quiz-builder", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(quizForm),
                });
                const data = await res.json();
                if (!res.ok) {
                  setActionMsg(`Error: ${data.error}`);
                } else if (data.errors?.length > 0) {
                  setQuizResult(data);
                  setActionMsg(`Quiz built with ${data.errors.length} warnings`);
                } else {
                  setQuizResult(data);
                  setActionMsg(
                    `✅ Quiz "${data.quiz.title}" created (${data.quiz.totalQuestions} questions, ${data.quiz.sections.length} sections)`
                  );
                }
              } catch (err) {
                setActionMsg(`Error: ${(err as Error).message}`);
              } finally {
                setGeneratingQuiz(false);
              }
            }}
            disabled={generatingQuiz}
            type="button"
          >
            {generatingQuiz ? "Building..." : "Build Quiz"}
          </button>
        </div>
        {quizResult && (
          <div className="space-y-2 text-xs">
            {quizResult.errors.length > 0 && (
              <div className="text-red-400 space-y-1">
                {quizResult.errors.map((e, i) => (
                  <p key={i}>⚠ {e}</p>
                ))}
              </div>
            )}
            {quizResult.quiz && (
              <div className="space-y-1">
                <p className="text-amber-400 font-semibold">
                  ✅ {quizResult.quiz.title}
                </p>
                <p className="text-muted-foreground">{quizResult.quiz.description}</p>
                <p className="text-muted-foreground">
                  {quizResult.quiz.totalQuestions} questions · {quizResult.quiz.durationMinutes} min ·{" "}
                  {quizResult.quiz.sections.length} sections
                </p>
                <div className="flex gap-2 flex-wrap">
                  {quizResult.quiz.sections.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400"
                    >
                      {s.skillName} ({s.difficultyBand}) ×{s.questionCount}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {actionMsg && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm text-amber-600 dark:text-amber-400">
          {actionMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <select
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
          value={filter.type}
          onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t || "All Types"}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s || "All Statuses"}
            </option>
          ))}
        </select>
        <button
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 transition-colors"
          onClick={fetchArtifacts}
          type="button"
        >
          Refresh
        </button>
      </div>

      {/* Artifact List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : artifacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No artifacts found.</p>
      ) : (
        <div className="grid gap-3">
          {artifacts.map((a: any) => (
            <div
              key={a.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {a.topic}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {a.artifactType} &middot; {a.subject} Y{a.yearGroup} &middot; v{a.version}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    a.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : a.status === "rejected"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {a.status}
                </span>
              </div>

              {validationResults[a.id] && (
                <div
                  className={`rounded-lg p-2 text-[10px] ${
                    validationResults[a.id].valid
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  <p className="font-semibold">{validationResults[a.id].summary}</p>
                  {validationResults[a.id].issues.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {validationResults[a.id].issues.map((issue, i) => (
                        <li key={i}>
                          {issue.severity === "error" ? "🔴" : "🟡"} {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {a.status !== "approved" && (
                <div className="flex gap-2 pt-1 flex-wrap">
                  <button
                    className="rounded-lg bg-cyan-500/15 px-3 py-1 text-[10px] font-bold text-cyan-500 hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
                    onClick={() => validateArtifact(a.id)}
                    disabled={validatingId === a.id}
                    type="button"
                  >
                    {validatingId === a.id ? "Validating..." : "Validate"}
                  </button>
                  <button
                    className="rounded-lg bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/25 transition-colors"
                    onClick={() => updateStatus(a.id, "approved")}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-lg bg-red-500/15 px-3 py-1 text-[10px] font-bold text-red-500 hover:bg-red-500/25 transition-colors"
                    onClick={() => updateStatus(a.id, "rejected")}
                    type="button"
                  >
                    Reject
                  </button>
                  <button
                    className="rounded-lg bg-white/10 px-3 py-1 text-[10px] font-bold text-muted-foreground hover:bg-white/15 transition-colors"
                    onClick={() => updateStatus(a.id, "draft")}
                    type="button"
                  >
                    Reset to Draft
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}