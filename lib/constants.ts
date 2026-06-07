import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

// Friendly, tappable topic quick-starts for the home screen, grouped by
// school year. `label` is the short chip text; `prompt` is the message that
// actually gets sent to the tutor when tapped.
export type TopicSuggestion = { label: string; emoji: string; prompt: string };

export const topicSuggestions: Record<"8" | "9", TopicSuggestion[]> = {
  "8": [
    {
      label: "Percentages",
      emoji: "💯",
      prompt: "Can you help me get better at percentages? Start me off easy.",
    },
    {
      label: "Ratio",
      emoji: "⚖️",
      prompt: "I want to practise ratio, including the 1:n form.",
    },
    {
      label: "Algebra basics",
      emoji: "🔤",
      prompt: "Let's do some algebra — expanding brackets and solving equations.",
    },
    {
      label: "Straight-line graphs",
      emoji: "📈",
      prompt: "Help me understand plotting and drawing straight-line graphs.",
    },
    {
      label: "Angles",
      emoji: "📐",
      prompt: "Can we work on angles in polygons and parallel lines?",
    },
    {
      label: "Probability",
      emoji: "🎲",
      prompt: "I'd like to practise probability with frequency trees.",
    },
  ],
  "9": [
    {
      label: "Simultaneous equations",
      emoji: "➗",
      prompt: "Can you teach me how to solve simultaneous equations, step by step?",
    },
    {
      label: "Pythagoras",
      emoji: "📏",
      prompt: "I want to practise Pythagoras' theorem.",
    },
    {
      label: "Quadratic graphs",
      emoji: "📊",
      prompt: "Help me with completing tables of values and drawing quadratic graphs.",
    },
    {
      label: "Indices",
      emoji: "🔢",
      prompt: "Let's go over the laws of indices and standard form.",
    },
    {
      label: "Inverse proportion",
      emoji: "🔁",
      prompt: "Can we practise direct and inverse proportion problems?",
    },
    {
      label: "Tree diagrams",
      emoji: "🌳",
      prompt: "I'd like to practise probability tree diagrams for combined events.",
    },
  ],
};

// Flat list kept for the artifact preview and tests.
export const suggestions = [
  ...topicSuggestions["8"].slice(0, 2),
  ...topicSuggestions["9"].slice(0, 2),
].map((t) => t.prompt);
