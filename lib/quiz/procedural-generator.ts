import { randomInt } from "node:crypto";
import type { EdexcelTier, StoredQuizQuestion } from "@/lib/db/schema";

export type PublicQuizQuestion = {
  index: number;
  difficultyLabel: string;
  calculatorAllowed: boolean;
  promptText: string;
  spokenPrompt: string;
  unit?: string;
};

export function toPublicQuizQuestion(
  q: StoredQuizQuestion
): PublicQuizQuestion {
  return {
    index: q.index,
    difficultyLabel: q.difficultyLabel,
    calculatorAllowed: q.calculatorAllowed,
    promptText: q.promptText,
    spokenPrompt: q.spokenPrompt,
    unit: q.unit,
  };
}

function pick<T>(items: readonly T[]): T {
  const idx = randomInt(0, items.length);
  const chosen = items[idx];
  if (chosen === undefined) {
    throw new Error("Empty pick array");
  }
  return chosen;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function formatSimplifiedFraction(
  num: number,
  den: number
): { canonical: string; variants: string[] } {
  const g = gcd(num, den);
  const sNum = num / g;
  const sDen = den / g;
  const variants = new Set<string>();
  variants.add(`${num}/${den}`);
  if (sDen === 1) {
    variants.add(String(sNum));
    return { canonical: String(sNum), variants: Array.from(variants) };
  }
  const canonical = `${sNum}/${sDen}`;
  variants.add(canonical);
  if (sNum > sDen) {
    const whole = Math.floor(sNum / sDen);
    const rem = sNum % sDen;
    if (rem > 0) {
      variants.add(`${whole} ${rem}/${sDen}`);
    }
  }
  return { canonical, variants: Array.from(variants) };
}

function genCompoundInterest(): StoredQuizQuestion[] {
  const rInc = pick([3, 4, 6, 7, 8, 9, 12, 14]);
  const multInc = (1 + rInc / 100).toFixed(2);

  const rDec = pick([5, 8, 12, 15, 18, 22]);
  const multDec = (1 - rDec / 100).toFixed(2);

  const p1 = pick([600, 800, 1200, 1500, 2000, 2500, 3000]);
  const r1 = pick([2, 3, 4, 5, 6]);
  const n1 = pick([2, 3, 4]);
  const m1 = 1 + r1 / 100;
  const ans1 = (p1 * m1 ** n1).toFixed(2);

  const pCar = pick([8000, 10_000, 12_000, 15_000, 16_000]);
  const rCar = pick([10, 12, 15, 20]);
  const nCar = pick([2, 3]);
  const mCar = 1 - rCar / 100;
  const rawCar = pCar * mCar ** nCar;
  const ansCar = Number.isInteger(Math.round(rawCar * 100) / 100)
    ? String(Math.round(rawCar))
    : rawCar.toFixed(2);

  const pInt = pick([1500, 2000, 4000, 5000]);
  const rInt = pick([3, 4, 5]);
  const nInt = pick([2, 3]);
  const mInt = 1 + rInt / 100;
  const totalInterest = (pInt * mInt ** nInt - pInt).toFixed(2);

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `Write the single decimal multiplier for a ${rInc}% increase.`,
      spokenPrompt: `Question one. Write the single decimal multiplier for a ${rInc} percent increase.`,
      hintSpoken: `Add ${rInc} percent to one hundred percent, then divide by one hundred.`,
      canonicalAnswer: multInc,
      workedSolution: `100% + ${rInc}% = ${100 + rInc}% = ${multInc}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `Write the single decimal multiplier for a ${rDec}% depreciation (decrease).`,
      spokenPrompt: `Question two. Write the single decimal multiplier for a ${rDec} percent decrease.`,
      hintSpoken: `Subtract ${rDec} from one hundred percent, then convert to a decimal.`,
      canonicalAnswer: multDec,
      workedSolution: `100% - ${rDec}% = ${100 - rDec}% = ${multDec}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: true,
      promptText: `£${p1} is invested at ${r1}% compound interest per year for ${n1} years. Calculate the total value at the end of ${n1} years (to 2 d.p.).`,
      spokenPrompt: `Question three. ${p1} pounds is invested at ${r1} percent compound interest per year for ${n1} years. Calculate the total value at the end of ${n1} years, to two decimal places.`,
      hintSpoken: `Multiply ${p1} by the decimal multiplier raised to the power of ${n1}.`,
      canonicalAnswer: ans1,
      acceptedVariants: [`£${ans1}`],
      unit: "£",
      workedSolution: `£${p1} × ${m1.toFixed(2)}^${n1} = £${ans1}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: true,
      promptText: `A van costs £${pCar} new and depreciates by ${rCar}% each year. Work out its value after ${nCar} years.`,
      spokenPrompt: `Question four. A van costs ${pCar} pounds new and depreciates by ${rCar} percent each year. Work out its value after ${nCar} years.`,
      hintSpoken: `Find the decay multiplier for a ${rCar} percent drop, then raise it to the power of ${nCar}.`,
      canonicalAnswer: ansCar,
      acceptedVariants: [
        rawCar.toFixed(2),
        `£${ansCar}`,
        `£${rawCar.toFixed(2)}`,
      ],
      unit: "£",
      workedSolution: `£${pCar} × ${mCar.toFixed(2)}^${nCar} = £${ansCar}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: true,
      promptText: `£${pInt} is placed in a savings account paying ${rInt}% compound interest per year for ${nInt} years. Work out ONLY the total interest earned (to 2 d.p.).`,
      spokenPrompt: `Question five. ${pInt} pounds is placed in a savings account paying ${rInt} percent compound interest per year for ${nInt} years. Work out only the total interest earned.`,
      hintSpoken: `First calculate the final balance after ${nInt} years, then subtract the starting ${pInt} pounds.`,
      canonicalAnswer: totalInterest,
      acceptedVariants: [`£${totalInterest}`],
      unit: "£",
      workedSolution: `Final = £${pInt} × ${mInt.toFixed(2)}^${nInt} = £${(pInt * mInt ** nInt).toFixed(2)}. Interest = Final - £${pInt} = £${totalInterest}.`,
    },
  ];
}

function genFractionsOperations(): StoredQuizQuestion[] {
  const pair1 = pick([
    [1, 3, 1, 4],
    [2, 5, 1, 3],
    [1, 2, 2, 7],
    [3, 4, 1, 5],
    [2, 3, 1, 5],
  ] as const);
  const [a1, b1, c1, d1] = pair1;
  const addAns = formatSimplifiedFraction(a1 * d1 + c1 * b1, b1 * d1);

  const pair2 = pick([
    [3, 4, 1, 3],
    [4, 5, 1, 2],
    [5, 6, 1, 4],
    [2, 3, 2, 5],
    [7, 8, 1, 4],
  ] as const);
  const [a2, b2, c2, d2] = pair2;
  const subAns = formatSimplifiedFraction(a2 * d2 - c2 * b2, b2 * d2);

  const pair3 = pick([
    [2, 3, 3, 5],
    [3, 4, 2, 9],
    [4, 5, 5, 8],
    [3, 7, 7, 9],
    [2, 5, 3, 4],
  ] as const);
  const [a3, b3, c3, d3] = pair3;
  const mulAns = formatSimplifiedFraction(a3 * c3, b3 * d3);

  const pair4 = pick([
    [3, 4, 1, 2],
    [2, 5, 3, 10],
    [5, 6, 2, 3],
    [3, 8, 3, 4],
    [4, 9, 2, 3],
  ] as const);
  const [a4, b4, c4, d4] = pair4;
  const divAns = formatSimplifiedFraction(a4 * d4, b4 * c4);

  const whole = pick([1, 2]);
  const pair5 = pick([
    [1, 2, 2, 3],
    [1, 3, 3, 4],
    [2, 5, 1, 2],
    [3, 4, 2, 5],
  ] as const);
  const [a5, b5, c5, d5] = pair5;
  const impNum = whole * b5 + a5;
  const stretchAns = formatSimplifiedFraction(impNum * d5 + c5 * b5, b5 * d5);

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `Work out ${a1}/${b1} + ${c1}/${d1}. Give your answer as a simplified fraction.`,
      spokenPrompt: `Question one. Work out ${a1} over ${b1}, plus ${c1} over ${d1}.`,
      hintSpoken: `Convert both fractions to a common denominator of ${b1 * d1} before adding the numerators.`,
      canonicalAnswer: addAns.canonical,
      acceptedVariants: addAns.variants,
      workedSolution: `${a1}/${b1} + ${c1}/${d1} = ${a1 * d1}/${b1 * d1} + ${c1 * b1}/${b1 * d1} = ${addAns.canonical}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `Work out ${a2}/${b2} − ${c2}/${d2} in simplest form.`,
      spokenPrompt: `Question two. Work out ${a2} over ${b2}, minus ${c2} over ${d2}.`,
      hintSpoken: `Find the lowest common multiple of ${b2} and ${d2}, rewrite both fractions, then subtract.`,
      canonicalAnswer: subAns.canonical,
      acceptedVariants: subAns.variants,
      workedSolution: `${a2}/${b2} − ${c2}/${d2} = ${subAns.canonical}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `Work out ${a3}/${b3} × ${c3}/${d3}. Simplify your answer fully.`,
      spokenPrompt: `Question three. Multiply ${a3} over ${b3} by ${c3} over ${d3}, and simplify fully.`,
      hintSpoken:
        "Multiply the numerators together, multiply the denominators together, then divide by any common factor.",
      canonicalAnswer: mulAns.canonical,
      acceptedVariants: mulAns.variants,
      workedSolution: `(${a3} × ${c3}) / (${b3} × ${d3}) = ${a3 * c3}/${b3 * d3} = ${mulAns.canonical}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: false,
      promptText: `Work out ${a4}/${b4} ÷ ${c4}/${d4}. Give your answer in simplest form (improper fraction or mixed number).`,
      spokenPrompt: `Question four. Divide ${a4} over ${b4} by ${c4} over ${d4}.`,
      hintSpoken: `Keep the first fraction, flip ${c4} over ${d4} upside down, and multiply.`,
      canonicalAnswer: divAns.canonical,
      acceptedVariants: divAns.variants,
      workedSolution: `${a4}/${b4} × ${d4}/${c4} = ${a4 * d4}/${b4 * c4} = ${divAns.canonical}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: false,
      promptText: `Work out ${whole} ${a5}/${b5} + ${c5}/${d5}. Give your answer as a simplified improper fraction (e.g. a/b) or mixed number.`,
      spokenPrompt: `Question five. Work out ${whole} and ${a5} over ${b5}, plus ${c5} over ${d5}.`,
      hintSpoken: `First turn ${whole} and ${a5} over ${b5} into an improper fraction over ${b5}, then use a common denominator.`,
      canonicalAnswer: stretchAns.canonical,
      acceptedVariants: stretchAns.variants,
      workedSolution: `${whole} ${a5}/${b5} = ${impNum}/${b5}. Adding ${c5}/${d5} gives ${stretchAns.canonical}.`,
    },
  ];
}

function genReversePercentages(): StoredQuizQuestion[] {
  const r0 = pick([15, 20, 25, 30]);
  const mult0 = (1 - r0 / 100).toFixed(2).replace(/0$/, "");

  const orig1 = pick([60, 80, 120, 140, 160, 220]);
  const r1 = pick([15, 20, 25]);
  const sale1 = orig1 * (1 - r1 / 100);

  const orig2 = pick([150, 200, 250, 300, 400, 500]);
  const r2 = pick([10, 12, 20, 24]);
  const inc2 = orig2 * (1 + r2 / 100);

  const orig3 = pick([40, 50, 80, 120]);
  const r3 = pick([5, 10, 15, 25]);
  const inc3 = orig3 * (1 + r3 / 100);

  const orig4 = pick([100, 150, 200, 250, 300]);
  const final4 = orig4 * 0.8 * 0.9; // exact integer since 0.72 * 50 = 36

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `In a ${r0}% off sale, what decimal multiplier represents the remaining percentage of the original price?`,
      spokenPrompt: `Question one. In a ${r0} percent off sale, what decimal multiplier represents the remaining percentage?`,
      hintSpoken: `Subtract ${r0} percent from 100 percent and write it as a decimal.`,
      canonicalAnswer: mult0,
      acceptedVariants: [(1 - r0 / 100).toFixed(2)],
      workedSolution: `100% − ${r0}% = ${100 - r0}% = ${mult0}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: true,
      promptText: `In a ${r1}% sale, a jacket is reduced to £${sale1}. Work out the original price before the sale.`,
      spokenPrompt: `Question two. In a ${r1} percent sale, a jacket costs ${sale1} pounds. What was the original price?`,
      hintSpoken: `Divide £${sale1} by the decimal multiplier for ${100 - r1} percent — do not add ${r1} percent onto the sale price!`,
      canonicalAnswer: String(orig1),
      acceptedVariants: [`£${orig1}`],
      unit: "£",
      workedSolution: `Original × ${1 - r1 / 100} = £${sale1} ⇒ Original = £${sale1} ÷ ${1 - r1 / 100} = £${orig1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: true,
      promptText: `After a ${r2}% pay rise, Sam earns £${inc2} per week. Work out Sam's weekly pay before the rise.`,
      spokenPrompt: `Question three. After a ${r2} percent pay rise, Sam earns ${inc2} pounds per week. Work out Sam's pay before the rise.`,
      hintSpoken: `£${inc2} represents ${100 + r2} percent of the old pay. Divide by ${1 + r2 / 100}.`,
      canonicalAnswer: String(orig2),
      acceptedVariants: [`£${orig2}`],
      unit: "£",
      workedSolution: `Old pay = £${inc2} ÷ ${1 + r2 / 100} = £${orig2}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: true,
      promptText: `A rail ticket increases by ${r3}% to £${inc3}. Calculate the price before the increase.`,
      spokenPrompt: `Question four. A rail ticket increases by ${r3} percent to ${inc3} pounds. Calculate the price before the increase.`,
      hintSpoken: `Divide the new fare by ${1 + r3 / 100}.`,
      canonicalAnswer: String(orig3),
      acceptedVariants: [`£${orig3}`],
      unit: "£",
      workedSolution: `£${inc3} ÷ ${1 + r3 / 100} = £${orig3}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: true,
      promptText: `A bike is discounted by 20% in a sale, and then reduced by a further 10% of the sale price. It now costs £${final4}. Find the original price of the bike.`,
      spokenPrompt: `Question five. A bike is discounted by 20 percent, and then reduced by a further 10 percent of the sale price. It now costs ${final4} pounds. Find the original price.`,
      hintSpoken:
        "Combine the two multipliers (0.8 times 0.9), then divide the final price by that combined multiplier.",
      canonicalAnswer: String(orig4),
      acceptedVariants: [`£${orig4}`],
      unit: "£",
      workedSolution: `Combined multiplier = 0.8 × 0.9 = 0.72. Original = £${final4} ÷ 0.72 = £${orig4}.`,
    },
  ];
}

function genRatioSharing(): StoredQuizQuestion[] {
  const [a0, b0] = pick([
    [2, 5],
    [3, 7],
    [4, 5],
    [3, 8],
    [5, 7],
  ] as const);

  const [a1, b1] = pick([
    [2, 3],
    [3, 5],
    [2, 7],
    [4, 5],
  ] as const);
  const part1 = pick([6, 8, 12, 15, 20]);
  const total1 = (a1 + b1) * part1;
  const larger1 = Math.max(a1, b1) * part1;

  const [a2, b2] = pick([
    [3, 4],
    [2, 5],
    [5, 6],
    [3, 7],
  ] as const);
  const part2 = pick([5, 7, 9, 11]);
  const total2 = (a2 + b2) * part2;
  const benShare = b2 * part2;

  const [a3, b3] = pick([
    [2, 5],
    [3, 7],
    [2, 7],
    [4, 9],
  ] as const);
  const part3 = pick([6, 8, 10, 12]);
  const diff3 = (b3 - a3) * part3;
  const alice3 = a3 * part3;

  const [a4, b4, c4] = pick([
    [2, 3, 5],
    [1, 4, 7],
    [2, 5, 8],
    [3, 4, 8],
  ] as const);
  const part4 = pick([6, 8, 10, 14]);
  const total4 = (a4 + b4 + c4) * part4;
  const range4 = (c4 - a4) * part4;

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `How many total equal parts are there in the ratio ${a0} : ${b0}?`,
      spokenPrompt: `Question one. How many total equal parts are there in the ratio ${a0} to ${b0}?`,
      hintSpoken: "Add the parts of the ratio together.",
      canonicalAnswer: String(a0 + b0),
      workedSolution: `${a0} + ${b0} = ${a0 + b0} parts.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `Share £${total1} in the ratio ${a1} : ${b1}. Work out the LARGER share.`,
      spokenPrompt: `Question two. Share ${total1} pounds in the ratio ${a1} to ${b1}. Work out the larger share.`,
      hintSpoken: `Divide £${total1} by the total parts to find 1 part, then multiply by ${Math.max(a1, b1)}.`,
      canonicalAnswer: String(larger1),
      acceptedVariants: [`£${larger1}`],
      unit: "£",
      workedSolution: `1 part = £${total1} ÷ ${a1 + b1} = £${part1}. Larger share = ${Math.max(a1, b1)} × £${part1} = £${larger1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `Amir and Ben share ${total2} marbles in the ratio ${a2} : ${b2}. How many marbles does Ben receive?`,
      spokenPrompt: `Question three. Amir and Ben share ${total2} marbles in the ratio ${a2} to ${b2}. How many marbles does Ben receive?`,
      hintSpoken: `Amir is first (${a2} parts) and Ben is second (${b2} parts). Find 1 part first.`,
      canonicalAnswer: String(benShare),
      workedSolution: `1 part = ${total2} ÷ ${a2 + b2} = ${part2}. Ben gets ${b2} × ${part2} = ${benShare}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: false,
      promptText: `Priya and Leo share a prize in the ratio ${a3} : ${b3}. Leo gets £${diff3} MORE than Priya. How much does Priya get?`,
      spokenPrompt: `Question four. Priya and Leo share a prize in the ratio ${a3} to ${b3}. Leo gets ${diff3} pounds more than Priya. How much does Priya get?`,
      hintSpoken: `£${diff3} represents the difference in parts (${b3} minus ${a3}), NOT the total parts!`,
      canonicalAnswer: String(alice3),
      acceptedVariants: [`£${alice3}`],
      unit: "£",
      workedSolution: `Difference = ${b3} − ${a3} = ${b3 - a3} parts = £${diff3} ⇒ 1 part = £${part3}. Priya = ${a3} × £${part3} = £${alice3}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: true,
      promptText: `£${total4} is split between three charities in the ratio ${a4} : ${b4} : ${c4}. Work out the difference between the largest share and the smallest share.`,
      spokenPrompt: `Question five. ${total4} pounds is split in the ratio ${a4} to ${b4} to ${c4}. Work out the difference between the largest and smallest shares.`,
      hintSpoken: `Divide £${total4} by (${a4} + ${b4} + ${c4}) to get 1 part, then multiply by (${c4} minus ${a4}).`,
      canonicalAnswer: String(range4),
      acceptedVariants: [`£${range4}`],
      unit: "£",
      workedSolution: `Total parts = ${a4 + b4 + c4}. 1 part = £${part4}. Difference = (${c4} − ${a4}) × £${part4} = £${range4}.`,
    },
  ];
}

function genIndicesStandardForm(): StoredQuizQuestion[] {
  const a0 = randomInt(2, 7);
  const b0 = randomInt(3, 8);

  const a1 = randomInt(2, 6);
  const b1 = randomInt(2, 5);

  const base2 = pick([3, 4, 5, 6, 7]);
  const ans2 = 1 + base2 * base2;

  const mant = pick([2.4, 3.7, 4.5, 6.2, 7.8, 9.1]);
  const pow = pick([3, 4, 5]);
  const ord = Math.round(mant * 10 ** pow);

  const fracCase = pick([
    {
      expr: "8^(2/3)",
      spoken: "8 to the power of two thirds",
      ans: 4,
      work: "(³√8)² = 2² = 4",
    },
    {
      expr: "27^(2/3)",
      spoken: "27 to the power of two thirds",
      ans: 9,
      work: "(³√27)² = 3² = 9",
    },
    {
      expr: "16^(3/4)",
      spoken: "16 to the power of three quarters",
      ans: 8,
      work: "(⁴√16)³ = 2³ = 8",
    },
    {
      expr: "64^(2/3)",
      spoken: "64 to the power of two thirds",
      ans: 16,
      work: "(³√64)² = 4² = 16",
    },
    {
      expr: "9^(3/2)",
      spoken: "9 to the power of three halves",
      ans: 27,
      work: "(√9)³ = 3³ = 27",
    },
    {
      expr: "4^(5/2)",
      spoken: "4 to the power of five halves",
      ans: 32,
      work: "(√4)⁵ = 2⁵ = 32",
    },
  ] as const);

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `Simplify 3^${a0} × 3^${b0} = 3^k. Write the value of the power k.`,
      spokenPrompt: `Question one. Simplify 3 to the power of ${a0} times 3 to the power of ${b0} equals 3 to the power of k. What is k?`,
      hintSpoken:
        "When multiplying powers with the same base, add the indices.",
      canonicalAnswer: String(a0 + b0),
      workedSolution: `k = ${a0} + ${b0} = ${a0 + b0}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `Simplify (x^${a1})^${b1} = x^k. Write the value of k.`,
      spokenPrompt: `Question two. Simplify x to the power of ${a1}, all raised to the power of ${b1}. What is the new index k?`,
      hintSpoken:
        "For a power raised to another power outside brackets, multiply the indices.",
      canonicalAnswer: String(a1 * b1),
      workedSolution: `k = ${a1} × ${b1} = ${a1 * b1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `Work out the exact value of 9^0 + ${base2}^2.`,
      spokenPrompt: `Question three. Work out the exact value of 9 to the power of zero, plus ${base2} squared.`,
      hintSpoken: "Remember any non-zero number to the power of zero equals 1!",
      canonicalAnswer: String(ans2),
      workedSolution: `9^0 + ${base2}^2 = 1 + ${base2 * base2} = ${ans2}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: false,
      promptText: `Write ${mant} × 10^${pow} as an ordinary number.`,
      spokenPrompt: `Question four. Write ${mant} times 10 to the power of ${pow} as an ordinary number.`,
      hintSpoken: `Shift the digits ${pow} place-value columns larger.`,
      canonicalAnswer: String(ord),
      workedSolution: `${mant} × 10^${pow} = ${ord}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: false,
      promptText: `Evaluate ${fracCase.expr} without a calculator.`,
      spokenPrompt: `Question five. Evaluate ${fracCase.spoken} without a calculator.`,
      hintSpoken:
        "Take the root given by the denominator first, then raise that result to the numerator.",
      canonicalAnswer: String(fracCase.ans),
      workedSolution: `${fracCase.expr} = ${fracCase.work}.`,
    },
  ];
}

function genSurds(): StoredQuizQuestion[] {
  const n0 = pick([5, 7, 11, 13, 17, 19]);

  const k1 = pick([2, 3, 4, 5, 6]);
  const p1 = pick([2, 3, 5]);
  const inside1 = k1 * k1 * p1;

  const prodPair = pick([
    { a: 2, b: 18, ans: 6 },
    { a: 3, b: 12, ans: 6 },
    { a: 5, b: 20, ans: 10 },
    { a: 2, b: 32, ans: 8 },
    { a: 3, b: 27, ans: 9 },
    { a: 6, b: 24, ans: 12 },
  ] as const);

  const a3 = pick([3, 4, 5, 6]);
  const b3 = pick([2, 3, 5, 7]);
  const dotsAns = a3 * a3 - b3;

  const p4 = pick([2, 3, 5, 7]);
  const k4 = pick([2, 3, 4, 5, 6]);
  const num4 = p4 * k4;

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `Write down the exact value of (√${n0})².`,
      spokenPrompt: `Question one. Write down the exact value of root ${n0}, all squared.`,
      hintSpoken: "Squaring undoes a square root.",
      canonicalAnswer: String(n0),
      workedSolution: `(√${n0})² = ${n0}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `√${inside1} can be simplified to a√${p1}. Find the integer a.`,
      spokenPrompt: `Question two. Root ${inside1} simplifies to a root ${p1}. Find the integer a.`,
      hintSpoken: `Split ${inside1} into a square number times ${p1}, then take the square root of the square factor.`,
      canonicalAnswer: String(k1),
      workedSolution: `√${inside1} = √(${k1 * k1} × ${p1}) = ${k1}√${p1}, so a = ${k1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `Work out the exact integer value of √${prodPair.a} × √${prodPair.b}.`,
      spokenPrompt: `Question three. Work out the exact integer value of root ${prodPair.a} times root ${prodPair.b}.`,
      hintSpoken: "Use √a × √b = √(a × b), then take the square root.",
      canonicalAnswer: String(prodPair.ans),
      workedSolution: `√(${prodPair.a} × ${prodPair.b}) = √${prodPair.a * prodPair.b} = ${prodPair.ans}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: false,
      promptText: `Expand and simplify (${a3} + √${b3})(${a3} − √${b3}).`,
      spokenPrompt: `Question four. Expand and simplify ${a3} plus root ${b3}, times ${a3} minus root ${b3}.`,
      hintSpoken:
        "Use difference of two squares: the middle surd terms cancel out!",
      canonicalAnswer: String(dotsAns),
      workedSolution: `${a3}² − (√${b3})² = ${a3 * a3} − ${b3} = ${dotsAns}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: false,
      promptText: `Rationalise the denominator: ${num4} / √${p4} simplifies to k√${p4}. Find the integer k.`,
      spokenPrompt: `Question five. Rationalise the denominator: ${num4} over root ${p4} simplifies to k root ${p4}. Find the integer k.`,
      hintSpoken: `Multiply top and bottom by root ${p4}, then divide ${num4} by ${p4}.`,
      canonicalAnswer: String(k4),
      workedSolution: `(${num4}√${p4}) / ${p4} = ${k4}√${p4}, so k = ${k4}.`,
    },
  ];
}

function genSolvingLinearEquations(): StoredQuizQuestion[] {
  const x0 = randomInt(4, 18);
  const a0 = randomInt(5, 16);
  const b0 = x0 + a0;

  const x1 = randomInt(3, 12);
  const a1 = randomInt(2, 6);
  const b1 = randomInt(3, 15);
  const c1 = a1 * x1 - b1;

  const x2 = randomInt(2, 11);
  const a2 = randomInt(2, 5);
  const b2 = randomInt(2, 9);
  const c2 = a2 * (x2 + b2);

  const x3 = randomInt(2, 10);
  const c3 = randomInt(2, 5);
  const a3 = c3 + randomInt(2, 5);
  const b3 = randomInt(1, 12);
  const d3 = (a3 - c3) * x3 + b3;

  const x4 = randomInt(3, 12);
  const a4 = randomInt(2, 4);
  const k4 = randomInt(4, 9);
  const d4 = randomInt(3, 6);
  const b4 = k4 * d4 - a4 * x4;
  const b4Sign = b4 >= 0 ? `+ ${b4}` : `− ${Math.abs(b4)}`;

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `Solve x + ${a0} = ${b0}.`,
      spokenPrompt: `Question one. Solve x plus ${a0} equals ${b0}.`,
      hintSpoken: `Subtract ${a0} from both sides.`,
      canonicalAnswer: String(x0),
      acceptedVariants: [`x=${x0}`],
      workedSolution: `x = ${b0} − ${a0} = ${x0}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `Solve ${a1}x − ${b1} = ${c1}.`,
      spokenPrompt: `Question two. Solve ${a1} x minus ${b1} equals ${c1}.`,
      hintSpoken: `Add ${b1} to both sides first, then divide by ${a1}.`,
      canonicalAnswer: String(x1),
      acceptedVariants: [`x=${x1}`],
      workedSolution: `${a1}x = ${c1 + b1} ⇒ x = ${x1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `Solve ${a2}(x + ${b2}) = ${c2}.`,
      spokenPrompt: `Question three. Solve ${a2} brackets x plus ${b2} close brackets equals ${c2}.`,
      hintSpoken: `Divide both sides by ${a2} (or expand the bracket first), then subtract ${b2}.`,
      canonicalAnswer: String(x2),
      acceptedVariants: [`x=${x2}`],
      workedSolution: `x + ${b2} = ${c2 / a2} ⇒ x = ${x2}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: false,
      promptText: `Solve ${a3}x + ${b3} = ${c3}x + ${d3}.`,
      spokenPrompt: `Question four. Solve ${a3} x plus ${b3} equals ${c3} x plus ${d3}.`,
      hintSpoken: `Subtract ${c3}x from both sides so all x terms are on the left.`,
      canonicalAnswer: String(x3),
      acceptedVariants: [`x=${x3}`],
      workedSolution: `${a3 - c3}x + ${b3} = ${d3} ⇒ ${a3 - c3}x = ${d3 - b3} ⇒ x = ${x3}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: false,
      promptText: `Solve (${a4}x ${b4Sign}) / ${d4} = ${k4}.`,
      spokenPrompt: `Question five. Solve the fraction ${a4} x ${b4 >= 0 ? "plus" : "minus"} ${Math.abs(b4)}, all divided by ${d4}, equals ${k4}.`,
      hintSpoken: `Multiply both sides by ${d4} first to clear the fraction!`,
      canonicalAnswer: String(x4),
      acceptedVariants: [`x=${x4}`],
      workedSolution: `${a4}x ${b4Sign} = ${k4 * d4} ⇒ ${a4}x = ${a4 * x4} ⇒ x = ${x4}.`,
    },
  ];
}

function genQuadratics(): StoredQuizQuestion[] {
  const a0 = randomInt(2, 8);
  const b0 = randomInt(2, 8);

  const a1 = randomInt(3, 9);
  const b1 = randomInt(2, 7);

  const posRoot = randomInt(2, 9);
  const negRoot = randomInt(2, 8);

  const rSmall = randomInt(2, 5);
  const rLarge = rSmall + randomInt(2, 5);
  const sumR = rSmall + rLarge;
  const prodR = rSmall * rLarge;

  const h = randomInt(2, 6);
  const c = randomInt(1, 15);
  const minVal = c - h * h;

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `When (x + ${a0})(x + ${b0}) is expanded into x² + px + q, what is the constant number q?`,
      spokenPrompt: `Question one. When x plus ${a0} times x plus ${b0} is expanded, what is the constant term q at the end?`,
      hintSpoken: "Multiply the two numbers in the brackets together.",
      canonicalAnswer: String(a0 * b0),
      workedSolution: `q = ${a0} × ${b0} = ${a0 * b0}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `When (x + ${a1})(x + ${b1}) is expanded into x² + px + q, what is the value of p (the coefficient of x)?`,
      spokenPrompt: `Question two. When x plus ${a1} times x plus ${b1} is expanded into x squared plus p x plus q, what is p?`,
      hintSpoken:
        "Combine the outer and inner x terms by adding the two constants.",
      canonicalAnswer: String(a1 + b1),
      workedSolution: `p = ${a1} + ${b1} = ${a1 + b1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `Solve (x − ${posRoot})(x + ${negRoot}) = 0. Write down the POSITIVE solution for x.`,
      spokenPrompt: `Question three. Solve x minus ${posRoot} times x plus ${negRoot} equals zero. Write down the positive solution for x.`,
      hintSpoken: "Set each bracket equal to zero — remember the sign flips!",
      canonicalAnswer: String(posRoot),
      acceptedVariants: [`x=${posRoot}`],
      workedSolution: `x − ${posRoot} = 0 gives x = ${posRoot} (and x + ${negRoot} = 0 gives x = −${negRoot}). Positive root = ${posRoot}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: false,
      promptText: `Factorise and solve x² − ${sumR}x + ${prodR} = 0. Give the LARGER value of x.`,
      spokenPrompt: `Question four. Factorise and solve x squared minus ${sumR} x plus ${prodR} equals zero. Give the larger value of x.`,
      hintSpoken: `Find two numbers that multiply to ${prodR} and add to ${sumR}.`,
      canonicalAnswer: String(rLarge),
      acceptedVariants: [`x=${rLarge}`],
      workedSolution: `(x − ${rSmall})(x − ${rLarge}) = 0 ⇒ x = ${rSmall} or x = ${rLarge}. Larger solution = ${rLarge}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: false,
      promptText: `By completing the square on y = x² + ${2 * h}x + ${c}, find the minimum y-value of the curve.`,
      spokenPrompt: `Question five. By completing the square on y equals x squared plus ${2 * h} x plus ${c}, find the minimum y value of the curve.`,
      hintSpoken: `Halve ${2 * h} to get (x + ${h})², then subtract ${h}² from ${c}.`,
      canonicalAnswer: String(minVal),
      workedSolution: `y = (x + ${h})² − ${h * h} + ${c} = (x + ${h})² ${minVal >= 0 ? `+ ${minVal}` : `− ${Math.abs(minVal)}`}. Minimum y-value = ${minVal}.`,
    },
  ];
}

function genSimultaneousEquations(): StoredQuizQuestion[] {
  const x0 = randomInt(5, 11);
  const y0 = randomInt(1, 5);

  const x1 = randomInt(6, 12);
  const y1 = randomInt(2, 6);

  const x2 = randomInt(2, 9);
  const y2 = randomInt(2, 8);
  const r2a = 2 * x2 + y2;
  const r2b = x2 + y2;

  const x3 = randomInt(2, 7);
  const y3 = randomInt(2, 6);
  const b3 = randomInt(2, 4);
  const r3a = 3 * x3 + b3 * y3;
  const r3b = 2 * x3 - b3 * y3;

  const tea = pick([2, 3]);
  const coffee = pick([3, 4, 5]);
  const eqA = 2 * tea + 3 * coffee;
  const eqB = 2 * tea + 1 * coffee;

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `Given x + y = ${x0 + y0} and x − y = ${x0 - y0}, find the value of x.`,
      spokenPrompt: `Question one. Given x plus y equals ${x0 + y0}, and x minus y equals ${x0 - y0}, find x.`,
      hintSpoken: "Add the two equations together so +y and −y cancel out!",
      canonicalAnswer: String(x0),
      acceptedVariants: [`x=${x0}`],
      workedSolution: `2x = ${2 * x0} ⇒ x = ${x0}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `Given x + y = ${x1 + y1} and x − y = ${x1 - y1}, find the value of y.`,
      spokenPrompt: `Question two. Given x plus y equals ${x1 + y1}, and x minus y equals ${x1 - y1}, find y.`,
      hintSpoken:
        "Subtract the second equation from the first (or find x first and substitute back).",
      canonicalAnswer: String(y1),
      acceptedVariants: [`y=${y1}`],
      workedSolution: `x = ${x1}, so y = ${x1 + y1} − ${x1} = ${y1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `Solve simultaneously: 2x + y = ${r2a} and x + y = ${r2b}. Find x.`,
      spokenPrompt: `Question three. Solve simultaneously: 2 x plus y equals ${r2a}, and x plus y equals ${r2b}. Find x.`,
      hintSpoken:
        "Same sign on +y, so subtract the second equation from the first.",
      canonicalAnswer: String(x2),
      acceptedVariants: [`x=${x2}`],
      workedSolution: `(2x + y) − (x + y) = ${r2a} − ${r2b} ⇒ x = ${x2}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: false,
      promptText: `Solve simultaneously: 3x + ${b3}y = ${r3a} and 2x − ${b3}y = ${r3b}. Find x.`,
      spokenPrompt: `Question four. Solve simultaneously: 3 x plus ${b3} y equals ${r3a}, and 2 x minus ${b3} y equals ${r3b}. Find x.`,
      hintSpoken: `+${b3}y and −${b3}y have opposite signs — add the two equations together!`,
      canonicalAnswer: String(x3),
      acceptedVariants: [`x=${x3}`],
      workedSolution: `5x = ${r3a + r3b} ⇒ x = ${x3}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: false,
      promptText: `At a café, 2 teas and 3 coffees cost £${eqA}. 2 teas and 1 coffee cost £${eqB}. Work out the cost of 1 coffee.`,
      spokenPrompt: `Question five. At a cafe, 2 teas and 3 coffees cost ${eqA} pounds. 2 teas and 1 coffee cost ${eqB} pounds. Work out the cost of 1 coffee.`,
      hintSpoken:
        "Subtract the second order from the first order to eliminate the 2 teas!",
      canonicalAnswer: String(coffee),
      acceptedVariants: [`£${coffee}`],
      unit: "£",
      workedSolution: `2 coffees = £${eqA} − £${eqB} = £${2 * coffee} ⇒ 1 coffee = £${coffee}.`,
    },
  ];
}

function genSequencesNthTerm(): StoredQuizQuestion[] {
  const d0 = randomInt(3, 8);
  const start0 = randomInt(2, 11);

  const a1 = randomInt(3, 7);
  const b1 = randomInt(1, 9);
  const k1 = pick([10, 12, 15, 20]);

  const d2 = randomInt(4, 9);
  const s2 = randomInt(1, 7);

  const d3 = randomInt(3, 7);
  const b3 = randomInt(-4, 6);
  const term50 = d3 * 50 + b3;

  const c4 = randomInt(2, 9);
  const k4 = randomInt(6, 10);
  const ans4 = k4 * k4 + c4;

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `Find the next term in the linear sequence: ${start0}, ${start0 + d0}, ${start0 + 2 * d0}, ${start0 + 3 * d0}, ...`,
      spokenPrompt: `Question one. Find the next term in the sequence: ${start0}, ${start0 + d0}, ${start0 + 2 * d0}, ${start0 + 3 * d0}.`,
      hintSpoken:
        "Find the constant gap between consecutive terms and add it once more.",
      canonicalAnswer: String(start0 + 4 * d0),
      workedSolution: `Common difference = +${d0}. Next term = ${start0 + 3 * d0} + ${d0} = ${start0 + 4 * d0}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `The nth term of a sequence is ${a1}n + ${b1}. Work out the ${k1}th term.`,
      spokenPrompt: `Question two. The nth term of a sequence is ${a1} n plus ${b1}. Work out the ${k1}th term.`,
      hintSpoken: `Substitute n = ${k1} into ${a1}n + ${b1}.`,
      canonicalAnswer: String(a1 * k1 + b1),
      workedSolution: `${a1} × ${k1} + ${b1} = ${a1 * k1 + b1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `The sequence ${s2}, ${s2 + d2}, ${s2 + 2 * d2}, ${s2 + 3 * d2}, ... has nth term an + b. Write down the value of a.`,
      spokenPrompt: `Question three. The sequence ${s2}, ${s2 + d2}, ${s2 + 2 * d2}, ${s2 + 3 * d2} has nth term a n plus b. What is a?`,
      hintSpoken:
        "In an + b, the coefficient a is always the term-to-term difference.",
      canonicalAnswer: String(d2),
      workedSolution: `Term-to-term jump = +${d2}, so a = ${d2}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: false,
      promptText: `Work out the 50th term of the linear sequence: ${d3 + b3}, ${2 * d3 + b3}, ${3 * d3 + b3}, ${4 * d3 + b3}, ...`,
      spokenPrompt: `Question four. Work out the fiftieth term of the sequence: ${d3 + b3}, ${2 * d3 + b3}, ${3 * d3 + b3}, ${4 * d3 + b3}.`,
      hintSpoken:
        "Find the nth term formula dn + b first, then substitute n = 50.",
      canonicalAnswer: String(term50),
      workedSolution: `nth term = ${d3}n ${b3 >= 0 ? `+ ${b3}` : `− ${Math.abs(b3)}`}. 50th term = ${d3}(50) ${b3 >= 0 ? `+ ${b3}` : `− ${Math.abs(b3)}`} = ${term50}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: false,
      promptText: `A quadratic sequence has nth term n² + ${c4}. Calculate the ${k4}th term of this sequence.`,
      spokenPrompt: `Question five. A quadratic sequence has nth term n squared plus ${c4}. Calculate the ${k4}th term.`,
      hintSpoken: `Square ${k4} first, then add ${c4}.`,
      canonicalAnswer: String(ans4),
      workedSolution: `${k4}² + ${c4} = ${k4 * k4} + ${c4} = ${ans4}.`,
    },
  ];
}

function genPythagorasSohcahtoa(): StoredQuizQuestion[] {
  const triple0 = pick([
    [3, 4, 5],
    [6, 8, 10],
    [5, 12, 13],
    [9, 12, 15],
    [8, 15, 17],
  ] as const);

  const triple1 = pick([
    [5, 12, 13],
    [6, 8, 10],
    [8, 15, 17],
    [7, 24, 25],
    [12, 16, 20],
  ] as const);

  const hyp2 = pick([14, 18, 22, 26, 30, 34]);
  const opp2 = hyp2 / 2;

  const hyp3 = pick([10, 12, 15, 18, 20]);
  const angle3 = pick([35, 40, 50, 55]);
  const opp3 = (hyp3 * Math.sin((angle3 * Math.PI) / 180)).toFixed(1);

  const isoTriple = pick([
    [3, 4, 5],
    [5, 12, 13],
    [6, 8, 10],
    [8, 15, 17],
  ] as const);
  const halfBase = isoTriple[0];
  const height = isoTriple[1];
  const slant = isoTriple[2];
  const isoArea = halfBase * height; // (1/2) * (2 * halfBase) * height = halfBase * height

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: true,
      promptText: `A right-angled triangle has shorter sides ${triple0[0]} cm and ${triple0[1]} cm. Find the length of the hypotenuse.`,
      spokenPrompt: `Question one. A right-angled triangle has shorter sides ${triple0[0]} centimetres and ${triple0[1]} centimetres. Find the hypotenuse.`,
      hintSpoken:
        "Square both shorter sides, add them together, then take the square root.",
      canonicalAnswer: String(triple0[2]),
      unit: "cm",
      workedSolution: `√(${triple0[0]}² + ${triple0[1]}²) = √${triple0[2] ** 2} = ${triple0[2]} cm.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: true,
      promptText: `A right-angled triangle has hypotenuse ${triple1[2]} cm and one shorter side ${triple1[1]} cm. Find the other shorter side.`,
      spokenPrompt: `Question two. A right-angled triangle has hypotenuse ${triple1[2]} centimetres and one shorter side ${triple1[1]} centimetres. Find the missing shorter side.`,
      hintSpoken:
        "Finding a shorter side? Subtract the squares before square rooting!",
      canonicalAnswer: String(triple1[0]),
      unit: "cm",
      workedSolution: `√(${triple1[2]}² − ${triple1[1]}²) = √${triple1[0] ** 2} = ${triple1[0]} cm.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `Without a calculator: a right-angled triangle has hypotenuse ${hyp2} cm and an angle of 30°. Find the side OPPOSITE the 30° angle.`,
      spokenPrompt: `Question three. Without a calculator, a right-angled triangle has hypotenuse ${hyp2} centimetres and an angle of 30 degrees. Find the opposite side.`,
      hintSpoken: "Recall exact trig values: sin(30°) equals one half!",
      canonicalAnswer: String(opp2),
      unit: "cm",
      workedSolution: `Opposite = ${hyp2} × sin(30°) = ${hyp2} × 0.5 = ${opp2} cm.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: true,
      promptText: `A right-angled triangle has hypotenuse ${hyp3} cm and angle ${angle3}°. Calculate the length of the OPPOSITE side, rounded to 1 decimal place.`,
      spokenPrompt: `Question four. A right-angled triangle has hypotenuse ${hyp3} centimetres and angle ${angle3} degrees. Calculate the opposite side to one decimal place.`,
      hintSpoken: `Use SOH: Opposite = Hypotenuse × sin(${angle3}°). Make sure your calculator is in Degree mode.`,
      canonicalAnswer: opp3,
      unit: "cm",
      workedSolution: `${hyp3} × sin(${angle3}°) = ${opp3} cm (1 d.p.).`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: true,
      promptText: `An isosceles triangle has base ${2 * halfBase} cm and two equal sloping sides of ${slant} cm. Calculate the AREA of the triangle.`,
      spokenPrompt: `Question five. An isosceles triangle has base ${2 * halfBase} centimetres and two equal sloping sides of ${slant} centimetres. Calculate the area of the triangle.`,
      hintSpoken: `Split the base in half (${halfBase} cm) to form a right-angled triangle, find the perpendicular height with Pythagoras, then use half base times height.`,
      canonicalAnswer: String(isoArea),
      unit: "cm²",
      workedSolution: `Half-base = ${halfBase} cm ⇒ height = √(${slant}² − ${halfBase}²) = ${height} cm. Area = ½ × ${2 * halfBase} × ${height} = ${isoArea} cm².`,
    },
  ];
}

function genCirclesSectors(): StoredQuizQuestion[] {
  const r0 = randomInt(4, 15);
  const r1 = randomInt(3, 12);
  const d2 = pick([8, 10, 12, 14, 16, 20]);
  const circ2 = (Math.PI * d2).toFixed(1);

  const angle3 = pick([60, 90, 120, 180]);
  const r3 = pick([6, 12]);
  const k3 = (angle3 / 360) * r3 * r3;

  const r4 = pick([6, 8, 10, 12, 14]);
  const semiPerim = (Math.PI * r4 + 2 * r4).toFixed(1);

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `A circle has diameter ${2 * r0} cm. What is its radius?`,
      spokenPrompt: `Question one. A circle has diameter ${2 * r0} centimetres. What is its radius?`,
      hintSpoken: "The radius is half the diameter.",
      canonicalAnswer: String(r0),
      unit: "cm",
      workedSolution: `Radius = ${2 * r0} ÷ 2 = ${r0} cm.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `A circle has radius ${r1} cm. Its exact area is kπ cm². Write down the value of k.`,
      spokenPrompt: `Question two. A circle has radius ${r1} centimetres. Its exact area is k pi square centimetres. What is k?`,
      hintSpoken: "Area = πr², so k is r squared.",
      canonicalAnswer: String(r1 * r1),
      workedSolution: `Area = π × ${r1}² = ${r1 * r1}π, so k = ${r1 * r1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: true,
      promptText: `Calculate the circumference of a circle with diameter ${d2} cm. Give your answer to 1 decimal place.`,
      spokenPrompt: `Question three. Calculate the circumference of a circle with diameter ${d2} centimetres, to one decimal place.`,
      hintSpoken: `Use C = π × d = π × ${d2}.`,
      canonicalAnswer: circ2,
      unit: "cm",
      workedSolution: `C = π × ${d2} = ${circ2} cm (1 d.p.).`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: false,
      promptText: `A sector of a circle has angle ${angle3}° and radius ${r3} cm. Its exact area is kπ cm². Work out the integer k.`,
      spokenPrompt: `Question four. A sector has angle ${angle3} degrees and radius ${r3} centimetres. Its exact area is k pi. Find k.`,
      hintSpoken: `Multiply (${angle3} over 360) by ${r3} squared.`,
      canonicalAnswer: String(k3),
      workedSolution: `k = (${angle3}/360) × ${r3}² = ${k3}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: true,
      promptText: `Work out the total PERIMETER of a semicircle with radius ${r4} cm. Round your answer to 1 decimal place.`,
      spokenPrompt: `Question five. Work out the total perimeter of a semicircle with radius ${r4} centimetres, to one decimal place.`,
      hintSpoken: `Don't forget the straight diameter (${2 * r4} cm) as well as the curved half-circumference (π × ${r4})!`,
      canonicalAnswer: semiPerim,
      unit: "cm",
      workedSolution: `Curved arc = π × ${r4}. Straight edge = ${2 * r4}. Total perimeter = π × ${r4} + ${2 * r4} = ${semiPerim} cm.`,
    },
  ];
}

function genProbabilityTrees(): StoredQuizQuestion[] {
  const p0 = pick([0.15, 0.25, 0.3, 0.35, 0.4, 0.65]);
  const comp0 = Number((1 - p0).toFixed(2));

  const [p1a, p1b] = pick([
    [0.3, 0.4],
    [0.2, 0.6],
    [0.5, 0.3],
    [0.4, 0.7],
  ] as const);
  const both1 = Number((p1a * p1b).toFixed(2));

  const [p2, spins] = pick([
    [0.25, 120],
    [0.2, 150],
    [0.15, 200],
    [0.4, 80],
    [0.3, 90],
  ] as const);
  const exp2 = Math.round(p2 * spins);

  const [p3a, p3b] = pick([
    [0.7, 0.8],
    [0.6, 0.9],
    [0.8, 0.5],
    [0.75, 0.6],
  ] as const);
  const failBoth = Number(((1 - p3a) * (1 - p3b)).toFixed(2));

  const red = pick([3, 4, 5]);
  const blue = pick([2, 3, 4]);
  const total = red + blue;
  const bothRed = formatSimplifiedFraction(
    red * (red - 1),
    total * (total - 1)
  );

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `The probability that a bus is late is ${p0}. Work out the probability that the bus is NOT late.`,
      spokenPrompt: `Question one. The probability that a bus is late is ${p0}. What is the probability it is not late?`,
      hintSpoken: "Probabilities of exhaustive outcomes add up to 1.",
      canonicalAnswer: String(comp0),
      workedSolution: `1 − ${p0} = ${comp0}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `Events A and B are independent with P(A) = ${p1a} and P(B) = ${p1b}. Work out P(A and B) as a decimal.`,
      spokenPrompt: `Question two. Independent events A and B have probabilities ${p1a} and ${p1b}. Work out the probability of both A and B.`,
      hintSpoken: "Multiply along the branches for 'A and B'.",
      canonicalAnswer: String(both1),
      workedSolution: `${p1a} × ${p1b} = ${both1}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: false,
      promptText: `A biased spinner lands on Gold with probability ${p2}. If it is spun ${spins} times, how many times would you expect it to land on Gold?`,
      spokenPrompt: `Question three. A spinner lands on Gold with probability ${p2}. In ${spins} spins, how many times do you expect Gold?`,
      hintSpoken:
        "Expected frequency equals probability multiplied by number of trials.",
      canonicalAnswer: String(exp2),
      workedSolution: `${p2} × ${spins} = ${exp2}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: true,
      promptText: `Mia takes two independent tests. P(pass Maths) = ${p3a} and P(pass Science) = ${p3b}. Work out the probability that Mia FAILS BOTH tests (as a decimal).`,
      spokenPrompt: `Question four. Probability of passing Maths is ${p3a} and passing Science is ${p3b}. Work out the probability of failing both tests.`,
      hintSpoken: `Find P(fail Maths) = 1 − ${p3a} and P(fail Science) = 1 − ${p3b}, then multiply them.`,
      canonicalAnswer: String(failBoth),
      workedSolution: `(1 − ${p3a}) × (1 − ${p3b}) = ${Number((1 - p3a).toFixed(2))} × ${Number((1 - p3b).toFixed(2))} = ${failBoth}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: false,
      promptText: `A bag contains ${red} red counters and ${blue} blue counters. Two counters are taken at random WITHOUT replacement. Find P(both red) as a fraction.`,
      spokenPrompt: `Question five. A bag contains ${red} red and ${blue} blue counters. Two counters are taken without replacement. Find the probability both are red.`,
      hintSpoken: `First pick is ${red} over ${total}. For the second pick, both the red count and total count drop by 1!`,
      canonicalAnswer: bothRed.canonical,
      acceptedVariants: bothRed.variants,
      workedSolution: `(${red}/${total}) × (${red - 1}/${total - 1}) = ${red * (red - 1)}/${total * (total - 1)} = ${bothRed.canonical}.`,
    },
  ];
}

function genStatisticsGroupedMeanHistograms(): StoredQuizQuestion[] {
  const [low0, high0] = pick([
    [10, 20],
    [20, 30],
    [10, 26],
    [15, 25],
    [30, 50],
  ] as const);
  const mid0 = (low0 + high0) / 2;

  const lq = randomInt(12, 28);
  const iqr = randomInt(9, 22);
  const uq = lq + iqr;

  const cw2 = pick([5, 10, 20]);
  const fd2 = pick([1.4, 2, 2.5, 3, 4]);
  const freq2 = Math.round(cw2 * fd2);

  const cw3 = pick([4, 5, 8, 10, 15]);
  const fd3 = pick([2, 3, 4, 1.5]);
  const freq3 = cw3 * fd3;

  // Clean 3-row grouped table on [0..10, 10..20, 20..30] (midpoints 5, 15, 25) summing to 10 items
  const tableCase = pick([
    { f1: 2, f2: 5, f3: 3, mean: 16 }, // (10 + 75 + 75)/10 = 160/10 = 16
    { f1: 3, f2: 4, f3: 3, mean: 15 }, // (15 + 60 + 75)/10 = 150/10 = 15
    { f1: 1, f2: 5, f3: 4, mean: 18 }, // (5 + 75 + 100)/10 = 180/10 = 18
    { f1: 4, f2: 4, f3: 2, mean: 13 }, // (20 + 60 + 50)/10 = 130/10 = 13
    { f1: 5, f2: 3, f3: 2, mean: 12 }, // (25 + 45 + 50)/10 = 120/10 = 12
  ] as const);

  return [
    {
      index: 0,
      difficultyLabel: "Q1 · Fluency",
      calculatorAllowed: false,
      promptText: `Write down the midpoint of the grouped class interval ${low0} ≤ t < ${high0}.`,
      spokenPrompt: `Question one. Write down the midpoint of the class interval ${low0} to ${high0}.`,
      hintSpoken: "Add the two endpoints together and divide by 2.",
      canonicalAnswer: String(mid0),
      workedSolution: `(${low0} + ${high0}) ÷ 2 = ${mid0}.`,
    },
    {
      index: 1,
      difficultyLabel: "Q2 · Fluency",
      calculatorAllowed: false,
      promptText: `A box plot has lower quartile ${lq} and upper quartile ${uq}. Calculate the interquartile range (IQR).`,
      spokenPrompt: `Question two. A box plot has lower quartile ${lq} and upper quartile ${uq}. Calculate the interquartile range.`,
      hintSpoken: "IQR equals upper quartile minus lower quartile.",
      canonicalAnswer: String(iqr),
      workedSolution: `IQR = ${uq} − ${lq} = ${iqr}.`,
    },
    {
      index: 2,
      difficultyLabel: "Q3 · Exam Method",
      calculatorAllowed: true,
      promptText: `In a histogram, the class 10 ≤ x < ${10 + cw2} has frequency ${freq2}. Work out the frequency density.`,
      spokenPrompt: `Question three. In a histogram, the class from 10 to ${10 + cw2} has frequency ${freq2}. Work out the frequency density.`,
      hintSpoken: `Frequency density equals frequency (${freq2}) divided by class width (${cw2}).`,
      canonicalAnswer: String(fd2),
      workedSolution: `Class width = ${cw2}. Frequency density = ${freq2} ÷ ${cw2} = ${fd2}.`,
    },
    {
      index: 3,
      difficultyLabel: "Q4 · Exam Method",
      calculatorAllowed: true,
      promptText: `A bar on a histogram spans 20 ≤ w < ${20 + cw3} and has frequency density ${fd3}. Calculate the frequency represented by this bar.`,
      spokenPrompt: `Question four. A histogram bar spans from 20 to ${20 + cw3} with frequency density ${fd3}. Calculate the frequency.`,
      hintSpoken:
        "In a histogram, frequency is the AREA of the bar: class width times frequency density.",
      canonicalAnswer: String(freq3),
      workedSolution: `Frequency = ${cw3} × ${fd3} = ${freq3}.`,
    },
    {
      index: 4,
      difficultyLabel: "Q5 · Stretch",
      calculatorAllowed: true,
      promptText: `10 parcels have masses in 3 groups: [0 ≤ m < 10: freq ${tableCase.f1}], [10 ≤ m < 20: freq ${tableCase.f2}], [20 ≤ m < 30: freq ${tableCase.f3}]. Calculate the estimated mean mass.`,
      spokenPrompt: `Question five. Ten parcels fall into 0 to 10 (${tableCase.f1} parcels), 10 to 20 (${tableCase.f2} parcels), and 20 to 30 (${tableCase.f3} parcels). Calculate the estimated mean.`,
      hintSpoken:
        "Multiply each group's midpoint (5, 15, and 25) by its frequency, add those products together, and divide by 10.",
      canonicalAnswer: String(tableCase.mean),
      workedSolution: `(5×${tableCase.f1} + 15×${tableCase.f2} + 25×${tableCase.f3}) ÷ 10 = ${tableCase.mean * 10} ÷ 10 = ${tableCase.mean}.`,
    },
  ];
}

export function generateProceduralQuiz(
  topicSlug: string,
  _tier: EdexcelTier = "foundation"
): StoredQuizQuestion[] {
  switch (topicSlug) {
    case "compound-interest":
      return genCompoundInterest();
    case "fractions-operations":
      return genFractionsOperations();
    case "reverse-percentages":
      return genReversePercentages();
    case "ratio-sharing":
      return genRatioSharing();
    case "indices-and-standard-form":
      return genIndicesStandardForm();
    case "surds":
      return genSurds();
    case "solving-linear-equations":
      return genSolvingLinearEquations();
    case "quadratics-expanding-factorising":
      return genQuadratics();
    case "simultaneous-equations":
      return genSimultaneousEquations();
    case "sequences-nth-term":
      return genSequencesNthTerm();
    case "pythagoras-and-sohcahtoa":
      return genPythagorasSohcahtoa();
    case "circles-and-sectors":
      return genCirclesSectors();
    case "probability-trees":
      return genProbabilityTrees();
    case "statistics-grouped-mean-histograms":
      return genStatisticsGroupedMeanHistograms();
    default:
      return genCompoundInterest();
  }
}
