import { EDEXCEL_TOPICS, getTopicBySlug } from "./edexcel-1ma1";
import type { EdexcelTopic } from "./types";

export type TopicDetectionConfidence = "high" | "medium" | "fallback";

export type TopicDetectionResult = {
  topic: EdexcelTopic;
  confidence: TopicDetectionConfidence;
  matchedSignals: string[];
};

type WeightedSignal = {
  label: string;
  weight: number;
  pattern: RegExp;
};

const TOPIC_SIGNAL_RULES: Record<string, readonly WeightedSignal[]> = {
  "compound-interest": [
    {
      label: "compound interest",
      weight: 8,
      pattern: /\bcompound(?:\s+interest)?\b/i,
    },
    { label: "depreciation", weight: 7, pattern: /\bdepreciat\w*\b/i },
    {
      label: "per annum / per year %",
      weight: 5,
      pattern: /\b(?:\d+(?:\.\d+)?%\s*(?:per\s+(?:year|annum)|each\s+year))\b/i,
    },
    {
      label: "savings/invested",
      weight: 4,
      pattern: /\b(?:invest\w*|savings\s+account|interest\s+earned)\b/i,
    },
    {
      label: "multiplier power",
      weight: 5,
      pattern: /\b[01]\.\d{1,3}\s*\^\s*\d+/i,
    },
    {
      label: "decimal multiplier",
      weight: 3,
      pattern: /\bdecimal\s+multiplier\b/i,
    },
  ],
  "reverse-percentages": [
    {
      label: "reverse percentage",
      weight: 9,
      pattern: /\breverse\s+percent\w*\b/i,
    },
    {
      label: "original price/pay/value",
      weight: 7,
      pattern:
        /\b(?:original\s+(?:price|cost|pay|salary|value|amount)|before\s+the\s+(?:sale|discount|increase|rise|reduction))\b/i,
    },
    {
      label: "after a % sale/rise",
      weight: 6,
      pattern:
        /\b(?:in\s+a\s+\d+%\s*(?:off\s+)?sale|after\s+a\s+\d+%\s*(?:sale|discount|pay\s+rise|increase|reduction))\b/i,
    },
    {
      label: "reduced/increased to £",
      weight: 5,
      pattern: /\b(?:reduced|discounted|increased)\s+to\s+£?\d+/i,
    },
  ],
  "fractions-operations": [
    { label: "fraction keyword", weight: 6, pattern: /\bfractions?\b/i },
    {
      label: "numerator/denominator",
      weight: 6,
      pattern:
        /\b(?:numerator|denominator|improper\s+fraction|mixed\s+number|keep\s+change\s+flip)\b/i,
    },
    {
      label: "numeric fraction arithmetic",
      weight: 6,
      pattern: /\b\d+\s*\/\s*[2-9]\d*\s*[+\-−×*÷/]\s*\d+\s*\/\s*[2-9]\d*/i,
    },
    {
      label: "spoken fractions",
      weight: 5,
      pattern:
        /\b(?:quarters?|thirds?|fifths?|sixths?|sevenths?|eighths?|tenths?|three\s+halves|one\s+half)\b/i,
    },
  ],
  "ratio-sharing": [
    { label: "ratio keyword", weight: 7, pattern: /\bratios?\b/i },
    { label: "a : b notation", weight: 7, pattern: /\b\d+\s*:\s*\d+\b/ },
    {
      label: "share in the ratio",
      weight: 6,
      pattern: /\bshare\b.{1,35}\b(?:in|into)\b/i,
    },
    {
      label: "equal parts",
      weight: 3,
      pattern: /\bequal\s+parts\b/i,
    },
  ],
  "indices-and-standard-form": [
    { label: "standard form", weight: 9, pattern: /\bstandard\s+form\b/i },
    {
      label: "10^n notation",
      weight: 8,
      pattern: /\b\d+(?:\.\d+)?\s*[×x*]\s*10(?:\s*\^\s*-?\d+|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)/i,
    },
    {
      label: "indices/powers",
      weight: 6,
      pattern:
        /\b(?:indices|index\s+law|laws\s+of\s+indices|fractional\s+power|negative\s+power)\b/i,
    },
    {
      label: "fractional exponent",
      weight: 7,
      pattern: /\b\d+\s*\^\s*\(\s*-?\d+\s*\/\s*\d+\s*\)/,
    },
    {
      label: "power of zero / simplify powers",
      weight: 5,
      pattern:
        /\b(?:to\s+the\s+power\s+of|[a-z0-9]\^\d+\s*[×*÷]\s*[a-z0-9]\^\d+)/i,
    },
  ],
  surds: [
    { label: "surds", weight: 9, pattern: /\bsurds?\b/i },
    {
      label: "rationalise denominator",
      weight: 9,
      pattern: /\brationali[sz]e\b/i,
    },
    {
      label: "square root symbol/word",
      weight: 6,
      pattern: /(?:√\s*\d+|\bsqrt\s*\(?\s*\d+|\broot\s+\d+)/i,
    },
  ],
  "quadratics-expanding-factorising": [
    { label: "quadratic", weight: 8, pattern: /\bquadratics?\b/i },
    {
      label: "factorise / completing the square",
      weight: 8,
      pattern:
        /\b(?:factori[sz]\w*|completing\s+the\s+square|turning\s+point|double\s+brackets?)\b/i,
    },
    {
      label: "x² expression",
      weight: 7,
      pattern: /\bx(?:\^2|²)\s*[+\-−]/i,
    },
    {
      label: "double bracket (x + a)(x + b)",
      weight: 8,
      pattern: /\(\s*x\s*[+\-−]\s*\d+\s*\)\s*\(\s*x\s*[+\-−]\s*\d+\s*\)/i,
    },
  ],
  "simultaneous-equations": [
    {
      label: "simultaneous equations",
      weight: 10,
      pattern: /\bsimultaneous\b/i,
    },
    {
      label: "two x/y equations",
      weight: 8,
      pattern:
        /\b\d*x\s*[+\-−]\s*\d*y\s*=\s*-?\d+.{1,25}\b\d*x\s*[+\-−]\s*\d*y\s*=\s*-?\d+/i,
    },
    {
      label: "worded two-item Simultaneous",
      weight: 6,
      pattern: /\b\d+\s+teas?\s+and\s+\d+\s+coffees?\b/i,
    },
  ],
  "solving-linear-equations": [
    {
      label: "linear equation",
      weight: 7,
      pattern: /\blinear\s+equations?\b/i,
    },
    {
      label: "ax + b = c",
      weight: 6,
      pattern:
        /\b(?:\d*x\s*[+\-−]\s*\d+\s*=|\d+\(\s*x\s*[+\-−]\s*\d+\s*\)\s*=)/i,
    },
    {
      label: "solve for x",
      weight: 4,
      pattern:
        /\b(?:solve\s+for\s+x|find\s+the\s+value\s+of\s+x|unknowns?\s+on\s+both\s+sides)\b/i,
    },
  ],
  "sequences-nth-term": [
    { label: "nth term", weight: 9, pattern: /\bnth\s+term\b/i },
    { label: "sequence", weight: 7, pattern: /\bsequences?\b/i },
    {
      label: "k-th term / next term",
      weight: 6,
      pattern:
        /\b(?:next\s+term|\d+(?:st|nd|rd|th)\s+term|common\s+difference)\b/i,
    },
    {
      label: "comma number list",
      weight: 5,
      pattern: /\b-?\d+\s*,\s*-?\d+\s*,\s*-?\d+\s*,\s*-?\d+\b/,
    },
  ],
  "pythagoras-and-sohcahtoa": [
    { label: "pythagoras", weight: 9, pattern: /\bpythagoras\b/i },
    { label: "hypotenuse", weight: 8, pattern: /\bhypotenuse\b/i },
    {
      label: "trigonometry / SOHCAHTOA",
      weight: 9,
      pattern: /\b(?:sohcahtoa|trigonometry|trig|sin|cos|tan)\b/i,
    },
    {
      label: "right-angled triangle",
      weight: 6,
      pattern: /\bright[-\s]angled\s+triangle\b/i,
    },
  ],
  "circles-and-sectors": [
    {
      label: "circle / sector / arc",
      weight: 8,
      pattern:
        /\b(?:circles?|circumference|semicircles?|sectors?|arc\s+length|radius|diameter)\b/i,
    },
    { label: "pi", weight: 5, pattern: /(?:π|\bpi\b)/i },
  ],
  "probability-trees": [
    { label: "probability", weight: 8, pattern: /\bprobabilit\w*\b/i },
    {
      label: "tree diagram / replacement",
      weight: 8,
      pattern:
        /\b(?:tree\s+diagram|without\s+replacement|with\s+replacement|independent\s+events)\b/i,
    },
    {
      label: "spinner/counters/dice",
      weight: 5,
      pattern:
        /\b(?:biased\s+spinner|red\s+counters|blue\s+counters|p\s*\(\s*both)\b/i,
    },
  ],
  "statistics-grouped-mean-histograms": [
    { label: "histogram", weight: 9, pattern: /\bhistograms?\b/i },
    {
      label: "frequency density",
      weight: 9,
      pattern: /\bfrequency\s+density\b/i,
    },
    {
      label: "grouped / estimated mean",
      weight: 8,
      pattern:
        /\b(?:estimated\s+mean|grouped\s+(?:table|data|class)|midpoint)\b/i,
    },
    {
      label: "IQR / quartiles / box plot",
      weight: 8,
      pattern:
        /\b(?:interquartile|iqr|lower\s+quartile|upper\s+quartile|box\s+plot)\b/i,
    },
  ],
};

export function detectEdexcelTopic(question: string): TopicDetectionResult {
  const normalized = question.trim();
  let bestSlug = "compound-interest";
  let bestScore = 0;
  let bestSignals: string[] = [];

  for (const topic of EDEXCEL_TOPICS) {
    let score = 0;
    const signals: string[] = [];

    // Direct title match boost
    if (normalized.toLowerCase().includes(topic.title.toLowerCase())) {
      score += 10;
      signals.push(topic.title);
    }

    const rules = TOPIC_SIGNAL_RULES[topic.slug] ?? [];
    for (const rule of rules) {
      if (rule.pattern.test(normalized)) {
        score += rule.weight;
        signals.push(rule.label);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestSlug = topic.slug;
      bestSignals = signals;
    }
  }

  // Broad fallback heuristics if no rule scored yet
  if (bestScore === 0) {
    if (/%|\bpercent/i.test(normalized)) {
      bestSlug = "compound-interest";
      bestSignals = ["percentage"];
      bestScore = 3;
    } else if (/[=x]/i.test(normalized)) {
      bestSlug = "solving-linear-equations";
      bestSignals = ["algebraic equation"];
      bestScore = 3;
    }
  }

  const matchedTopic = getTopicBySlug(bestSlug) ?? EDEXCEL_TOPICS[0];
  if (!matchedTopic) {
    throw new Error("Curriculum topics list is unexpectedly empty");
  }

  const confidence: TopicDetectionConfidence =
    bestScore >= 6 ? "high" : bestScore >= 3 ? "medium" : "fallback";

  return {
    topic: matchedTopic,
    confidence,
    matchedSignals: bestSignals,
  };
}
