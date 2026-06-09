// lib/ai/missions.ts
export interface ConceptCard {
  id: string;
  title: string;
  visual: string;
  example: string;
  explanation: string;
}

export interface MissionDefinition {
  id: string;
  title: string;
  yearGroup: "8" | "9";
  emoji: string;
  description: string;
  estimatedMinutes: number;
  topics: string[];
  prerequisiteMissionIds: string[];
  gcseDomain: string;
  conceptCards: ConceptCard[];
}

export const MISSIONS: MissionDefinition[] = [
  {
    id: "missions/percentages",
    title: "Percentages",
    yearGroup: "8",
    emoji: "💯",
    description: "Master percentages — from basics to real-world problems.",
    estimatedMinutes: 15,
    topics: ["Percentages"],
    prerequisiteMissionIds: ["missions/number-skills", "missions/fractions"],
    gcseDomain: "number",
    conceptCards: [
      { id: "pc-percentages-1", title: "Percent means out of 100", visual: "25% = 25/100 = 0.25", example: "75% = 75 out of every 100", explanation: "Percent is a way of showing a part of a whole, split into 100 equal pieces." },
      { id: "pc-percentages-2", title: "Useful benchmark percentages", visual: "50% = ½   25% = ¼   10% = ⅒  1% = 1/100", example: "75% = ¾ = three quarters", explanation: "Knowing these makes mental maths much faster." },
      { id: "pc-percentages-3", title: "Finding 50% of a number", visual: "50% of 80 → 80 × ½ = 40", example: "50% of 200 = 100", explanation: "50% is just half. Halving is the fastest percentage calculation." },
      { id: "pc-percentages-4", title: "Finding 10% of a number", visual: "10% of 80 → 80 ÷ 10 = 8", example: "10% of 150 = 15", explanation: "10% is one tenth. Just divide by 10." },
    ],
  },
  {
    id: "missions/ratio",
    title: "Ratio and Proportion",
    yearGroup: "8",
    emoji: "⚖️",
    description: "Simplify ratios, share in a given ratio, and solve proportion problems.",
    estimatedMinutes: 15,
    topics: ["Ratio"],
    prerequisiteMissionIds: ["missions/number-skills", "missions/fractions"],
    gcseDomain: "ratio_proportion_rates",
    conceptCards: [
      { id: "pc-ratio-1", title: "What is a ratio?", visual: "3:2 means 3 parts to 2 parts", example: "Apples:oranges = 3:2 in a fruit bowl", explanation: "A ratio compares two quantities. The order matters — 3:2 is different from 2:3." },
      { id: "pc-ratio-2", title: "Simplifying ratios", visual: "6:4 = 3:2 (divide both by 2)", example: "12:8 = 3:2", explanation: "Like fractions, ratios can be simplified by dividing both parts by the same number." },
      { id: "pc-ratio-3", title: "Sharing in a ratio", visual: "Share £20 in ratio 3:2 → 3+2=5 parts", example: "£20 ÷ 5 = £4 per part → 3×£4=£12, 2×£4=£8", explanation: "Add the parts to find the total number of shares. Divide the amount by total shares, then multiply each part." },
    ],
  },
  {
    id: "missions/algebra-basics",
    title: "Algebra Basics",
    yearGroup: "8",
    emoji: "🔤",
    description: "Expand brackets, factorise, solve equations and inequalities.",
    estimatedMinutes: 20,
    topics: ["Basic algebra"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "algebra",
    conceptCards: [
      { id: "pc-algebra-1", title: "What is a variable?", visual: "x + 5 = 12 → x = 7", example: "3y = 15 → y = 5", explanation: "A letter represents an unknown number. Your job is to find what it stands for." },
      { id: "pc-algebra-2", title: "Solving equations — balance", visual: "x + 7 = 15 → x = 15 - 7 → x = 8", example: "2x + 3 = 11 → 2x = 8 → x = 4", explanation: "Whatever you do to one side, do to the other. Aim to get the variable alone." },
      { id: "pc-algebra-3", title: "Expanding brackets", visual: "3(x + 2) = 3x + 6", example: "2(4x - 1) = 8x - 2", explanation: "Multiply everything inside the bracket by the number outside." },
    ],
  },
  {
    id: "missions/graphs",
    title: "Straight-Line Graphs",
    yearGroup: "8",
    emoji: "📈",
    description: "Plot coordinates, draw linear graphs, complete tables of values.",
    estimatedMinutes: 15,
    topics: ["Graphs and coordinates"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "algebra",
    conceptCards: [
      { id: "pc-graphs-1", title: "Coordinates", visual: "(3, 2) means 3 across, 2 up", example: "(0, 0) is the origin — where the axes meet", explanation: "The first number is horizontal (x-axis), the second is vertical (y-axis)." },
      { id: "pc-graphs-2", title: "Tables of values", visual: "y = 2x + 1 → x=0→y=1, x=1→y=3, x=2→y=5", example: "For y = x + 3: (0,3), (1,4), (2,5)", explanation: "Pick x values, plug them into the equation to find matching y values." },
      { id: "pc-graphs-3", title: "Plotting points", visual: "Plot (0,1), (1,3), (2,5) — they make a straight line", example: "y = 2x + 1 gives a straight line through those points", explanation: "When all your points line up, the relationship is linear." },
    ],
  },
  {
    id: "missions/angles",
    title: "Angles and Geometry",
    yearGroup: "8",
    emoji: "📐",
    description: "Angles in polygons, parallel lines, and area of circles.",
    estimatedMinutes: 15,
    topics: ["Geometry"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "geometry_measures",
    conceptCards: [
      { id: "pc-angles-1", title: "Angles on a straight line", visual: "30° + 150° = 180°", example: "Angles on a straight line always add up to 180°", explanation: "If you know one angle, subtract from 180 to find the other." },
      { id: "pc-angles-2", title: "Angles in a triangle", visual: "60° + 70° + 50° = 180°", example: "If two angles are 50° and 60°, the third is 70°", explanation: "All three angles in any triangle add up to 180°." },
      { id: "pc-angles-3", title: "Angles in parallel lines", visual: "Corresponding angles are equal (F-shape)", example: "Alternate angles are equal (Z-shape)", explanation: "When a line crosses parallel lines, some angles match. Look for F and Z patterns." },
    ],
  },
  {
    id: "missions/probability",
    title: "Probability",
    yearGroup: "8",
    emoji: "🎲",
    description: "Frequency trees, probability scales, two-way tables.",
    estimatedMinutes: 15,
    topics: ["Statistics and probability foundations"],
    prerequisiteMissionIds: ["missions/number-skills", "missions/fractions"],
    gcseDomain: "probability",
    conceptCards: [
      { id: "pc-prob-1", title: "Probability scale", visual: "0 (impossible) ←———→ 1 (certain)", example: "Flipping heads on a coin = 0.5", explanation: "Probability is always between 0 and 1. 0 = impossible, 1 = certain." },
      { id: "pc-prob-2", title: "Calculating probability", visual: "P(event) = favourable outcomes ÷ total outcomes", example: "Rolling a 4 on a die: 1 ÷ 6 = 1/6", explanation: "Count how many ways the event can happen, divide by all possible outcomes." },
      { id: "pc-prob-3", title: "Frequency trees", visual: "Start → splits into branches → each branch has a probability", example: "60 students: ⅔ walk, ⅓ bus. Of walkers, ¼ are late.", explanation: "Trees show all possible paths. Multiply along branches to find combined probabilities." },
    ],
  },
  {
    id: "missions/number-skills",
    title: "Number Skills",
    yearGroup: "8",
    emoji: "🔢",
    description: "Rounding, standard form, fractions, and money calculations.",
    estimatedMinutes: 15,
    topics: ["Number and calculations"],
    prerequisiteMissionIds: [],
    gcseDomain: "number",
    conceptCards: [
      { id: "pc-number-1", title: "Rounding to decimal places", visual: "3.14159 → 3.14 (2 d.p.)", example: "7.286 → 7.29 (2 d.p., the 6 rounds up)", explanation: "Count the decimal places you need. Look at the next digit — 5 or more rounds up." },
      { id: "pc-number-2", title: "Fractions — adding", visual: "½ + ⅓ = 3/6 + 2/6 = 5/6", example: "¼ + ⅜ = 2/8 + 3/8 = 5/8", explanation: "Get a common denominator first, then add the numerators." },
      { id: "pc-number-3", title: "Money calculations", visual: "£3.50 × 4 = £14.00", example: "8 apples at 45p each = £3.60", explanation: "Convert pence to pounds by dividing by 100. Keep track of decimal places." },
    ],
  },
  {
    id: "missions/fractions",
    title: "Fractions",
    yearGroup: "8",
    emoji: "🧮",
    description: "Mixed fractions, operations, and fraction of amounts.",
    estimatedMinutes: 15,
    topics: ["Number and calculations", "Fractions"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "number",
    conceptCards: [
      { id: "pc-frac-1", title: "Mixed numbers to improper", visual: "2⅓ = (2×3+1)/3 = 7/3", example: "3¼ = 13/4", explanation: "Multiply the whole number by the denominator, add the numerator." },
      { id: "pc-frac-2", title: "Multiplying fractions", visual: "½ × ¾ = 3/8", example: "⅔ × ⅘ = 8/15", explanation: "Multiply the numerators together, multiply the denominators together. Then simplify." },
      { id: "pc-frac-3", title: "Fraction of an amount", visual: "⅗ of 20 = (20 ÷ 5) × 3 = 4 × 3 = 12", example: "¾ of 40 = 30", explanation: "Divide by the denominator, then multiply by the numerator." },
    ],
  },
  {
    id: "missions/simultaneous-equations",
    title: "Simultaneous Equations",
    yearGroup: "9",
    emoji: "➗",
    description: "Solve two equations at once using elimination and substitution.",
    estimatedMinutes: 20,
    topics: ["Algebra and algebraic problem solving"],
    prerequisiteMissionIds: ["missions/algebra-basics"],
    gcseDomain: "algebra",
    conceptCards: [
      { id: "pc-sim-1", title: "What are simultaneous equations?", visual: "x + y = 10 and 2x - y = 5", example: "Two equations, two unknowns — find the pair that fits both", explanation: "You need as many equations as you have unknowns. The solution works for both equations." },
      { id: "pc-sim-2", title: "Elimination method", visual: "x + y = 10 and 2x - y = 5 → add them: 3x = 15 → x = 5", example: "x + y = 10 → 5 + y = 10 → y = 5", explanation: "Add or subtract the equations to cancel one variable. Then solve for the other." },
      { id: "pc-sim-3", title: "Checking your answer", visual: "Check: x=5, y=5 → 2(5)-5=5 ✓", example: "Plug both values back into the original equations", explanation: "Always check! Both equations must be true with your solution." },
    ],
  },
  {
    id: "missions/pythagoras",
    title: "Pythagoras' Theorem",
    yearGroup: "9",
    emoji: "📏",
    description: "Find missing sides in right-angled triangles.",
    estimatedMinutes: 15,
    topics: ["Measurement and geometry"],
    prerequisiteMissionIds: ["missions/number-skills", "missions/angles"],
    gcseDomain: "geometry_measures",
    conceptCards: [
      { id: "pc-pythag-1", title: "The theorem", visual: "a² + b² = c²", example: "For sides 3 and 4: 3²+4²=9+16=25, so c=5", explanation: "In a right-angled triangle, the square of the longest side equals the sum of the squares of the other two." },
      { id: "pc-pythag-2", title: "Finding the hypotenuse", visual: "a=6, b=8 → c²=36+64=100 → c=10", example: "a=5, b=12 → c²=25+144=169 → c=13", explanation: "The hypotenuse is always opposite the right angle. Square both sides, add, then square root." },
      { id: "pc-pythag-3", title: "Finding a shorter side", visual: "c=13, a=5 → b²=169-25=144 → b=12", example: "c=10, b=6 → a²=100-36=64 → a=8", explanation: "Subtract the square of the known side from the square of the hypotenuse." },
    ],
  },
  {
    id: "missions/indices",
    title: "Indices and Standard Form",
    yearGroup: "9",
    emoji: "🔢",
    description: "Laws of indices and working with standard form.",
    estimatedMinutes: 15,
    topics: ["Sequences and indices"],
    prerequisiteMissionIds: ["missions/number-skills"],
    gcseDomain: "number",
    conceptCards: [
      { id: "pc-indices-1", title: "What are indices?", visual: "2³ = 2 × 2 × 2 = 8", example: "5² = 25, 3⁴ = 81", explanation: "The index (power) tells you how many times to multiply the base by itself." },
      { id: "pc-indices-2", title: "Multiplying powers", visual: "a³ × a² = a⁵ (add the powers)", example: "2⁴ × 2³ = 2⁷ = 128", explanation: "When multiplying with the same base, add the powers. aᵐ × aⁿ = aᵐ⁺ⁿ" },
      { id: "pc-indices-3", title: "Standard form", visual: "3,000 = 3 × 10³", example: "0.005 = 5 × 10⁻³", explanation: "Standard form is a × 10ⁿ where 1 ≤ a < 10. Big numbers = positive n, small numbers = negative n." },
    ],
  },
  {
    id: "missions/probability-trees",
    title: "Probability Tree Diagrams",
    yearGroup: "9",
    emoji: "🌳",
    description: "Combined events using tree diagrams.",
    estimatedMinutes: 15,
    topics: ["Probability"],
    prerequisiteMissionIds: ["missions/probability"],
    gcseDomain: "probability",
    conceptCards: [
      { id: "pc-probtree-1", title: "Tree diagram structure", visual: "First event → branches → second event → branches", example: "Tossing a coin twice: H→(H,T), T→(H,T)", explanation: "Each branch shows a possible outcome. Multiply along branches for combined probability." },
      { id: "pc-probtree-2", title: "Independent events", visual: "P(H and H) = ½ × ½ = ¼", example: "Rolling a die and flipping a coin", explanation: "The first outcome doesn't affect the second. Multiply the probabilities." },
      { id: "pc-probtree-3", title: "Adding up to 1", visual: "All end results add to 1: ¼+¼+¼+¼=1", example: "Check your tree by adding all final probabilities", explanation: "The sum of all possible outcomes (all branches at the end) must equal 1." },
    ],
  },
  {
    id: "missions/quadratic-graphs",
    title: "Quadratic Graphs",
    yearGroup: "9",
    emoji: "📊",
    description: "Tables of values and drawing quadratic graphs.",
    estimatedMinutes: 15,
    topics: ["Graphs and functions"],
    prerequisiteMissionIds: ["missions/graphs"],
    gcseDomain: "algebra",
    conceptCards: [
      { id: "pc-quad-1", title: "What makes a quadratic?", visual: "y = x² curves, not straight", example: "y = x² + 2x + 1", explanation: "Quadratics have an x² term. Their graphs are U-shaped curves, not straight lines." },
      { id: "pc-quad-2", title: "Table of values for quadratics", visual: "y = x²: (-2,4), (-1,1), (0,0), (1,1), (2,4)", example: "Include negative x values — the curve is symmetrical", explanation: "Use at least 5 x values including negatives. The y values will show symmetry." },
      { id: "pc-quad-3", title: "Shape of the curve", visual: "y = x² makes a U shape", example: "Negative x² makes an inverted U (∩ shape)", explanation: "If x² is positive, the curve smiles. If it's negative, the curve frowns." },
    ],
  },
  {
    id: "missions/inverse-proportion",
    title: "Direct and Inverse Proportion",
    yearGroup: "9",
    emoji: "🔁",
    description: "Direct proportion graphs and inverse proportion problems.",
    estimatedMinutes: 15,
    topics: ["Ratio, proportion, and scale"],
    prerequisiteMissionIds: ["missions/ratio"],
    gcseDomain: "ratio_proportion_rates",
    conceptCards: [
      { id: "pc-prop-1", title: "Direct proportion", visual: "y = kx — as x doubles, y doubles", example: "5 apples cost £2 → 10 apples cost £4", explanation: "Two quantities increase together at the same rate. The graph is a straight line through (0,0)." },
      { id: "pc-prop-2", title: "Inverse proportion", visual: "y = k/x — as x doubles, y halves", example: "2 painters take 6 hours → 4 painters take 3 hours", explanation: "One quantity goes up as the other goes down. The graph curves towards the axes." },
      { id: "pc-prop-3", title: "Finding the constant k", visual: "y = kx → k = y/x (direct). y = k/x → k = xy (inverse)", example: "If y=12 when x=3 in direct proportion: k = 12/3 = 4", explanation: "Find k using one known pair. Then use k to find any unknown value." },
    ],
  },
];

// Runtime validation — catches orphaned prerequisite IDs early.
const allMissionIds = new Set(MISSIONS.map((m) => m.id));
for (const m of MISSIONS) {
  for (const p of m.prerequisiteMissionIds) {
    if (!allMissionIds.has(p)) {
      throw new Error(
        `Mission "${m.id}" references unknown prerequisite "${p}"`
      );
    }
  }
}

export function getMission(id: string): MissionDefinition | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function getMissionsByYear(year: "8" | "9"): MissionDefinition[] {
  return MISSIONS.filter((m) => m.yearGroup === year);
}
