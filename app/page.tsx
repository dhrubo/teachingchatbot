import {
  type DayStripItem,
  EdexcelDashboard,
} from "@/components/home/edexcel-dashboard";
import { getAiSetupStatus } from "@/lib/ai/providers";
import { getOrCreateLearner } from "@/lib/db/queries/learners";
import {
  getLearnerTopicProgress,
  getRecentPracticeLogs,
} from "@/lib/db/queries/progress";
import { resolveLearnerIdFromCookies } from "@/lib/learner-session";
import { formatDateInTimezone } from "@/lib/reminders/streaks";

export const dynamic = "force-dynamic";

const DAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildSevenDayStrip(
  logsByDate: Map<string, { minutesPracticed: number; usedFreeze: boolean }>,
  timezone: string
): DayStripItem[] {
  const now = new Date();
  const todayStr = formatDateInTimezone(now, timezone);
  const items: DayStripItem[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const dateStr = formatDateInTimezone(d, timezone);
    const [y, m, day] = dateStr.split("-").map((s) => Number.parseInt(s, 10));
    const utcDay = new Date(Date.UTC(y, (m || 1) - 1, day || 1)).getUTCDay();
    const entry = logsByDate.get(dateStr);

    items.push({
      dateStr,
      dayLabel: offset === 0 ? "Today" : (DAY_SHORT_NAMES[utcDay] ?? "Day"),
      practiced: Boolean(entry && entry.minutesPracticed > 0),
      usedFreeze: Boolean(entry?.usedFreeze),
      isToday: dateStr === todayStr,
    });
  }

  return items;
}

export default async function HomePage() {
  const learnerId = await resolveLearnerIdFromCookies();
  const [learner, progressRows, practiceLogs] = await Promise.all([
    getOrCreateLearner(learnerId),
    getLearnerTopicProgress(learnerId),
    getRecentPracticeLogs(learnerId, 14),
  ]);

  const progressBySlug: Record<
    string,
    {
      masteryScore: number;
      lensesTried: (typeof learner.preferredLens)[];
      questionsAnswered: number;
      questionsCorrect: number;
    }
  > = {};

  for (const row of progressRows) {
    progressBySlug[row.topicSlug] = {
      masteryScore: row.masteryScore,
      lensesTried: row.lensesTried,
      questionsAnswered: row.questionsAnswered,
      questionsCorrect: row.questionsCorrect,
    };
  }

  const logsMap = new Map(
    practiceLogs.map((l) => [
      l.practiceDate,
      { minutesPracticed: l.minutesPracticed, usedFreeze: l.usedFreeze },
    ])
  );
  const todayStr = formatDateInTimezone(new Date(), learner.timezone);
  const todayLog =
    practiceLogs.find((l) => l.practiceDate === todayStr) ?? null;

  return (
    <EdexcelDashboard
      learner={{
        nickname: learner.nickname,
        tier: learner.tier,
        targetGrade: learner.targetGrade,
        preferredLens: learner.preferredLens,
        toneStyle: learner.toneStyle,
        speechSpeed: learner.speechSpeed,
        dailyGoalMinutes: learner.dailyGoalMinutes,
        reminderEnabled: learner.reminderEnabled,
        reminderHour: learner.reminderHour,
        reminderMinute: learner.reminderMinute,
        timezone: learner.timezone,
        currentStreak: learner.currentStreak,
        longestStreak: learner.longestStreak,
        streakFreezes: learner.streakFreezes,
        totalXp: learner.totalXp,
      }}
      progressBySlug={progressBySlug}
      setup={getAiSetupStatus()}
      sevenDayStrip={buildSevenDayStrip(logsMap, learner.timezone)}
      todayLog={todayLog}
    />
  );
}
