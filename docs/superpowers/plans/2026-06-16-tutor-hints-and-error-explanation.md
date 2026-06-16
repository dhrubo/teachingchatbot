# Tutor Socratic Hints and Error Explanation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide students with real-time, socratic AI hints and error explanations during GCSE adaptive challenges with persistent database tracking of common misconceptions.

**Architecture:** Create two lightweight API routes that retrieve the active student profile context and leverage the fallback provider candidates for LLM generation. Record and increment student misconceptions inside the PostgreSQL database, and enrich the frontend `ChallengeMode` with sunset-themed interactive assistance.

**Tech Stack:** Next.js App Router API, Vercel AI SDK, Drizzle ORM, Tailwind CSS, Framer Motion

---

### Task 1: Add Misconception Query to Database Queries

**Files:**
- Modify: `lib/db/queries/student.ts` (Implement `recordStudentMisconception` function)
- Modify: `lib/db/queries/index.ts` (Export the new query function)

- [ ] **Step 1: Inspect and modify `lib/db/queries/student.ts`**
  Add the `recordStudentMisconception` function with clean error handling and `studentMisconception` imports.
  ```typescript
  // Import studentMisconception from schema
  import { studentMisconception } from "../schema";

  export async function recordStudentMisconception({
    studentId,
    skillSlug,
    misconception,
  }: {
    studentId: string;
    skillSlug: string;
    misconception: string;
  }): Promise<void> {
    try {
      const [existing] = await db
        .select()
        .from(studentMisconception)
        .where(
          and(
            eq(studentMisconception.studentId, studentId),
            eq(studentMisconception.skillSlug, skillSlug),
            eq(studentMisconception.misconception, misconception)
          )
        );

      if (existing) {
        await db
          .update(studentMisconception)
          .set({
            count: existing.count + 1,
            lastSeenAt: new Date(),
          })
          .where(eq(studentMisconception.id, existing.id));
      } else {
        await db
          .insert(studentMisconception)
          .values({
            studentId,
            skillSlug,
            misconception,
            count: 1,
            lastSeenAt: new Date(),
          });
      }
    } catch (_error) {
      throw new ChatbotError(
        "bad_request:database",
        "Failed to record student misconception"
      );
    }
  }
  ```

- [ ] **Step 2: Export `recordStudentMisconception` from `lib/db/queries/index.ts`**
  Ensure it is re-exported from the queries index.
  ```typescript
  // In lib/db/queries/index.ts
  export {
    // ... other exports ...
    recordStudentMisconception,
  } from "./student";
  ```

- [ ] **Step 3: Run typescript compiler to verify types compile**
  Run: `npx tsc --noEmit`
  Expected: PASS

---

### Task 2: Update AI Telemetry Reasons

**Files:**
- Modify: `lib/ai/stream-with-provider-fallback.ts` (Add `"hint"` and `"explanation"` to `REASONS` enum)

- [ ] **Step 1: Add reasons to the `REASONS` const array**
  Open `lib/ai/stream-with-provider-fallback.ts` and modify `REASONS` array.
  ```typescript
  const REASONS = [
    "lesson_bundle",
    "reteach",
    "open_answer_grading",
    "parent_report",
    "summary",
    "fallback_quota",
    "hint",
    "explanation",
  ] as const;
  ```

- [ ] **Step 2: Verify compiling**
  Run: `npx tsc --noEmit`
  Expected: PASS

---

### Task 3: Create AI Hint Endpoint

**Files:**
- Create: `app/api/ai/hint/route.ts` (Socratic hint generation)

- [ ] **Step 1: Create `/app/api/ai/hint/route.ts`**
  Write the API route verifying user authentication, loading candidate providers, streaming text with fallback, logging metrics on end, and returning JSON.
  ```typescript
  import { type NextRequest, NextResponse } from "next/server";
  import { auth } from "@/app/(auth)/auth";
  import { getStudentProfile } from "@/lib/db/queries/student";
  import { getTutorProviderCandidates, getApprovalStatus } from "@/lib/db/queries/index"; // Wait! getTutorProviderCandidates is from lib/ai/providers
  import { getTutorProviderCandidates as getCandidates } from "@/lib/ai/providers";
  import { getApprovalStatus as getApproval } from "@/lib/db/queries/admin";
  import { cookies } from "next/headers";
  import { streamTextWithFallback } from "@/lib/ai/stream-with-provider-fallback";
  import { logAICall } from "@/lib/db/queries/analytics";

  export async function POST(req: NextRequest) {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const { questionPrompt, studentAnswer, skillSlug } = body as {
        questionPrompt?: string;
        studentAnswer?: string;
        skillSlug?: string;
      };

      if (!questionPrompt) {
        return NextResponse.json({ error: "questionPrompt is required" }, { status: 400 });
      }

      const userType = session.user.type;
      const cookieStore = await cookies();
      const activeStudentId = cookieStore.get("active_student_id")?.value;

      const [studentProfile, approvalStatus] = await Promise.all([
        getStudentProfile(session.user.id, activeStudentId),
        userType === "guest" ? Promise.resolve(null) : getApproval(session.user.id),
      ]);

      const isPremiumUser = userType !== "guest" && approvalStatus === "approved";
      const candidates = getCandidates(isPremiumUser);

      const promptContext = `Question: ${questionPrompt}${studentAnswer ? `\nStudent's Answer so far: ${studentAnswer}` : ""}${skillSlug ? `\nSkill: ${skillSlug}` : ""}`;

      const { result, model } = await streamTextWithFallback(
        candidates,
        {
          system: "You are SARA, an encouraging GCSE tutor. Provide a highly concise, warm, supportive, Socratic hint for the following question. Do NOT solve the question or reveal the final answer. Give the student a clue or ask a guidance question. Keep it under 2 sentences.",
          prompt: promptContext,
        },
        undefined,
        "hint"
      );

      const { text, usage } = await result;

      // Log AI call metrics
      await logAICall({
        studentId: studentProfile?.id ?? null,
        purpose: "hint",
        modelUsed: model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
      });

      return NextResponse.json({ hint: text });
    } catch (error) {
      console.error("[api/ai/hint] error:", error);
      return NextResponse.json({ error: "Failed to generate hint" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: Verify compilation**
  Run: `npx tsc --noEmit`
  Expected: PASS

---

### Task 4: Create AI Error Explanation Endpoint

**Files:**
- Create: `app/api/ai/explain-error/route.ts` (Socratic misconception analysis & correction)

- [ ] **Step 1: Create `/app/api/ai/explain-error/route.ts`**
  Write the error explanation endpoint checking user auth, running a fallback loop over provider candidates with `generateObject` and schema validation via Zod, logging analytics, recording misconceptions in the DB, and returning structured JSON.
  ```typescript
  import { type NextRequest, NextResponse } from "next/server";
  import { z } from "zod";
  import { generateObject } from "ai";
  import { auth } from "@/app/(auth)/auth";
  import { getStudentProfile, recordStudentMisconception } from "@/lib/db/queries/student";
  import { getTutorProviderCandidates } from "@/lib/ai/providers";
  import { getApprovalStatus } from "@/lib/db/queries/admin";
  import { cookies } from "next/headers";
  import { isQuotaError } from "@/lib/ai/providers";
  import { logAICall } from "@/lib/db/queries/analytics";

  const explainSchema = z.object({
    misconception: z.string().describe("a very short label describing the error pattern (e.g., 'Sign Error', 'Inverse Op Mistake', 'Arithmetic Slip')"),
    feedback: z.string().describe("a warm, kid-friendly, encouraging Socratic correction targeting this error (max 2 sentences)"),
    confidence: z.number().describe("a float between 0 and 1 representing model confidence"),
  });

  export async function POST(req: NextRequest) {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const { questionPrompt, studentAnswer, correctAnswer, explanation, skillSlug } = body as {
        questionPrompt?: string;
        studentAnswer?: string;
        correctAnswer?: string;
        explanation?: string;
        skillSlug?: string;
      };

      if (!questionPrompt || !studentAnswer || !correctAnswer) {
        return NextResponse.json({ error: "questionPrompt, studentAnswer and correctAnswer are required" }, { status: 400 });
      }

      const userType = session.user.type;
      const cookieStore = await cookies();
      const activeStudentId = cookieStore.get("active_student_id")?.value;

      const [studentProfile, approvalStatus] = await Promise.all([
        getStudentProfile(session.user.id, activeStudentId),
        userType === "guest" ? Promise.resolve(null) : getApprovalStatus(session.user.id),
      ]);

      const isPremiumUser = userType !== "guest" && approvalStatus === "approved";
      const candidates = getTutorProviderCandidates(isPremiumUser);

      const promptContext = `Question: ${questionPrompt}
  Student's Wrong Answer: ${studentAnswer}
  Correct Answer: ${correctAnswer}
  Worked Solution: ${explanation ?? "None available"}`;

      let objectResult = null;
      let modelUsed = "";

      for (const candidate of candidates) {
        try {
          const result = await generateObject({
            model: candidate.model,
            schema: explainSchema,
            system: "Analyze the student's wrong answer against the correct answer and worked solution. Identify the exact misconception or error they made. Be highly Socratic and encouraging in feedback.",
            prompt: promptContext,
          });
          objectResult = result;
          modelUsed = candidate.modelName;
          break;
        } catch (error) {
          if (isQuotaError(error)) {
            continue;
          }
          throw error;
        }
      }

      if (!objectResult) {
        return NextResponse.json({ error: "All AI models exhausted" }, { status: 500 });
      }

      const { misconception, feedback, confidence } = objectResult.object;

      // Log AI call
      await logAICall({
        studentId: studentProfile?.id ?? null,
        purpose: "explanation",
        modelUsed: modelUsed,
        promptTokens: objectResult.usage?.promptTokens ?? 0,
        completionTokens: objectResult.usage?.completionTokens ?? 0,
      });

      // Persist misconception if profile is valid and skillSlug exists
      if (studentProfile && skillSlug) {
        await recordStudentMisconception({
          studentId: studentProfile.id,
          skillSlug,
          misconception,
        });
      }

      return NextResponse.json({ misconception, feedback, confidence });
    } catch (error) {
      console.error("[api/ai/explain-error] error:", error);
      return NextResponse.json({ error: "Failed to explain error" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: Verify compilation**
  Run: `npx tsc --noEmit`
  Expected: PASS

---

### Task 5: Integrate Socratic Assistance in ChallengeMode

**Files:**
- Modify: `components/chat/challenge-mode.tsx` (Add SARA Hint and Why Was I Wrong interfaces)

- [ ] **Step 1: Wire hint and error explanation state and API calls**
  Inspect `components/chat/challenge-mode.tsx` and add hooks/states for hints and explanation:
  ```typescript
  // Inside ChallengeMode component
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  // Reset hint state and explanation state on question change (handleNext)
  // Add to handleNext:
  setHintText(null);
  setExplanationText(null);
  ```

- [ ] **Step 2: Implement `handleGetHint` function**
  ```typescript
  const handleGetHint = async () => {
    if (!currentQuestion || hintLoading) return;
    setHintLoading(true);
    setHintText(null);
    try {
      const response = await fetch("/api/ai/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionPrompt: currentQuestion.prompt,
          skillSlug: currentQuestion.skillSlug,
        }),
      });
      const data = await response.json();
      if (data.hint) {
        setHintText(data.hint);
      } else {
        setHintText("I can do this! Look closely at the numbers and try breaking it down step by step.");
      }
    } catch (error) {
      console.error("Failed to fetch hint", error);
      setHintText("Try reading the question carefully one more time! You've got this.");
    } finally {
      setHintLoading(false);
    }
  };
  ```

- [ ] **Step 3: Implement `handleGetExplanation` function**
  ```typescript
  const handleGetExplanation = async () => {
    if (!currentQuestion || explanationLoading) return;
    setExplanationLoading(true);
    setExplanationText(null);
    try {
      const response = await fetch("/api/ai/explain-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionPrompt: currentQuestion.prompt,
          studentAnswer: selectedAnswer || textInput,
          correctAnswer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation,
          skillSlug: currentQuestion.skillSlug,
        }),
      });
      const data = await response.json();
      if (data.feedback) {
        setExplanationText(data.feedback);
      } else {
        setExplanationText("Take another look at the steps. You're very close, keep trying!");
      }
    } catch (error) {
      console.error("Failed to fetch explanation", error);
      setExplanationText("Let's review the steps. Check if you missed any negative signs or small steps!");
    } finally {
      setExplanationLoading(false);
    }
  };
  ```

- [ ] **Step 4: Render SARA Hint UI under the question prompt card**
  Find the prompt card container and render the Hint button and the glass sunset hint display.
  ```typescript
  {/* Under the prompt card (around line 311) */}
  <div className="flex flex-col items-center gap-3 mb-6">
    {!hintText && !hintLoading && !feedback && (
      <Button
        className="rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 border border-orange-500/20 px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200"
        onClick={handleGetHint}
        size="sm"
        variant="ghost"
      >
        💡 Get SARA Hint
      </Button>
    )}

    {hintLoading && (
      <div className="w-full max-w-sm rounded-xl bg-orange-500/5 border border-orange-500/10 p-4 flex flex-col gap-2 animate-pulse">
        <div className="h-2.5 w-1/3 rounded bg-orange-400/20" />
        <div className="h-2 w-3/4 rounded bg-orange-400/20" />
        <div className="h-2 w-2/3 rounded bg-orange-400/20" />
      </div>
    )}

    {hintText && !feedback && (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 p-4 text-left shadow-lg shadow-orange-500/5"
        initial={{ opacity: 0, y: 8 }}
      >
        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block mb-1">
          💡 SARA Hint
        </span>
        <p className="text-sm text-amber-100 leading-relaxed">{hintText}</p>
      </motion.div>
    )}
  </div>
  ```

- [ ] **Step 5: Render SARA Explanation button and display inside incorrect answer block**
  Find the wrong answer container (around line 403) and render the correction.
  ```typescript
  {/* Inside the incorrect feedback block (feedback === "wrong") */}
  <div className="mt-3 pt-3 border-t border-red-500/20 flex flex-col items-center gap-3">
    {!explanationText && !explanationLoading && (
      <Button
        className="rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 px-4 py-1.5 text-xs font-semibold tracking-wide transition-all"
        onClick={handleGetExplanation}
        size="sm"
        variant="ghost"
      >
        🧐 Ask SARA: Why was I wrong?
      </Button>
    )}

    {explanationLoading && (
      <div className="w-full rounded-xl bg-red-500/5 p-4 flex flex-col gap-2 animate-pulse">
        <div className="h-2.5 w-1/4 rounded bg-red-400/20" />
        <div className="h-2 w-5/6 rounded bg-red-400/20" />
        <div className="h-2 w-2/3 rounded bg-red-400/20" />
      </div>
    )}

    {explanationText && (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl bg-red-950/20 border border-red-500/15 p-4 text-left"
        initial={{ opacity: 0, y: 6 }}
      >
        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
          🧠 SARA Correction
        </span>
        <p className="text-sm text-red-100/90 leading-relaxed">{explanationText}</p>
      </motion.div>
    )}
  </div>
  ```

- [ ] **Step 6: Reset hint/explanation on next question transition**
  Add state-clearing lines to `handleNext` function:
  ```typescript
  setHintText(null);
  setExplanationText(null);
  ```

- [ ] **Step 7: Run type checking and unit tests**
  Run: `npx tsc --noEmit && pnpm test:unit`
  Expected: PASS

---

## Execution Handoff

I have saved the implementation plan to `docs/superpowers/plans/2026-06-16-tutor-hints-and-error-explanation.md`. Please let me know if I should proceed with **Inline Execution** to perform the tasks directly, or any other approach.
