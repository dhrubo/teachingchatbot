/**
 * Deterministic confidence analytics — zero AI calls.
 * Computes trends, changes, and confidence-vs-mastery comparisons
 * from stored StudentConfidence and StudentSkillMastery rows.
 */

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export type ConfidenceTrend = "rising" | "falling" | "stable";

export type ConfidenceVsMastery =
  | "high_confidence_low_mastery"
  | "low_confidence_high_mastery"
  | "aligned";

export type ConfidenceAnalytics = {
  averageConfidence: number;
  trend: ConfidenceTrend;
  change: number; // +/-
  vsMastery: ConfidenceVsMastery;
  lowConfidenceSkills: string[];
  highConfidenceSkills: string[];
};

/**
 * Average confidence across all recorded skills.
 */
export function averageConfidence(
  records: { confidence: number }[]
): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.confidence, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * Confidence trend: compare first half vs second half of a time-ordered list.
 */
export function computeTrend(
  records: { confidence: number; updatedAt: Date }[]
): ConfidenceTrend {
  if (records.length < 4) return "stable";

  const sorted = [...records].sort(
    (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()
  );
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const firstAvg = averageConfidence(firstHalf);
  const secondAvg = averageConfidence(secondHalf);
  const diff = secondAvg - firstAvg;

  if (diff > 0.3) return "rising";
  if (diff < -0.3) return "falling";
  return "stable";
}

/**
 * Latest confidence change (difference from previous record).
 */
export function confidenceChange(
  records: { confidence: number; updatedAt: Date }[]
): number {
  if (records.length < 2) return 0;
  const sorted = [...records].sort(
    (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()
  );
  const latest = sorted[sorted.length - 1].confidence;
  const previous = sorted[sorted.length - 2].confidence;
  return latest - previous;
}

/**
 * Compare confidence vs mastery for a single skill.
 */
export function compareConfidenceVsMastery(
  confidence: number | null,
  masteryScore: number | null
): ConfidenceVsMastery {
  if (confidence === null || masteryScore === null) return "aligned";
  const highConf = confidence >= 4;
  const highMastery = masteryScore >= 70;

  if (highConf && !highMastery) return "high_confidence_low_mastery";
  if (!highConf && highMastery) return "low_confidence_high_mastery";
  return "aligned";
}

/**
 * Full analytics for all skills.
 */
export function computeConfidenceAnalytics(params: {
  confidenceRecords: { skillSlug: string; confidence: number; updatedAt: Date }[];
  masteries: Map<string, { masteryScore: number }>;
}): ConfidenceAnalytics {
  const { confidenceRecords, masteries } = params;

  const avg = averageConfidence(confidenceRecords);
  const trend = computeTrend(confidenceRecords);
  const change = confidenceChange(confidenceRecords);

  // vs-mastery: aggregate most common pattern
  let highConfLowMastery = 0;
  let lowConfHighMastery = 0;
  let aligned = 0;
  const lowConfidenceSkills: string[] = [];
  const highConfidenceSkills: string[] = [];

  for (const r of confidenceRecords) {
    const mastery = masteries.get(r.skillSlug);
    const vs = compareConfidenceVsMastery(r.confidence, mastery?.masteryScore ?? null);
    if (r.confidence <= 2) lowConfidenceSkills.push(r.skillSlug);
    if (r.confidence >= 4) highConfidenceSkills.push(r.skillSlug);
    if (vs === "high_confidence_low_mastery") highConfLowMastery++;
    else if (vs === "low_confidence_high_mastery") lowConfHighMastery++;
    else aligned++;
  }

  const total = confidenceRecords.length || 1;
  const vsMastery: ConfidenceVsMastery =
    highConfLowMastery > lowConfHighMastery && highConfLowMastery > aligned
      ? "high_confidence_low_mastery"
      : lowConfHighMastery > highConfLowMastery && lowConfHighMastery > aligned
        ? "low_confidence_high_mastery"
        : "aligned";

  return {
    averageConfidence: avg,
    trend,
    change,
    vsMastery,
    lowConfidenceSkills,
    highConfidenceSkills,
  };
}
