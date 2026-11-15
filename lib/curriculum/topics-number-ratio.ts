import type { EdexcelTopic } from "./types";

export const NUMBER_AND_RATIO_TOPICS: EdexcelTopic[] = [
  {
    slug: "compound-interest",
    edexcelCode: "R16",
    strand: "ratio",
    title: "Compound Interest & Growth",
    subtitle: "Decimal multipliers, repeated percentage change & depreciation",
    tier: "crossover",
    gradeRange: "Grades 4–7",
    calculator: "calc",
    estimatedMinutes: 8,
    featured: true,
    prerequisites: [
      {
        code: "0.1",
        title: "Percentages as Decimals",
        summary: "Divide a percentage by 100 to turn it into a decimal.",
        spokenExplanation:
          "Percent literally means out of one hundred. So five percent is five divided by one hundred, which is nought point nought five.",
        checkQuestion: "Write 4% as a decimal.",
        spokenQuestion:
          "Quick warm-up: what is four percent written as a decimal?",
        canonicalAnswer: "0.04",
        board: {
          headline: "Prerequisite 0.1 — Percent to Decimal",
          lens: "pattern",
          steps: [
            { label: "Meaning of %", latex: "5\\% = \\frac{5}{100} = 0.05" },
            {
              label: "Watch the zero!",
              latex: "4\\% = \\frac{4}{100} = 0.04 \\quad (\\text{not } 0.4)",
            },
          ],
          examTip:
            "40% is 0.4, whereas 4% is 0.04. Always shift two decimal places!",
        },
      },
      {
        code: "0.2",
        title: "Single-Step Decimal Multipliers",
        summary: "Start from 100% and add or subtract the percentage change.",
        spokenExplanation:
          "Keeping the whole original amount is one hundred percent, which is one. Increasing by five percent gives one hundred and five percent, so our multiplier is one point nought five.",
        checkQuestion:
          "What single decimal multiplier increases an amount by 6%?",
        spokenQuestion:
          "What single decimal multiplier increases a number by six percent?",
        canonicalAnswer: "1.06",
        board: {
          headline: "Prerequisite 0.2 — The Multiplier Shortcut",
          lens: "visual",
          steps: [
            {
              label: "Increase (+5%)",
              latex: "100\\% + 5\\% = 105\\% \\rightarrow \\times 1.05",
            },
            {
              label: "Decrease (-15%)",
              latex: "100\\% - 15\\% = 85\\% \\rightarrow \\times 0.85",
            },
          ],
        },
      },
      {
        code: "0.3",
        title: "Repeated Multiplication as Powers",
        summary:
          "Multiplying by the same number n times is raising to the power n.",
        spokenExplanation:
          "Instead of typing times one point nought five three times in a row, we write times one point nought five cubed. The power matches the number of years.",
        checkQuestion:
          "In 500 × 1.03^4, how many years was the money invested?",
        spokenQuestion:
          "In five hundred times one point nought three to the power of four, how many years was the money invested?",
        canonicalAnswer: "4",
        board: {
          headline: "Prerequisite 0.3 — Repeated Multipliers Become Powers",
          lens: "pattern",
          steps: [
            {
              label: "3 years in a row",
              latex:
                "1000 \\times 1.05 \\times 1.05 \\times 1.05 = 1000 \\times 1.05^3",
            },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Compound vs Simple Interest",
        summary: "Understand why interest earns extra interest every year.",
      },
      {
        code: "1.2",
        title: "The Multiplier Formula P × r^n",
        summary:
          "Calculate compound growth in one clean line on Edexcel Paper 2/3.",
      },
      {
        code: "1.3",
        title: "Depreciation & Multi-Rate Problems",
        summary:
          "Handle falling car values and changing yearly interest rates.",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Picture rolling a snowball down a snowy hill. If you put one thousand pounds in a bank at five percent, Year One adds fifty pounds. In Year Two, the bank pays five percent on the original thousand AND five percent on that fifty pounds too — giving two pounds fifty extra! Your interest starts earning its own interest.",
        displayText:
          "Think of compound interest like a snowball rolling downhill: each year's interest sticks to your pot and earns its own interest the following year.",
        followUpQuestion:
          "Why did Year 2 add £52.50 instead of £50 like Year 1?",
        board: {
          headline: "Story Lens — The Snowball Bank (£1,000 at 5% p.a.)",
          lens: "story",
          steps: [
            { label: "Year 1 (+5% of £1000)", latex: "£1000 + £50 = £1050" },
            {
              label: "Year 2 (+5% of £1050)",
              latex:
                "£1050 + £50 + \\underbrace{£2.50}_{\\text{interest on interest!}} = £1102.50",
            },
            {
              label: "Year 3 (+5% of £1102.50)",
              latex: "£1102.50 + £55.125 = £1157.63 \\text{ (2 d.p.)}",
            },
          ],
          examTip:
            "Simple interest adds the exact same £50 every year (£1150). Compound interest snowballs to £1157.63!",
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Look at the growth bars on the board. Every jump across the timeline multiplies the whole bar by one point nought five. Notice the glowing top slice growing slightly taller each year — from fifty pounds, to fifty-two fifty, to fifty-five thirteen.",
        displayText:
          "Follow the timeline bars: each year scales the entire previous bar by ×1.05, making the new interest slice grow wider every step.",
        followUpQuestion:
          "If the rate dropped by 5% each year instead (depreciation), would our multiplier be above 1 or below 1?",
        board: {
          headline: "Visual Lens — Multiplier Growth Timeline",
          lens: "visual",
          steps: [
            {
              label: "Multiplier per year",
              latex: "100\\% + 5\\% = 105\\% = \\times 1.05",
            },
            {
              label: "3 jumps across timeline",
              latex:
                "£1000 \\xrightarrow{\\times 1.05} £1050 \\xrightarrow{\\times 1.05} £1102.50 \\xrightarrow{\\times 1.05} £1157.63",
            },
          ],
          visual: {
            kind: "multiplier-timeline",
            title: "£1,000 Compounded at 5% per Year",
            unitPrefix: "£",
            multiplierLabel: "× 1.05",
            steps: [
              {
                label: "Start",
                principal: 1000,
                interestAdded: 0,
                total: 1000,
              },
              {
                label: "Year 1",
                principal: 1000,
                interestAdded: 50,
                total: 1050,
              },
              {
                label: "Year 2",
                principal: 1050,
                interestAdded: 52.5,
                total: 1102.5,
              },
              {
                label: "Year 3",
                principal: 1102.5,
                interestAdded: 55.13,
                total: 1157.63,
              },
            ],
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Here is why you never need to memorise a scary formula. Increasing by five percent just means multiplying by one point nought five. Doing that for three years means multiplying by one point nought five, three times in a row — which is literally what to the power of three means!",
        displayText:
          "Repeated multiplication is the definition of an index (power): multiplying by 1.05 every year for n years collapses straight into × 1.05^n.",
        followUpQuestion:
          "How would you write £2,000 invested at 3% compound interest for 7 years as a single calculation?",
        board: {
          headline: "Why It Works — From Repeated Steps to One Power",
          lens: "pattern",
          steps: [
            { label: "1 year", latex: "1000 \\times 1.05^1" },
            {
              label: "2 years",
              latex: "(1000 \\times 1.05) \\times 1.05 = 1000 \\times 1.05^2",
            },
            {
              label: "n years",
              latex:
                "\\text{Total} = \\text{Start} \\times (\\text{Multiplier})^n",
            },
          ],
          examTip:
            "Never multiply the percentage by the years (5% × 3 = 15% is Simple Interest, a classic Edexcel trap!).",
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "On Edexcel Paper Two or Three, examiners award three marks here. First method mark for spotting the multiplier one point nought five. Second method mark for raising it to the power of three and multiplying by one thousand. Final accuracy mark for rounding money properly to two decimal places: one thousand one hundred and fifty-seven pounds sixty-three.",
        displayText:
          "Edexcel 1MA1 Mark Scheme breakdown (3 marks): M1 for the decimal multiplier, M1 for the full power expression, A1 for correct 2 d.p. money rounding.",
        followUpQuestion:
          "If a car worth £12,000 depreciates by 15% per year for 2 years, what calculation wins the M1 method marks?",
        board: {
          headline: "Edexcel 1MA1 Exam Method (Paper 2 / Paper 3 Calculator)",
          lens: "exam",
          steps: [
            {
              label: "Step 1 (M1 — Multiplier)",
              latex: "1 + \\frac{5}{100} = 1.05",
              note: "Depreciation uses 1 - r/100",
            },
            {
              label: "Step 2 (M1 — Full Process)",
              latex: "1000 \\times 1.05^3 = 1157.625",
            },
            {
              label: "Step 3 (A1 — Money Form)",
              latex: "£1157.63 \\text{ (to 2 d.p.)}",
              note: "Never leave £1157.6 or £1157.625",
            },
          ],
          examTip:
            "If the question asks for 'the total interest earned', remember to subtract the starting £1,000 at the end!",
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Let's build one together step by step. Suppose Sam invests two thousand pounds at four percent compound interest for three years. First micro-step: what decimal multiplier increases an amount by four percent?",
        displayText:
          "Guided Turn: Sam invests £2,000 at 4% compound interest per year for 3 years. Step 1: What decimal multiplier represents a +4% increase?",
        followUpQuestion:
          "Say or type the decimal multiplier for a 4% increase.",
        board: {
          headline: "Socratic Step-by-Step — £2,000 at 4% for 3 Years",
          lens: "socratic",
          steps: [
            {
              label: "Given",
              latex:
                "\\text{Principal} = £2000, \\quad \\text{Rate} = +4\\%, \\quad \\text{Time} = 3\\text{ years}",
            },
            {
              label: "Your Turn (Step 1)",
              latex: "100\\% + 4\\% = \\; ? \\; \\text{(as a decimal)}",
            },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Warm-Up (Familiar)",
        questionText:
          "£500 is invested at 10% compound interest per year for 2 years. Work out the total value at the end of 2 years.",
        spokenQuestion:
          "Question one, warm-up: Five hundred pounds is invested at ten percent compound interest per year for two years. What is the total value after two years?",
        canonicalAnswer: "605",
        acceptedVariants: ["£605", "605.00", "£605.00"],
        unit: "£",
        hintSpoken:
          "A ten percent increase has multiplier one point one. Multiply five hundred by one point one squared.",
        workedSolutionSpoken:
          "Ten percent increase means multiplying by one point one. Five hundred times one point one squared equals six hundred and five pounds.",
        workedSolutionBoard: {
          headline: "Worked Solution — £500 at 10% for 2 Years",
          lens: "exam",
          steps: [
            { label: "Multiplier", latex: "1 + 0.10 = 1.1" },
            {
              label: "2 years",
              latex: "500 \\times 1.1^2 = 500 \\times 1.21 = £605",
            },
          ],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Edexcel Exam Style",
        questionText:
          "Amira invests £4,000 in a savings account paying 3% compound interest per year. Work out the value of her investment after 3 years. Give your answer to the nearest penny.",
        spokenQuestion:
          "Question two, Edexcel exam style: Amira invests four thousand pounds at three percent compound interest per year for three years. Work out the value after three years, to the nearest penny.",
        canonicalAnswer: "4370.91",
        acceptedVariants: ["£4370.91"],
        unit: "£",
        hintSpoken:
          "Three percent increase gives multiplier one point nought three. Calculate four thousand times one point nought three cubed, then round to two decimal places.",
        workedSolutionSpoken:
          "Four thousand times one point nought three cubed gives four thousand three hundred and seventy point nine nought eight, which rounds to four thousand three hundred and seventy pounds and ninety-one pence.",
        workedSolutionBoard: {
          headline: "Worked Solution — £4,000 at 3% for 3 Years",
          lens: "exam",
          steps: [
            { label: "M1 Multiplier", latex: "1.03" },
            {
              label: "M1 Calculation",
              latex: "4000 \\times 1.03^3 = 4370.908",
            },
            { label: "A1 Rounded (2 d.p.)", latex: "£4370.91" },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 AO3 Problem Solving (Depreciation)",
        questionText:
          "A van bought for £20,000 depreciates by 20% in Year 1, and then by 10% per year for each of the next 2 years. Work out the value of the van after 3 years.",
        spokenQuestion:
          "Question three, grade seven stretch: A van bought for twenty thousand pounds loses twenty percent of its value in year one, and then ten percent in each of the next two years. What is it worth after three years?",
        canonicalAnswer: "12960",
        acceptedVariants: ["£12960", "12960.00"],
        unit: "£",
        hintSpoken:
          "Chain the two multipliers: losing twenty percent is times nought point eight, and losing ten percent twice is times nought point nine squared.",
        workedSolutionSpoken:
          "Twenty thousand times nought point eight gives sixteen thousand after year one. Multiplying sixteen thousand by nought point nine squared gives twelve thousand nine hundred and sixty pounds.",
        workedSolutionBoard: {
          headline: "Worked Solution — Multi-Rate Depreciation",
          lens: "exam",
          steps: [
            { label: "Year 1 (-20%)", latex: "20000 \\times 0.8 = £16000" },
            {
              label: "Years 2 & 3 (-10% twice)",
              latex: "16000 \\times 0.9^2 = 16000 \\times 0.81 = £12960",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "fractions-operations",
    edexcelCode: "N2",
    strand: "number",
    title: "Fractions: Add, Subtract, Multiply & Divide",
    subtitle:
      "Common denominators, area grids, mixed numbers & Keep-Change-Flip",
    tier: "foundation",
    gradeRange: "Grades 2–5",
    calculator: "non-calc",
    estimatedMinutes: 9,
    featured: true,
    prerequisites: [
      {
        code: "0.1",
        title: "Equivalent Fractions",
        summary:
          "Multiply top and bottom by the same number — the fraction's size stays identical.",
        spokenExplanation:
          "Cutting every slice in half doubles the number of slices, and doubles how many you hold, while the amount of pizza stays identical. One half is the exact same amount as three sixths.",
        checkQuestion: "Fill in the numerator: 2/3 = ?/12",
        spokenQuestion: "Warm-up check: two thirds equals how many twelfths?",
        canonicalAnswer: "8",
        acceptedVariants: ["8/12"],
        board: {
          headline: "Prerequisite 0.1 — Equivalent Fractions",
          lens: "visual",
          steps: [
            {
              label: "Scale ×4 top & bottom",
              latex: "\\frac{2 \\times 4}{3 \\times 4} = \\frac{8}{12}",
            },
          ],
        },
      },
      {
        code: "0.2",
        title: "Lowest Common Multiple (Denominators)",
        summary:
          "Find the smallest number both denominators divide into cleanly.",
        spokenExplanation:
          "To add quarters and sixths, look for the smallest number in both the four and six times tables. Twelve works cleanly without inflating the numbers.",
        checkQuestion: "What is the lowest common denominator for 1/4 and 1/6?",
        spokenQuestion:
          "What is the lowest common denominator for quarters and sixths?",
        canonicalAnswer: "12",
        board: {
          headline: "Prerequisite 0.2 — Lowest Common Denominator",
          lens: "pattern",
          steps: [
            {
              label: "Multiples of 4",
              latex: "4, \\; 8, \\; \\mathbf{12}, \\; 16, \\dots",
            },
            {
              label: "Multiples of 6",
              latex: "6, \\; \\mathbf{12}, \\; 18, \\dots",
            },
          ],
        },
      },
      {
        code: "0.3",
        title: "Mixed Numbers to Improper Fractions",
        summary:
          "Convert mixed numbers to top-heavy fractions before multiplying or dividing.",
        spokenExplanation:
          "Two and three quarters means two whole pizzas of four quarters each — that is eight quarters — plus three more quarters, giving eleven quarters.",
        checkQuestion: "Write 2 3/4 as an improper fraction.",
        spokenQuestion: "Write two and three quarters as a top-heavy fraction.",
        canonicalAnswer: "11/4",
        board: {
          headline: "Prerequisite 0.3 — Mixed → Improper",
          lens: "exam",
          steps: [
            {
              label: "Whole × Bottom + Top",
              latex:
                "2\\frac{3}{4} = \\frac{(2 \\times 4) + 3}{4} = \\frac{11}{4}",
            },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Adding & Subtracting Fractions",
        summary:
          "Match slice sizes first with a common denominator, then add numerators only.",
      },
      {
        code: "1.2",
        title: "Multiplying Fractions ('Of' Grid)",
        summary:
          "Multiply numerators and multiply denominators; cross-cancel early.",
      },
      {
        code: "1.3",
        title: "Dividing Fractions & Mixed Numbers",
        summary:
          "Understand why dividing by a/b equals multiplying by its reciprocal b/a.",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Imagine you have half a chocolate bar and your friend gives you one third of an identical bar. You cannot call that two pieces of what, because a half-chunk and a third-chunk are different sizes! Cut both bars into equal sixth-sized squares: your half is three sixths, their third is two sixths, so together you hold five sixths.",
        displayText:
          "You can only count slices together once every slice is the exact same size. Cutting halves and thirds into sixths makes every bite equal.",
        followUpQuestion:
          "If we added 1/2 + 1/4 using chocolate squares, what slice size matches both?",
        board: {
          headline: "Story Lens — Matching Chocolate Slice Sizes",
          lens: "story",
          steps: [
            {
              label: "Different slice sizes",
              latex:
                "\\frac{1}{2} + \\frac{1}{3} \\quad (\\text{halves } \\neq \\text{ thirds})",
            },
            {
              label: "Cut into equal sixths",
              latex: "\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}",
            },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Look at the Fraction Bar Wall on the board. The top bar shades one half, split with dashed lines into three sixths. The second bar shades one third, split into two sixths. Slide those equal sixth-blocks onto the bottom bar and five out of six blocks light up!",
        displayText:
          "Compare the aligned bars: subdividing 1/2 and 1/3 into sixths lines up the grid marks so you can simply count 3 + 2 = 5 sixths.",
        followUpQuestion:
          "Looking at the bottom bar, how much more is needed to complete 1 whole?",
        board: {
          headline: "Visual Lens — Aligned Fraction Bar Wall",
          lens: "visual",
          steps: [
            {
              label: "Align subdivisions",
              latex:
                "\\frac{1}{2} = \\frac{3}{6} \\quad \\text{and} \\quad \\frac{1}{3} = \\frac{2}{6}",
            },
            {
              label: "Combine shaded sixths",
              latex: "\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}",
            },
          ],
          visual: {
            kind: "fraction-wall",
            title: "Adding 1/2 + 1/3 by Subdividing into Sixths",
            bars: [
              {
                label: "1/2 (= 3/6)",
                numerator: 3,
                denominator: 6,
                color: "coral",
              },
              {
                label: "1/3 (= 2/6)",
                numerator: 2,
                denominator: 6,
                color: "violet",
              },
              {
                label: "Sum = 5/6",
                numerator: 5,
                denominator: 6,
                color: "emerald",
              },
            ],
            resultNote:
              "Notice the denominator stays 6 — that names the slice size!",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Students sometimes ask: why don't we add the bottoms to get two fifths? Do a sanity check! Two fifths is less than half, yet we started with one half and added more! Denominators are units, just like saying three apples plus two apples equals five apples — never five double-apples. Meanwhile, multiplying fractions means taking a fraction OF a fraction, which shrinks the grid.",
        displayText:
          "Sanity-check the common trap: 1/2 + 1/3 cannot be 2/5, because 2/5 (40%) is smaller than the 1/2 (50%) you started with!",
        followUpQuestion:
          "Why does dividing 3 by 1/2 give 6 — a bigger number than 3?",
        board: {
          headline: "Why It Works — Units vs. Scaling",
          lens: "pattern",
          steps: [
            {
              label: "Trap check",
              latex:
                "\\frac{1}{2} + \\frac{1}{3} \\neq \\frac{2}{5} \\quad (0.4 < 0.5!)",
            },
            {
              label: "Multiplying ('of')",
              latex:
                "\\frac{2}{3} \\times \\frac{3}{4} = \\frac{6}{12} = \\frac{1}{2}",
            },
            {
              label: "Dividing ('how many fit?')",
              latex:
                "3 \\div \\frac{1}{2} = 6 \\text{ halves fit inside } 3 \\implies 3 \\times \\frac{2}{1}",
            },
          ],
          visual: {
            kind: "area-grid",
            title: "Area Grid for Multiplying 2/3 × 3/4 = 6/12",
            rowHeaders: ["1/3", "1/3", "unshaded"],
            colHeaders: ["1/4", "1/4", "1/4", "unshaded"],
            cells: [
              ["✓", "✓", "✓", "·"],
              ["✓", "✓", "✓", "·"],
              ["·", "·", "·", "·"],
            ],
            caption:
              "2 rows out of 3 × 3 columns out of 4 = 6 overlapping cells out of 12 (= 1/2).",
          },
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "On Edexcel Paper One Non-Calculator, golden rule number one: always turn mixed numbers into improper fractions FIRST, especially for multiplying and dividing. For addition, show your common denominator clearly for the method mark. For division, write Keep, Change, Flip and cancel common factors diagonally to keep numbers tiny.",
        displayText:
          "Edexcel Paper 1 Non-Calculator Checklist: (1) Mixed → Improper first, (2) Common denominator for +/−, (3) Keep-Change-Flip for ÷, (4) Simplify final answer.",
        followUpQuestion:
          "Before calculating 1 1/2 ÷ 3/4, what should 1 1/2 be rewritten as?",
        board: {
          headline: "Edexcel Paper 1 Non-Calc Exam Method",
          lens: "exam",
          steps: [
            {
              label: "Add / Subtract (M1 + A1)",
              latex:
                "\\frac{3}{4} + \\frac{1}{5} = \\frac{15}{20} + \\frac{4}{20} = \\frac{19}{20}",
            },
            {
              label: "Multiply Mixed (M1 convert)",
              latex:
                "1\\frac{1}{3} \\times \\frac{3}{5} = \\frac{4}{\\cancel{3}} \\times \\frac{\\cancel{3}}{5} = \\frac{4}{5}",
            },
            {
              label: "Divide (Keep-Change-Flip)",
              latex:
                "\\frac{2}{3} \\div \\frac{4}{5} = \\frac{2}{3} \\times \\frac{5}{4} = \\frac{10}{12} = \\frac{5}{6}",
            },
          ],
          examTip:
            "If Edexcel says 'Give your answer as a mixed number in its simplest form', convert top-heavy answers back at the very end for the final A1 mark!",
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Let's tackle three quarters plus one fifth together. First step: what is the smallest common denominator that both four and five divide into?",
        displayText:
          "Guided Turn: Work out 3/4 + 1/5. Step 1: What common denominator do 4 and 5 share?",
        followUpQuestion:
          "Say or type the lowest common denominator of 4 and 5.",
        board: {
          headline: "Socratic Check — Work Out 3/4 + 1/5",
          lens: "socratic",
          steps: [
            { label: "Question", latex: "\\frac{3}{4} + \\frac{1}{5}" },
            { label: "Step 1 (Your Turn)", latex: "\\text{LCM}(4, 5) = \\; ?" },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Warm-Up (Paper 1)",
        questionText:
          "Work out 3/4 + 1/5. Give your answer as a fraction in its simplest form.",
        spokenQuestion:
          "Warm-up question: Work out three quarters plus one fifth.",
        canonicalAnswer: "19/20",
        acceptedVariants: ["0.95"],
        hintSpoken:
          "Use twenty as the common denominator. Rewrite three quarters as fifteen twentieths and one fifth as four twentieths.",
        workedSolutionSpoken:
          "Using common denominator twenty: three quarters is fifteen over twenty, plus four over twenty gives nineteen over twenty.",
        workedSolutionBoard: {
          headline: "Worked Solution — 3/4 + 1/5",
          lens: "exam",
          steps: [
            {
              label: "Common denominator 20",
              latex: "\\frac{15}{20} + \\frac{4}{20}",
            },
            { label: "Add numerators", latex: "= \\frac{19}{20}" },
          ],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Edexcel Non-Calc Mixed Numbers",
        questionText:
          "Work out 2 1/3 × 3/7. Give your answer in its simplest form.",
        spokenQuestion:
          "Exam-style question: Work out two and one third multiplied by three sevenths.",
        canonicalAnswer: "1",
        acceptedVariants: ["21/21", "7/7"],
        hintSpoken:
          "Turn two and one third into an improper fraction first: two times three plus one gives seven thirds.",
        workedSolutionSpoken:
          "Two and one third becomes seven over three. Multiplying seven over three by three over seven gives twenty-one over twenty-one, which simplifies cleanly to one!",
        workedSolutionBoard: {
          headline: "Worked Solution — 2 1/3 × 3/7",
          lens: "exam",
          steps: [
            {
              label: "M1 Improper fraction",
              latex: "2\\frac{1}{3} = \\frac{7}{3}",
            },
            {
              label: "Multiply & cancel",
              latex: "\\frac{7}{3} \\times \\frac{3}{7} = \\frac{21}{21} = 1",
            },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Mixed Fraction Division",
        questionText:
          "Work out 2 1/4 ÷ 3/5. Give your answer as a fraction or decimal.",
        spokenQuestion:
          "Stretch question: Work out two and one quarter divided by three fifths.",
        canonicalAnswer: "15/4",
        acceptedVariants: ["3.75", "3 3/4"],
        hintSpoken:
          "Convert two and a quarter into nine quarters, then Keep-Change-Flip to multiply by five thirds.",
        workedSolutionSpoken:
          "Two and a quarter is nine over four. Dividing by three fifths becomes nine over four times five over three, which simplifies to fifteen over four, or three and three quarters.",
        workedSolutionBoard: {
          headline: "Worked Solution — 2 1/4 ÷ 3/5",
          lens: "exam",
          steps: [
            {
              label: "M1 Improper form",
              latex: "2\\frac{1}{4} = \\frac{9}{4}",
            },
            {
              label: "M1 Keep-Change-Flip",
              latex: "\\frac{9}{4} \\times \\frac{5}{3} = \\frac{45}{12}",
            },
            {
              label: "A1 Simplify (÷3)",
              latex: "= \\frac{15}{4} = 3\\frac{3}{4}",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "reverse-percentages",
    edexcelCode: "R9",
    strand: "ratio",
    title: "Percentages & Reverse Percentages",
    subtitle: "Finding the original amount before a discount or increase",
    tier: "crossover",
    gradeRange: "Grades 3–5",
    calculator: "both",
    estimatedMinutes: 7,
    featured: true,
    prerequisites: [
      {
        code: "0.1",
        title: "Remaining Percentage After a Discount",
        summary:
          "Subtract the discount from 100% to see what percentage you paid.",
        spokenExplanation:
          "In a twenty percent off sale, you do not pay twenty percent — you pay the remaining eighty percent of the original price.",
        checkQuestion:
          "After a 15% discount, what percentage of the original price remains?",
        spokenQuestion:
          "After a fifteen percent discount, what percentage of the original price is left?",
        canonicalAnswer: "85",
        acceptedVariants: ["85%"],
        board: {
          headline: "Prerequisite 0.1 — Remaining Percentage",
          lens: "visual",
          steps: [{ label: "15% off", latex: "100\\% - 15\\% = 85\\%" }],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Spotting a Reverse Percentage Question",
        summary: "Keywords: 'in a sale', 'originally', 'before tax'.",
      },
      {
        code: "1.2",
        title: "Unitary 1% Method (Non-Calc) & Multiplier Division (Calc)",
        summary: "Divide by the multiplier to reverse forward scaling.",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Here is the classic trap: trainers cost eighty pounds in a twenty percent off sale. Many people add twenty percent of eighty — sixteen pounds — and guess ninety-six pounds. Test ninety-six: twenty percent off ninety-six leaves seventy-six eighty, NOT eighty! Why? Because the twenty percent came off the bigger mystery price, not off eighty. Eighty pounds IS four fifths of the original price, so the original price was one hundred pounds!",
        displayText:
          "Why adding 20% back fails: the 20% discount was sliced off the bigger original price, not the £80 sale price!",
        followUpQuestion: "What is 20% off £100? Does it land cleanly on £80?",
        board: {
          headline: "Story Lens — Beating the Sale Price Trap",
          lens: "story",
          steps: [
            {
              label: "Wrong trap",
              latex:
                "£80 + 20\\%\\text{ of }£80 = £96 \\quad (\\text{Check: } 96 \\times 0.8 = £76.80 \\; \\times)",
            },
            {
              label: "True story",
              latex:
                "80\\%\\text{ of Original} = £80 \\implies 100\\% = £100 \\; \\checkmark",
            },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Look at the five-block bar on screen. Each block is twenty percent. A twenty percent discount chops off one block, leaving four equal blocks worth eighty pounds altogether. That means each block is twenty pounds, so all five blocks originally totalled one hundred pounds.",
        displayText:
          "4 remaining blocks = £80 → 1 block (20%) = £20 → all 5 blocks (100%) = £100.",
        followUpQuestion:
          "If those 4 blocks (80%) were worth £60 instead, what would 1 block (20%) be worth?",
        board: {
          headline: "Visual Lens — 5-Block Percentage Bar",
          lens: "visual",
          steps: [
            {
              label: "4 blocks (80%)",
              latex: "£80 \\div 4 = £20 \\text{ per 20\\% block}",
            },
            { label: "Full 5 blocks (100%)", latex: "5 \\times £20 = £100" },
          ],
          visual: {
            kind: "fraction-wall",
            title: "20% Off Leaves 4 out of 5 Blocks (= £80)",
            bars: [
              {
                label: "Sale Price (80% = £80)",
                numerator: 4,
                denominator: 5,
                color: "coral",
              },
              {
                label: "Original (100% = £100)",
                numerator: 5,
                denominator: 5,
                color: "emerald",
              },
            ],
            resultNote: "Each fifth block represents 20% = £20.",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Going forwards, Original times nought point eight equals Sale Price. Going backwards is the inverse operation: divide the Sale Price by nought point eight!",
        displayText:
          "Forward multiplies by the multiplier; backward divides by the exact same multiplier.",
        followUpQuestion:
          "If a house rose by 10% to £220,000, what number do we divide by to reverse it?",
        board: {
          headline: "Why It Works — Reversing the Arrow",
          lens: "pattern",
          steps: [
            { label: "Forward", latex: "\\text{Original} \\times 0.80 = £80" },
            {
              label: "Reverse (÷ 0.80)",
              latex: "\\text{Original} = £80 \\div 0.80 = £100",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "In Edexcel exams, write the equation 'eighty percent equals eighty pounds' first. On non-calculator Paper One, scale down to ten percent or one percent, then times up to one hundred percent. On calculator papers, just divide by the decimal multiplier.",
        displayText:
          "Paper 1: Unitary step via 10% or 1%. Paper 2/3: Sale value ÷ multiplier.",
        followUpQuestion:
          "In a 15% increase, pay rises to £230. Write the multiplier division.",
        board: {
          headline: "Edexcel 1MA1 Exam Method",
          lens: "exam",
          steps: [
            {
              label: "M1 Link % to value",
              latex: "85\\% = £170 \\quad (\\text{for 15\\% off})",
            },
            {
              label: "M1 Find 1% or ÷ 0.85",
              latex: "1\\% = 170 \\div 85 = £2",
            },
            { label: "A1 Find 100%", latex: "100\\% = £200" },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Let's solve one together: after a ten percent pay rise, Maya earns ninety-nine pounds a shift. What percentage of her old pay does ninety-nine pounds represent?",
        displayText:
          "Guided Turn: After a 10% rise, pay is £99. Step 1: What % of the original pay is £99?",
        followUpQuestion: "Say or type the percentage (e.g. 110%).",
        board: {
          headline: "Socratic Check — Reverse a 10% Rise",
          lens: "socratic",
          steps: [
            { label: "Step 1", latex: "100\\% + 10\\% = \\; ?\\% = £99" },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Warm-Up",
        questionText:
          "In a 20% off sale, a coat costs £48. Work out the normal price of the coat.",
        spokenQuestion:
          "In a twenty percent off sale, a coat costs forty-eight pounds. What was its normal price?",
        canonicalAnswer: "60",
        acceptedVariants: ["£60", "60.00"],
        hintSpoken:
          "Forty-eight pounds is eighty percent. Divide forty-eight by nought point eight.",
        workedSolutionSpoken:
          "Eighty percent equals forty-eight pounds, so ten percent is six pounds, and one hundred percent is sixty pounds.",
        workedSolutionBoard: {
          headline: "Worked Solution — 20% Off Coat",
          lens: "exam",
          steps: [{ label: "80% = £48", latex: "48 \\div 0.8 = £60" }],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Edexcel Exam Style",
        questionText:
          "A ticket price increases by 15% to £46. Work out the price before the increase.",
        spokenQuestion:
          "A ticket price increases by fifteen percent to forty-six pounds. Work out the price before the increase.",
        canonicalAnswer: "40",
        acceptedVariants: ["£40", "40.00"],
        hintSpoken:
          "Forty-six pounds represents one hundred and fifteen percent, so divide forty-six by one point one five.",
        workedSolutionSpoken:
          "One hundred and fifteen percent is forty-six pounds. Dividing forty-six by one point one five gives forty pounds.",
        workedSolutionBoard: {
          headline: "Worked Solution — 15% Ticket Increase",
          lens: "exam",
          steps: [{ label: "115% = £46", latex: "46 \\div 1.15 = £40" }],
        },
      },
      {
        difficulty: 9,
        label: "9/10 AO3 Two-Stage Reverse",
        questionText:
          "After a 10% discount and then a further 10% loyalty discount on the sale price, a laptop costs £648. Work out the original price.",
        spokenQuestion:
          "After a ten percent discount followed by another ten percent off the sale price, a laptop costs six hundred and forty-eight pounds. Find the original price.",
        canonicalAnswer: "800",
        acceptedVariants: ["£800"],
        hintSpoken:
          "Two ten percent discounts multiply by nought point nine squared, which is nought point eight one. Divide six hundred and forty-eight by nought point eight one.",
        workedSolutionSpoken:
          "Nought point nine times nought point nine is nought point eight one. Six hundred and forty-eight divided by nought point eight one gives eight hundred pounds.",
        workedSolutionBoard: {
          headline: "Worked Solution — Double Discount Reverse",
          lens: "exam",
          steps: [
            { label: "Combined multiplier", latex: "0.9 \\times 0.9 = 0.81" },
            { label: "Reverse", latex: "648 \\div 0.81 = £800" },
          ],
        },
      },
    ],
  },
  {
    slug: "ratio-sharing",
    edexcelCode: "R4",
    strand: "ratio",
    title: "Ratio: Sharing, Difference & 1:n Form",
    subtitle:
      "Bar-model part values, difference problems & combining two ratios",
    tier: "foundation",
    gradeRange: "Grades 2–5",
    calculator: "both",
    estimatedMinutes: 7,
    featured: true,
    prerequisites: [
      {
        code: "0.1",
        title: "Simplifying Ratios",
        summary: "Divide every part by their highest common factor.",
        spokenExplanation:
          "Twelve to eighteen simplifies just like a fraction: divide both sides by six to get two to three.",
        checkQuestion: "Simplify the ratio 15:25.",
        spokenQuestion: "Simplify the ratio fifteen to twenty-five.",
        canonicalAnswer: "3:5",
        board: {
          headline: "Prerequisite 0.1 — Simplifying Ratios",
          lens: "pattern",
          steps: [
            {
              label: "Divide both by 5",
              latex: "15 : 25 \\xrightarrow{\\div 5} 3 : 5",
            },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Sharing a Total in a Ratio",
        summary: "Add parts, divide to find 1 part, multiply out.",
      },
      {
        code: "1.2",
        title: "Given One Share or the Difference",
        summary:
          "Read carefully whether £30 is the total, one person's share, or the gap!",
      },
      {
        code: "1.3",
        title: "Unit Ratios 1:n & Combining A:B with B:C",
        summary: "Scale the bridge variable B so both ratios match.",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Think of ratio parts as identical buckets. Sharing forty pounds between Ali and Ben in the ratio three to five means Ali holds three buckets and Ben holds five buckets — eight equal buckets altogether. Forty pounds split across eight buckets puts five pounds inside every bucket!",
        displayText:
          "Treat ratio numbers as equal-sized buckets: 3 buckets + 5 buckets = 8 buckets sharing £40 → £5 per bucket.",
        followUpQuestion:
          "With £5 in each bucket, how much do Ben's 5 buckets hold?",
        board: {
          headline: "Story Lens — Equal Buckets (Share £40 in 3:5)",
          lens: "story",
          steps: [
            { label: "Total buckets", latex: "3 + 5 = 8\\text{ buckets}" },
            { label: "1 bucket", latex: "£40 \\div 8 = £5" },
            {
              label: "Shares",
              latex: "\\text{Ali} = £15, \\quad \\text{Ben} = £25",
            },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Draw boxes! Ali gets three boxes, Ben gets five boxes. Notice Ben has two EXTRA boxes compared to Ali. So if an Edexcel question says 'Ben gets eighteen pounds MORE than Ali', that eighteen pounds sits purely inside those two extra boxes — making every box worth nine pounds!",
        displayText:
          "Bar models conquer every Edexcel twist: whether you know the Total (8 boxes) or the Difference (2 extra boxes), find 1 box first!",
        followUpQuestion:
          "If Ben's 2 extra boxes hold £18 total, how much does Ali's 3-box bar hold?",
        board: {
          headline: "Visual Lens — Bar Model for Total vs. Difference",
          lens: "visual",
          steps: [
            {
              label: "Gap in boxes",
              latex: "5 - 3 = 2\\text{ extra boxes} = £18",
            },
            { label: "1 box", latex: "£18 \\div 2 = £9" },
          ],
          visual: {
            kind: "fraction-wall",
            title: "Ali (3 parts) vs Ben (5 parts) — Difference is 2 Parts",
            bars: [
              {
                label: "Ali (3 boxes)",
                numerator: 3,
                denominator: 5,
                color: "coral",
              },
              {
                label: "Ben (5 boxes)",
                numerator: 5,
                denominator: 5,
                color: "violet",
              },
            ],
            resultNote:
              "The 2 unshaded boxes on Ali's row show the exact difference (5 − 3 = 2 parts).",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Every ratio question reduces to one golden habit: find the value of ONE part. For unit ratios like one to n, simply divide both sides by the left-hand number, even if n turns into a decimal.",
        displayText:
          "Golden rule: always find 1 part. For 1:n form, divide both numbers by the first number.",
        followUpQuestion: "Write the ratio 4:10 in the form 1:n.",
        board: {
          headline: "Why It Works — Unit Value & 1:n Form",
          lens: "pattern",
          steps: [
            {
              label: "1:n form (÷ left side)",
              latex: "4 : 10 \\xrightarrow{\\div 4} 1 : 2.5",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "Underline which quantity the question gives you before touching numbers: is it the total, one person's share, or how much more one gets? Showing the value of one part always secures the first method mark.",
        displayText:
          "Underline 'altogether' (add parts) vs 'more than' (subtract parts) vs 'Ali gets' (use Ali's parts only).",
        followUpQuestion:
          "A:B = 2:3 and B:C = 4:5. What common number should we scale B to?",
        board: {
          headline: "Edexcel 1MA1 Exam Method (Including Combining Ratios)",
          lens: "exam",
          steps: [
            {
              label: "Match B (LCM of 3 & 4 = 12)",
              latex: "A:B = 8:12 \\quad \\text{and} \\quad B:C = 12:15",
            },
            { label: "Combined A:B:C", latex: "8 : 12 : 15" },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Let's try a difference ratio: Priya and Dan share sweets in the ratio two to seven. Dan gets twenty more sweets than Priya. How many extra ratio parts does Dan have?",
        displayText:
          "Guided Turn: Ratio 2:7, Dan gets 20 more sweets than Priya. Step 1: How many extra parts does Dan have?",
        followUpQuestion: "Say or type the difference in parts.",
        board: {
          headline: "Socratic Check — Difference Ratio (2 : 7)",
          lens: "socratic",
          steps: [
            {
              label: "Step 1",
              latex: "7 - 2 = \\; ?\\text{ parts} = 20\\text{ sweets}",
            },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Share a Total",
        questionText: "Share £72 in the ratio 4:5. Work out the larger share.",
        spokenQuestion:
          "Share seventy-two pounds in the ratio four to five. What is the larger share?",
        canonicalAnswer: "40",
        acceptedVariants: ["£40"],
        hintSpoken:
          "Four plus five is nine parts. Divide seventy-two by nine, then multiply by five.",
        workedSolutionSpoken:
          "Nine parts equal seventy-two pounds, so one part is eight pounds, and five parts equal forty pounds.",
        workedSolutionBoard: {
          headline: "Worked Solution — Share £72 in 4:5",
          lens: "exam",
          steps: [
            { label: "1 part", latex: "72 \\div (4+5) = £8" },
            { label: "Larger share (×5)", latex: "5 \\times £8 = £40" },
          ],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Edexcel Difference Ratio",
        questionText:
          "Red and blue counters are in the ratio 3:8. There are 35 more blue counters than red counters. Work out the total number of counters.",
        spokenQuestion:
          "Red and blue counters are in the ratio three to eight. There are thirty-five more blue than red. Work out the total number of counters.",
        canonicalAnswer: "77",
        hintSpoken:
          "Eight minus three is five extra parts, worth thirty-five counters. Find one part, then multiply by all eleven parts!",
        workedSolutionSpoken:
          "Five extra parts equal thirty-five, so one part is seven. Total parts is three plus eight equals eleven, times seven gives seventy-seven counters.",
        workedSolutionBoard: {
          headline: "Worked Solution — Ratio Difference",
          lens: "exam",
          steps: [
            {
              label: "Gap = 5 parts",
              latex: "35 \\div (8-3) = 7 \\text{ per part}",
            },
            { label: "Total (11 parts)", latex: "11 \\times 7 = 77" },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Combining Two Ratios",
        questionText:
          "Given a:b = 2:3 and b:c = 6:5, work out a:c in its simplest form.",
        spokenQuestion:
          "Given a to b is two to three, and b to c is six to five, find the ratio a to c in its simplest form.",
        canonicalAnswer: "4:5",
        hintSpoken:
          "Double the first ratio so a to b becomes four to six. Now b is six in both!",
        workedSolutionSpoken:
          "Scaling two to three up by two gives four to six. Matching with six to five gives a to b to c equals four to six to five, so a to c is four to five.",
        workedSolutionBoard: {
          headline: "Worked Solution — Bridge Ratio",
          lens: "exam",
          steps: [
            { label: "Scale a:b ×2", latex: "a:b = 4:6, \\quad b:c = 6:5" },
            { label: "Extract a:c", latex: "a:c = 4:5" },
          ],
        },
      },
    ],
  },
  {
    slug: "indices-and-standard-form",
    edexcelCode: "N7",
    strand: "number",
    title: "Indices & Standard Form",
    subtitle: "Laws of powers, negative/fractional indices & A × 10^n",
    tier: "crossover",
    gradeRange: "Grades 4–8",
    calculator: "non-calc",
    estimatedMinutes: 8,
    prerequisites: [
      {
        code: "0.1",
        title: "Multiplying & Dividing Same Base Powers",
        summary: "Add powers when multiplying; subtract powers when dividing.",
        spokenExplanation:
          "x cubed times x squared strings five x's together, giving x to the power of five.",
        checkQuestion:
          "Simplify 2^5 × 2^3 as 2 to a single power (just give the power).",
        spokenQuestion:
          "In two to the five times two cubed, what is the new power of two?",
        canonicalAnswer: "8",
        acceptedVariants: ["2^8"],
        board: {
          headline: "Prerequisite 0.1 — Index Laws",
          lens: "pattern",
          steps: [
            {
              label: "Add indices",
              latex:
                "a^m \\times a^n = a^{m+n} \\implies 2^5 \\times 2^3 = 2^8",
            },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Zero & Negative Indices",
        summary: "a^0 = 1 and a^-n = 1 / a^n (reciprocal, never negative!).",
      },
      {
        code: "1.2",
        title: "Fractional Indices (Higher)",
        summary:
          "Denominator = root first, numerator = power second: 8^(2/3) = (∛8)^2 = 4.",
      },
      {
        code: "1.3",
        title: "Standard Form A × 10^n",
        summary: "Keep 1 ≤ A < 10 and adjust powers of 10 cleanly.",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Standard form is astronomy's shorthand: instead of writing forty-five million with seven zeroes, scientists write four point five times ten to the power of seven — keeping the front number neatly between one and ten.",
        displayText:
          "Standard form packs giant or microscopic numbers into A × 10^n where A sits strictly from 1 up to (not including) 10.",
        followUpQuestion: "Why is 45 × 10^6 NOT valid standard form?",
        board: {
          headline: "Story Lens — Scientist's Shorthand",
          lens: "story",
          steps: [
            { label: "Big number", latex: "45{,}000{,}000 = 4.5 \\times 10^7" },
            { label: "Tiny number", latex: "0.00032 = 3.2 \\times 10^{-4}" },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Step down the powers of two on the number line of pattern steps: two cubed is eight, two squared is four, two to the one is two. Every step down divides by two! Keep dividing by two: two to the zero MUST be one, and two to the minus one is one half!",
        displayText:
          "Follow the ÷2 staircase: 8 → 4 → 2 → 1 → 1/2 → 1/4. Negative powers mean reciprocals, never negative answers!",
        followUpQuestion:
          "Following the ÷3 staircase, what is 3^-2 as a fraction?",
        board: {
          headline: "Visual Lens — The Dividing Staircase",
          lens: "visual",
          steps: [
            {
              label: "Halving pattern",
              latex:
                "2^2=4 \\xrightarrow{\\div 2} 2^1=2 \\xrightarrow{\\div 2} 2^0=1 \\xrightarrow{\\div 2} 2^{-1}=\\frac{1}{2}",
            },
          ],
          visual: {
            kind: "number-line",
            title:
              "Powers of 2 Landing Between 0 and 4 (Never Crossing Below 0!)",
            min: 0,
            max: 4,
            tickStep: 1,
            points: [
              { value: 0.5, label: "2⁻¹=½" },
              { value: 1, label: "2⁰=1" },
              { value: 2, label: "2¹=2" },
              { value: 4, label: "2²=4" },
            ],
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "For fractional powers like twenty-seven to the two thirds, think of a flower: the bottom of the fraction is underground, so it is the ROOT! Take the cube root of twenty-seven first to shrink it down to three, then square three to get nine.",
        displayText:
          "Bottom of the fraction = Root (underground!). Root first to keep numbers tiny, then raise to the top power.",
        followUpQuestion:
          "What is the cube root of 8, and then squared, for 8^(2/3)?",
        board: {
          headline: "Why It Works — Root on the Bottom, Power on Top",
          lens: "pattern",
          steps: [
            { label: "Rule", latex: "a^{\\frac{m}{n}} = (\\sqrt[n]{a})^m" },
            {
              label: "Example",
              latex: "27^{\\frac{2}{3}} = (\\sqrt[3]{27})^2 = 3^2 = 9",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "When multiplying standard form on Paper One, multiply the front numbers, add the powers of ten, and ALWAYS check at the end if the front number spilled past ten — if you get twelve times ten to the five, adjust it to one point two times ten to the six!",
        displayText:
          "Final-line check: if A ≥ 10 (e.g. 12 × 10^5), divide A by 10 and add 1 to the power (1.2 × 10^6).",
        followUpQuestion: "Fix 15 × 10^4 into proper standard form.",
        board: {
          headline: "Edexcel Paper 1 Exam Method",
          lens: "exam",
          steps: [
            {
              label: "Multiply parts",
              latex:
                "(3 \\times 10^4) \\times (4 \\times 10^2) = 12 \\times 10^6",
            },
            { label: "Adjust 1 ≤ A < 10", latex: "= 1.2 \\times 10^7" },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Let's evaluate sixteen to the power of three over two. First step: since two is on the bottom of the fraction, what is the square root of sixteen?",
        displayText: "Guided Turn: Work out 16^(3/2). Step 1: Find √16 first.",
        followUpQuestion: "Say or type √16.",
        board: {
          headline: "Socratic Check — Evaluate 16^(3/2)",
          lens: "socratic",
          steps: [
            { label: "Step 1 (Root first)", latex: "\\sqrt{16} = \\; ?" },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Standard Form Conversion",
        questionText: "Write 5.4 × 10^3 as an ordinary number.",
        spokenQuestion:
          "Write five point four times ten cubed as an ordinary number.",
        canonicalAnswer: "5400",
        hintSpoken:
          "Multiply five point four by one thousand — shift the digits three places bigger.",
        workedSolutionSpoken:
          "Five point four times one thousand equals five thousand four hundred.",
        workedSolutionBoard: {
          headline: "Worked Solution — 5.4 × 10^3",
          lens: "exam",
          steps: [{ label: "× 1000", latex: "5.4 \\times 1000 = 5400" }],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Negative Index",
        questionText: "Work out the value of 5^-2 as a fraction or decimal.",
        spokenQuestion:
          "Work out the value of five to the power of negative two.",
        canonicalAnswer: "1/25",
        acceptedVariants: ["0.04"],
        hintSpoken: "Negative power means reciprocal: one over five squared.",
        workedSolutionSpoken:
          "Five to the negative two is one over five squared, which equals one over twenty-five, or nought point nought four.",
        workedSolutionBoard: {
          headline: "Worked Solution — 5^-2",
          lens: "exam",
          steps: [
            {
              label: "Reciprocal",
              latex: "5^{-2} = \\frac{1}{5^2} = \\frac{1}{25}",
            },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Higher Fractional & Negative Index",
        questionText:
          "Work out the value of 8^(-2/3) as a fraction or decimal.",
        spokenQuestion:
          "Higher stretch: work out the value of eight to the power of negative two thirds.",
        canonicalAnswer: "1/4",
        acceptedVariants: ["0.25"],
        hintSpoken:
          "Cube root of eight is two, squared is four, and the negative sign flips four into one quarter!",
        workedSolutionSpoken:
          "The cube root of eight is two; squaring gives four; the negative index takes the reciprocal, giving one quarter.",
        workedSolutionBoard: {
          headline: "Worked Solution — 8^(-2/3)",
          lens: "exam",
          steps: [
            { label: "Root & power", latex: "(\\sqrt[3]{8})^2 = 2^2 = 4" },
            { label: "Negative flips", latex: "4^{-1} = \\frac{1}{4}" },
          ],
        },
      },
    ],
  },
  {
    slug: "surds",
    edexcelCode: "N8",
    strand: "number",
    title: "Surds & Rationalising Denominators",
    subtitle: "Simplifying √n using square factors & conjugate denominators",
    tier: "higher",
    gradeRange: "Grades 7–9",
    calculator: "non-calc",
    estimatedMinutes: 8,
    prerequisites: [
      {
        code: "0.1",
        title: "First 10 Square Numbers",
        summary:
          "Spot the largest square number (4, 9, 16, 25, 36, 49...) hiding inside n.",
        spokenExplanation:
          "To simplify root fifty, look for the biggest square number that divides fifty — twenty-five!",
        checkQuestion: "What is the largest square number that divides 48?",
        spokenQuestion:
          "What is the largest square number that divides forty-eight cleanly?",
        canonicalAnswer: "16",
        board: {
          headline: "Prerequisite 0.1 — Spotting Square Factors",
          lens: "pattern",
          steps: [
            {
              label: "48 = 16 × 3",
              latex: "\\sqrt{48} = \\sqrt{16} \\times \\sqrt{3} = 4\\sqrt{3}",
            },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Simplifying & Collecting Like Surds",
        summary: "√50 + √18 = 5√2 + 3√2 = 8√2.",
      },
      {
        code: "1.2",
        title: "Rationalising Single & Two-Term Denominators",
        summary: "Multiply top & bottom by √b or the conjugate (a − √b).",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Treat root two like an algebraic unit — just like x. Five root two plus three root two is simply eight root two, whereas root two plus root three cannot merge!",
        displayText:
          "Like surds behave just like algebra terms: 5√2 + 3√2 = 8√2.",
        followUpQuestion: "Once √12 simplifies to 2√3, what is 5√3 + √12?",
        board: {
          headline: "Story Lens — Surds as Exact Building Blocks",
          lens: "story",
          steps: [
            {
              label: "Collect like surds",
              latex: "5\\sqrt{2} + 3\\sqrt{2} = 8\\sqrt{2}",
            },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Expanding brackets with conjugates on an area grid cancels the messy root terms cleanly: three plus root two times three minus root two leaves nine minus two equals seven!",
        displayText:
          "Look at the 2×2 grid: +3√2 and −3√2 wipe each other out, leaving a clean integer denominator!",
        followUpQuestion: "In (4 + √5)(4 − √5), what clean integer is left?",
        board: {
          headline: "Visual Lens — Conjugate Cancellation Grid",
          lens: "visual",
          steps: [
            {
              label: "Difference of two squares",
              latex: "(3+\\sqrt{2})(3-\\sqrt{2}) = 9 - 2 = 7",
            },
          ],
          visual: {
            kind: "area-grid",
            title: "Conjugate Grid: (3 + √2)(3 − √2)",
            rowHeaders: ["3", "+√2"],
            colHeaders: ["3", "−√2"],
            cells: [
              ["9", "−3√2"],
              ["+3√2", "−2"],
            ],
            caption: "+3√2 and −3√2 cancel to 0, leaving 9 − 2 = 7!",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Why does multiplying top and bottom by root five not change the fraction's value? Because root five over root five equals one!",
        displayText:
          "Rationalising multiplies by a clever disguise for 1: √5/√5 = 1.",
        followUpQuestion: "What does √7 × √7 equal?",
        board: {
          headline: "Why It Works — Multiplying by 1 in Disguise",
          lens: "pattern",
          steps: [
            {
              label: "Single surd",
              latex:
                "\\frac{10}{\\sqrt{5}} \\times \\frac{\\sqrt{5}}{\\sqrt{5}} = \\frac{10\\sqrt{5}}{5} = 2\\sqrt{5}",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "On Edexcel Paper One Higher, always flip ONLY the middle sign of the denominator for the conjugate, and expand both numerator and denominator carefully.",
        displayText:
          "Higher Paper 1: Multiply top & bottom by conjugate (a ∓ √b) for M1, simplify integer denominator for A1.",
        followUpQuestion: "What conjugate rationalises 1 / (5 − √3)?",
        board: {
          headline: "Edexcel Higher Exam Method",
          lens: "exam",
          steps: [
            {
              label: "M1 Conjugate",
              latex:
                "\\frac{14}{3+\\sqrt{2}} \\times \\frac{3-\\sqrt{2}}{3-\\sqrt{2}} = \\frac{14(3-\\sqrt{2})}{7}",
            },
            {
              label: "A1 Simplify",
              latex: "= 2(3-\\sqrt{2}) = 6 - 2\\sqrt{2}",
            },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Let's simplify root seventy-five. What is the biggest square number that divides into seventy-five?",
        displayText:
          "Guided Turn: Simplify √75. Step 1: Biggest square factor of 75?",
        followUpQuestion: "Say or type the square factor.",
        board: {
          headline: "Socratic Check — Simplify √75",
          lens: "socratic",
          steps: [
            { label: "Step 1", latex: "75 = \\text{(square)} \\times 3" },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Simplify a Product",
        questionText: "Work out (√6)^2.",
        spokenQuestion: "What is the square root of six, all squared?",
        canonicalAnswer: "6",
        hintSpoken: "Squaring undoes a square root directly.",
        workedSolutionSpoken: "Root six times root six equals six.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [{ label: "Definition of √", latex: "(\\sqrt{6})^2 = 6" }],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Coefficient k in k√2",
        questionText: "Given √50 + √8 = k√2, find the integer k.",
        spokenQuestion:
          "Given root fifty plus root eight equals k root two, work out the integer k.",
        canonicalAnswer: "7",
        hintSpoken:
          "Root fifty is five root two, and root eight is two root two.",
        workedSolutionSpoken:
          "Five root two plus two root two equals seven root two, so k equals seven.",
        workedSolutionBoard: {
          headline: "Worked Solution — √50 + √8",
          lens: "exam",
          steps: [
            {
              label: "Simplify both",
              latex: "5\\sqrt{2} + 2\\sqrt{2} = 7\\sqrt{2} \\implies k = 7",
            },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Conjugate Denominator",
        questionText: "Work out (5 + √3)(5 − √3).",
        spokenQuestion:
          "Work out five plus root three, multiplied by five minus root three.",
        canonicalAnswer: "22",
        hintSpoken: "Difference of two squares: twenty-five minus three.",
        workedSolutionSpoken:
          "Five squared is twenty-five, minus root three squared which is three, leaving twenty-two.",
        workedSolutionBoard: {
          headline: "Worked Solution — Difference of Squares",
          lens: "exam",
          steps: [
            { label: "Expand", latex: "5^2 - (\\sqrt{3})^2 = 25 - 3 = 22" },
          ],
        },
      },
    ],
  },
];
