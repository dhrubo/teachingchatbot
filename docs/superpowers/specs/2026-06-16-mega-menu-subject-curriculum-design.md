# Design Spec: Wide Mega Menu & Dynamic Subject Curriculum

## 1. Introduction & Core Goal
The platform is expanding from GCSE Maths to a dual-subject **GCSE Maths & GCSE Science** experience. The core goal of this update is to activate dynamic, subject-specific topics across the homepage and top navigation. Specifically, we will wire up the lessons API to support dynamic subjects, update the student dashboard to support dynamic Science maps (removing the static placeholder), and overhaul the "Choose a Topic" popover into a gorgeous, high-fidelity double-column "Mega Menu" representing GCSE Maths and GCSE Science across Year 8 and Year 9.

---

## 2. API Updates (`app/(chat)/api/lessons/route.ts`)
* **Subject Query Parameter**: Read `subjectParam` from `searchParams.get("subject") || "maths"`.
* **Dynamic Year Blocks**: Update the `yearParam` list-missions query to filter the `mission` table by both the active year, the requested subject, and whether the mission is active:
  ```typescript
  const year = Number.parseInt(yearParam, 10);
  const missions = await db
    .select()
    .from(mission)
    .where(
      and(
        eq(mission.yearGroup, year),
        eq(mission.subject, subjectParam),
        eq(mission.isActive, true)
      )
    )
    .orderBy(asc(mission.order));
  ```

---

## 3. Student Dashboard Updates (`components/chat/sara-dashboard.tsx`)
* **Dynamic SWR Query**: Update the SWR fetch URL to incorporate the active subject:
  ```typescript
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lessons?year=${year}&subject=${subject}`
  ```
* **GCSE Science Card Integration**:
  * Update subtitle from "Coming Soon" to "Active Syllabus".
  * Remove the static, non-functional Science premium placeholder card block.
* **Unified Layout**: Eliminate the exclusive `{subject === "maths" && ...}` guard for Today's Mission and Learning Journey. Allow *any* active subject (`subject !== ""`) to dynamically render its corresponding circular **Topic Map (`MissionMap`)** and **Today's Mission** card.
* **Remove "What You'll Learn"**: Eliminate the redundant linear listing section at the bottom of the dashboard.

---

## 4. Top-Nav Mega Menu (`components/chat/topic-picker.tsx`)
* **Layout & Dimensions**: Overhaul the narrow popover into a wide, responsive **Mega Menu** with a class width of `w-[760px] max-w-[95vw]` featuring a double-column layout.
* **Double-Column Division**:
  * **Left Column**: GCSE Maths 📐
  * **Right Column**: GCSE Science 🧪
* **Grouping by Year**: Within each column, further partition topics under **Year 8** and **Year 9**.
* **Dynamic Loading with SWR**: Fetch each of the 4 combinations independently (and fetch static fallback gracefully):
  * `/api/lessons?year=8&subject=maths`
  * `/api/lessons?year=9&subject=maths`
  * `/api/lessons?year=8&subject=science`
  * `/api/lessons?year=9&subject=science`
* **High-Fidelity Science Static Fallback**: Define an offline/unseeded fallback for GCSE Science:
  * **Year 8 Science**:
    * `cells-respiration` ("Cells & Respiration 🧫")
    * `elements-compounds` ("Elements & Compounds 🧪")
    * `forces-magnets` ("Forces & Magnets 🧲")
    * `light-sound` ("Light & Sound 🔊")
  * **Year 9 Science**:
    * `photosynthesis-ecosystems` ("Photosynthesis & Ecosystems 🌿")
    * `chemical-reactions` ("Chemical Reactions & Periodic Table 💥")
    * `energy-waves` ("Energy & Waves 🌊")
    * `earth-atmosphere` ("Earth & Atmosphere 🌍")
* **Sunset Space Theme Styling**: Apply pulsing indicator dots, glowing borders, active hover cards, and clean transitions matching our existing design language.

---

## 5. Verification Plan
* Ensure `npx tsc --noEmit` compiles without any type errors.
* Run Vitest suite using `pnpm test:unit` to ensure 100% of standard tests pass cleanly.
