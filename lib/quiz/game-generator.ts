import { randomInt } from "node:crypto";
import type {
  EdexcelTier,
  QuizGameRoundType,
  StoredQuizQuestion,
} from "@/lib/db/schema";
import { generateProceduralQuiz } from "./procedural-generator";

export type PublicGameRound = {
  index: number;
  roundType: QuizGameRoundType;
  difficultyLabel: string;
  calculatorAllowed: boolean;
  promptText: string;
  spokenPrompt: string;
  unit?: string;
  choices?: string[];
  workingLines?: string[];
};

export function toPublicGameRound(q: StoredQuizQuestion): PublicGameRound {
  return {
    index: q.index,
    roundType: q.roundType ?? "fluency_solve",
    difficultyLabel: q.difficultyLabel,
    calculatorAllowed: q.calculatorAllowed,
    promptText: q.promptText,
    spokenPrompt: q.spokenPrompt,
    unit: q.unit,
    choices: q.choices,
    workingLines: q.workingLines,
  };
}

function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    const tmp = arr[i];
    const swap = arr[j];
    if (tmp !== undefined && swap !== undefined) {
      arr[i] = swap;
      arr[j] = tmp;
    }
  }
  return arr;
}

function pick<T>(items: readonly T[]): T {
  const chosen = items[randomInt(0, items.length)];
  if (chosen === undefined) {
    throw new Error("Empty pick array");
  }
  return chosen;
}

function buildWorkingRoundsForTopic(
  topicSlug: string
): [StoredQuizQuestion, StoredQuizQuestion] {
  switch (topicSlug) {
    case "compound-interest": {
      const p = pick([800, 1200, 1500, 2000]);
      const r = pick([3, 4, 5, 6]);
      const yrs = pick([2, 3, 4]);
      const mult = (1 + r / 100).toFixed(2);
      const right = `${p} × ${mult}^${yrs}`;
      const wrong1 = `${p} × 0.0${r}^${yrs}`;
      const wrong2 = `${p} + (${p} × 0.0${r} × ${yrs})`;
      const wrong3 = `${p} × ${mult} × ${yrs}`;

      const dep = pick([10, 15, 20]);
      const depMult = (1 - dep / 100).toFixed(2);
      const depChoices = shuffle([
        depMult,
        `0.${dep}`,
        (1 + dep / 100).toFixed(2),
        `0.0${dep}`,
      ]);

      return [
        {
          index: 0,
          roundType: "step_choice",
          difficultyLabel: "Round 1 · Spot the Working",
          calculatorAllowed: false,
          promptText: `£${p} is invested at ${r}% compound interest per year for ${yrs} years. Tap the correct Edexcel calculation setup:`,
          spokenPrompt: `Round one. ${p} pounds is invested at ${r} percent compound interest for ${yrs} years. Pick the correct calculation setup.`,
          hintSpoken: `Add ${r} percent to 100 percent to get the multiplier ${mult}, then raise it to the power of ${yrs}.`,
          canonicalAnswer: right,
          choices: shuffle([right, wrong1, wrong2, wrong3]),
          workedSolution: `Compound growth multiplies by ${mult} each year for ${yrs} years: ${right}.`,
        },
        {
          index: 1,
          roundType: "missing_working",
          difficultyLabel: "Round 2 · Complete the Step",
          calculatorAllowed: false,
          promptText: `A scooter costs £1,000 and depreciates by ${dep}% per year for 2 years. Fill in the missing [ ? ] multiplier in the working:`,
          spokenPrompt: `Round two. A scooter depreciates by ${dep} percent per year. Fill in the missing decimal multiplier.`,
          hintSpoken: `Subtract ${dep} percent from 100 percent, then divide by 100.`,
          canonicalAnswer: depMult,
          workingLines: [
            `Step 1: Remaining % = 100% − ${dep}% = ${100 - dep}%`,
            "Step 2: Multiplier = [ ? ]",
            "Step 3: Value after 2 years = £1,000 × [ ? ]²",
          ],
          choices: depChoices,
          workedSolution: `${100 - dep}% as a decimal multiplier is ${depMult}.`,
        },
      ];
    }

    case "fractions-operations": {
      const [a, b, c, d] = pick([
        [2, 3, 1, 4],
        [3, 5, 1, 2],
        [1, 3, 2, 5],
      ] as const);
      const lcd = b * d;
      const right = `${a * d}/${lcd} + ${c * b}/${lcd}`;
      const wrong1 = `${a + c}/${b + d}`;
      const wrong2 = `${a}/${lcd} + ${c}/${lcd}`;
      const wrong3 = `${a * c}/${lcd}`;

      const [p, q, r, s] = pick([
        [3, 4, 2, 5],
        [2, 3, 4, 7],
        [5, 6, 3, 5],
      ] as const);
      const flipped = `${s}/${r}`;

      return [
        {
          index: 0,
          roundType: "step_choice",
          difficultyLabel: "Round 1 · Spot the Working",
          calculatorAllowed: false,
          promptText: `To calculate ${a}/${b} + ${c}/${d}, which first working line uses the correct common denominator?`,
          spokenPrompt: `Round one. Which working line sets up ${a} over ${b} plus ${c} over ${d} with the right common denominator?`,
          hintSpoken: `Scale both top and bottom of each fraction so both denominators become ${lcd}.`,
          canonicalAnswer: right,
          choices: shuffle([right, wrong1, wrong2, wrong3]),
          workedSolution: `Multiply ${a}/${b} by ${d}/${d} and ${c}/${d} by ${b}/${b} to get ${right}.`,
        },
        {
          index: 1,
          roundType: "missing_working",
          difficultyLabel: "Round 2 · Complete the Step",
          calculatorAllowed: false,
          promptText: `Complete the Keep-Change-Flip working step for ${p}/${q} ÷ ${r}/${s}:`,
          spokenPrompt: `Round two. Complete the Keep Change Flip step for ${p} over ${q} divided by ${r} over ${s}.`,
          hintSpoken: `Flip the second fraction ${r}/${s} upside down when changing divide to multiply.`,
          canonicalAnswer: flipped,
          workingLines: [
            `Question: ${p}/${q} ÷ ${r}/${s}`,
            `Step 1 (Keep-Change-Flip): ${p}/${q} × [ ? ]`,
            `Step 2: Multiply tops and bottoms = ${p * s}/${q * r}`,
          ],
          choices: shuffle([flipped, `${r}/${s}`, `${q}/${p}`, `${p}/${s}`]),
          workedSolution: `Dividing by ${r}/${s} is the same as multiplying by its reciprocal ${flipped}.`,
        },
      ];
    }

    case "reverse-percentages": {
      const r = pick([15, 20, 25]);
      const sale = pick([68, 80, 120]);
      const mult = (1 - r / 100).toFixed(2);
      const right = `£${sale} ÷ ${mult}`;
      const wrong1 = `£${sale} × ${(1 + r / 100).toFixed(2)}`;
      const wrong2 = `£${sale} × ${mult}`;
      const wrong3 = `£${sale} + ${r}`;

      const rise = pick([10, 20, 25]);
      const riseMult = (1 + rise / 100).toFixed(2);

      return [
        {
          index: 0,
          roundType: "step_choice",
          difficultyLabel: "Round 1 · Spot the Working",
          calculatorAllowed: false,
          promptText: `In a ${r}% off sale, trainers cost £${sale}. Which working step finds the ORIGINAL price?`,
          spokenPrompt: `Round one. In a ${r} percent sale, trainers cost ${sale} pounds. Pick the working step that finds the original price.`,
          hintSpoken:
            "Never add the percentage onto the sale price — divide by the remaining decimal multiplier!",
          canonicalAnswer: right,
          choices: shuffle([right, wrong1, wrong2, wrong3]),
          workedSolution: `Original × ${mult} = £${sale}, so Original = ${right}.`,
        },
        {
          index: 1,
          roundType: "missing_working",
          difficultyLabel: "Round 2 · Complete the Step",
          calculatorAllowed: false,
          promptText: `After a ${rise}% pay rise, Alex earns £300. Fill in the missing divisor [ ? ]:`,
          spokenPrompt: `Round two. After a ${rise} percent pay rise, Alex earns 300 pounds. Fill in the missing divisor.`,
          hintSpoken: `100% plus ${rise}% equals ${100 + rise}%, written as ${riseMult}.`,
          canonicalAnswer: riseMult,
          workingLines: [
            `Step 1: New pay is ${100 + rise}% of old pay`,
            "Step 2: Old pay × [ ? ] = £300",
            "Step 3: Old pay = £300 ÷ [ ? ]",
          ],
          choices: shuffle([
            riseMult,
            (1 - rise / 100).toFixed(2),
            `0.${rise}`,
            String(rise),
          ]),
          workedSolution: `Divide £300 by ${riseMult} to reverse a ${rise}% increase.`,
        },
      ];
    }

    case "ratio-sharing": {
      const [a, b] = pick([
        [3, 5],
        [2, 7],
        [4, 5],
      ] as const);
      const total = (a + b) * 10;
      const right = `£${total} ÷ ${a + b}`;
      const wrong1 = `£${total} ÷ ${a}`;
      const wrong2 = `£${total} ÷ ${b - a}`;
      const wrong3 = `£${total} × ${a}`;

      const diffParts = b - a;
      const diffMoney = diffParts * 8;

      return [
        {
          index: 0,
          roundType: "step_choice",
          difficultyLabel: "Round 1 · Spot the Working",
          calculatorAllowed: false,
          promptText: `£${total} is shared in the ratio ${a} : ${b}. Which first step finds the value of 1 part?`,
          spokenPrompt: `Round one. ${total} pounds is shared in the ratio ${a} to ${b}. Which step finds 1 part?`,
          hintSpoken: `Add the ratio parts (${a} + ${b}) and divide the total by that sum.`,
          canonicalAnswer: right,
          choices: shuffle([right, wrong1, wrong2, wrong3]),
          workedSolution: `Total parts = ${a} + ${b} = ${a + b}, so 1 part = ${right}.`,
        },
        {
          index: 1,
          roundType: "missing_working",
          difficultyLabel: "Round 2 · Complete the Step",
          calculatorAllowed: false,
          promptText: `Sam and Jo share money in the ratio ${a} : ${b}. Jo gets £${diffMoney} MORE than Sam. Fill in [ ? ] parts:`,
          spokenPrompt: `Round two. Jo gets ${diffMoney} pounds more than Sam in the ratio ${a} to ${b}. How many extra parts is that?`,
          hintSpoken: `Find the difference between ${b} parts and ${a} parts.`,
          canonicalAnswer: String(diffParts),
          workingLines: [
            `Step 1: Extra parts for Jo = ${b} − ${a} = [ ? ] parts`,
            `Step 2: 1 part = £${diffMoney} ÷ [ ? ] = £8`,
            `Step 3: Sam's share = ${a} × £8 = £${a * 8}`,
          ],
          choices: shuffle([
            String(diffParts),
            String(a + b),
            String(a),
            String(b),
          ]),
          workedSolution: `"More than" means subtract the ratio parts: ${b} − ${a} = ${diffParts} parts.`,
        },
      ];
    }

    case "solving-linear-equations": {
      const a = pick([3, 4, 5]);
      const b = pick([6, 8, 10]);
      const x = pick([4, 5, 7]);
      const c = a * x - b;
      const right = `${a}x = ${c + b}`;
      const wrong1 = `${a}x = ${c - b}`;
      const wrong2 = `x = ${c} ÷ ${a} + ${b}`;
      const wrong3 = `${a - b}x = ${c}`;

      return [
        {
          index: 0,
          roundType: "step_choice",
          difficultyLabel: "Round 1 · Spot the Working",
          calculatorAllowed: false,
          promptText: `Solve ${a}x − ${b} = ${c}. Which is the correct first inverse-operation step?`,
          spokenPrompt: `Round one. Solve ${a} x minus ${b} equals ${c}. Pick the right first step.`,
          hintSpoken: `Undo minus ${b} by adding ${b} to both sides.`,
          canonicalAnswer: right,
          choices: shuffle([right, wrong1, wrong2, wrong3]),
          workedSolution: `Add ${b} to both sides: ${a}x = ${c} + ${b} = ${c + b}.`,
        },
        {
          index: 1,
          roundType: "missing_working",
          difficultyLabel: "Round 2 · Complete the Step",
          calculatorAllowed: false,
          promptText: "Complete the missing step to solve 5x + 4 = 2x + 19:",
          spokenPrompt:
            "Round two. Complete the missing step when solving 5 x plus 4 equals 2 x plus 19.",
          hintSpoken: "Subtract 2x from both sides so x is only on the left.",
          canonicalAnswer: "3x",
          workingLines: [
            "Equation: 5x + 4 = 2x + 19",
            "Step 1 (subtract 2x): [ ? ] + 4 = 19",
            "Step 2 (subtract 4): 3x = 15 ⇒ x = 5",
          ],
          choices: shuffle(["3x", "7x", "5x", "2x"]),
          workedSolution: "5x − 2x = 3x, leaving 3x + 4 = 19.",
        },
      ];
    }

    default: {
      // Universal working-step builder leveraging generateProceduralQuiz so all 14 topics get 2 working rounds + 3 solve rounds!
      const extra = generateProceduralQuiz(topicSlug, "foundation");
      const r0 = extra[0];
      const r1 = extra[1];
      if (!r0 || !r1) {
        throw new Error(`Missing procedural template for ${topicSlug}`);
      }

      const num0 = Number(r0.canonicalAnswer);
      const distractors0 = Number.isFinite(num0)
        ? [
            String(num0 + 2),
            String(Math.max(1, num0 - 1)),
            String(num0 * 2 + 1),
          ]
        : ["1/2", "2/3", "5/4"];

      const num1 = Number(r1.canonicalAnswer);
      const distractors1 = Number.isFinite(num1)
        ? [String(num1 + 3), String(Math.max(0, num1 - 2)), String(num1 + 5)]
        : ["3/4", "1/3", "7/8"];

      return [
        {
          ...r0,
          index: 0,
          roundType: "step_choice",
          difficultyLabel: "Round 1 · Quick Pick",
          choices: shuffle(
            Array.from(new Set([r0.canonicalAnswer, ...distractors0])).slice(
              0,
              4
            )
          ),
        },
        {
          ...r1,
          index: 1,
          roundType: "missing_working",
          difficultyLabel: "Round 2 · Complete the Step",
          workingLines: [
            `Method clue: ${r1.hintSpoken}`,
            "Final value = [ ? ]",
          ],
          choices: shuffle(
            Array.from(new Set([r1.canonicalAnswer, ...distractors1])).slice(
              0,
              4
            )
          ),
        },
      ];
    }
  }
}

export function generateTopicGameRounds(
  topicSlug: string,
  tier: EdexcelTier = "foundation"
): StoredQuizQuestion[] {
  const [round1, round2] = buildWorkingRoundsForTopic(topicSlug);
  const baseQuiz = generateProceduralQuiz(topicSlug, tier);
  const qFluency = baseQuiz[0] ?? round1;
  const qExam = baseQuiz[2] ?? baseQuiz[1] ?? round2;
  const qBoss = baseQuiz[4] ?? baseQuiz[3] ?? qExam;

  return [
    round1,
    round2,
    {
      ...qFluency,
      index: 2,
      roundType: "fluency_solve",
      difficultyLabel: "Round 3 · Combo Builder",
      spokenPrompt: qFluency.spokenPrompt.replace(
        /^Question \w+\./i,
        "Round three."
      ),
    },
    {
      ...qExam,
      index: 3,
      roundType: "exam_solve",
      difficultyLabel: "Round 4 · Edexcel Exam Solve",
      spokenPrompt: qExam.spokenPrompt.replace(
        /^Question \w+\./i,
        "Round four."
      ),
    },
    {
      ...qBoss,
      index: 4,
      roundType: "boss_solve",
      difficultyLabel: "Round 5 · Boss Challenge (2x XP!)",
      spokenPrompt: qBoss.spokenPrompt.replace(
        /^Question \w+\./i,
        "Final Boss Round."
      ),
    },
  ];
}
