# Agent Log: Teaching Chatbot Transformation

This document tracks the changes made to transform the application into a personalized teaching chatbot for a 12-year-old student.

## Project Goal

To create a patient, encouraging, and Socratic tutor AI that exclusively covers a specific Year 8 Maths and Science curriculum.

## High-Level Plan

1.  **Phase 1: Establish Core Identity:** Create a new system prompt and a curriculum knowledge base.
2.  **Phase 2: Refocus AI Tools:** Remove irrelevant tools and add curriculum-aware tools.
3.  **Phase 3: Develop Teaching Capabilities:** Build new tools for generating practice questions and other educational interactions.

---

## Phase 1 Log: Core Identity Established

- **Status:** Completed
- **Actions Taken:**
    1.  **`agents.md`:** Created this documentation file to track progress.
    2.  **`lib/ai/curriculum.ts`:** Created a new file to serve as the curriculum knowledge base, starting with the Year 8 Maths topics.
    3.  **`lib/ai/prompts-tutor.ts`:** Created a new file containing the detailed system prompt for the "Online Tutor" persona.
    4.  **`app/(chat)/api/chat/route.ts`:** Modified the main API route to import and use the new `TUTOR_SYSTEM_PROMPT`.

The application's core AI is now operating with the new tutor persona and curriculum. The next step is to align its tools with its new purpose.

## Phase 2 Log: Tools Refocused

- **Status:** Completed
- **Actions Taken:**
    1.  **Modified `app/(chat)/api/chat/route.ts`:**
        - Removed imports for all previous tool functions (`createDocument`, `getWeather`, etc.).
        - Removed the `experimental_activeTools` property from the `streamText` call.
        - Removed the `tools` object from the `streamText` call.

The AI no longer has access to its old, non-teaching tools. This enforces the new persona and prevents it from suggesting or performing off-topic actions. It now operates as a purely conversational tutor.

## Phase 3 Log (Iteration 1): `getCurriculumTopics` Tool Implemented

- **Status:** Completed
- **Actions Taken:**
    1.  **`lib/ai/tools/get-curriculum-topics.ts`:** Created a new tool file to expose the Year 8 Maths curriculum.
    2.  **Modified `app/(chat)/api/chat/route.ts`:**
        - Imported the `getCurriculumTopics` tool.
        - Re-introduced the `experimental_activeTools` array and `tools` object within the `streamText` call, populating them with `getCurriculumTopics`.

The AI can now programmatically access the curriculum. This enables it to confirm its scope and potentially list available topics for the student.

## Phase 4 Log: Build Fixes & Stabilization

- **Status:** Completed
- **Context:** The earlier edits left `app/(chat)/api/chat/route.ts` in a non-compiling state. The following fixes were applied to get the app building and running.
- **Actions Taken:**
    1.  **`app/(chat)/api/chat/route.ts`:**
        - Removed a leftover dangling statement (`{ status: 200 });`) after the `DELETE` handler that broke parsing.
        - Added the missing `import { TUTOR_SYSTEM_PROMPT } from "@/lib/ai/prompts-tutor"`.
        - Collapsed duplicated `experimental_activeTools` / `tools` keys into a single definition and removed dangling references to the old template tools (`getWeather`, `createDocument`, `editDocument`, `updateDocument`, `requestSuggestions`).
        - The tutor now exposes only the `getCurriculumTopics` tool.
    2.  **`lib/ai/tools/get-curriculum-topics.ts`:**
        - Rewrote the export as a proper AI SDK tool using the `tool({ description, inputSchema, execute })` helper, matching the existing tool idiom in `lib/ai/tools/`. Previously it was a plain async function returning a string, which is not a valid `ToolSet` entry.

- **Environment notes:** Local dev requires `AUTH_SECRET` (generated via `openssl rand -base64 32`) and `POSTGRES_URL` in `.env.local`. AI Gateway works locally via the auto-provided `VERCEL_OIDC_TOKEN`. `BLOB_READ_WRITE_TOKEN` and `REDIS_URL` are optional (guarded in code).

The application now compiles cleanly and runs as a curriculum-scoped Socratic tutor.
