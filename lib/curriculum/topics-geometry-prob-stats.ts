import type { EdexcelTopic } from "./types";

export const GEOMETRY_PROB_STATS_TOPICS: EdexcelTopic[] = [
  {
    slug: "pythagoras-and-sohcahtoa",
    edexcelCode: "G20",
    strand: "geometry",
    title: "Pythagoras' Theorem & SOHCAHTOA",
    subtitle:
      "Right-angled triangles: side lengths, missing angles & exact trig",
    tier: "crossover",
    gradeRange: "Grades 4–7",
    calculator: "both",
    estimatedMinutes: 9,
    featured: true,
    prerequisites: [
      {
        code: "0.1",
        title: "Labelling Hypotenuse, Opposite & Adjacent",
        summary:
          "Hypotenuse is ALWAYS opposite the 90° box; Opposite faces the chosen angle θ.",
        spokenExplanation:
          "Find the right-angle corner first: the slanted side directly across from it is always the hypotenuse, the longest side in the triangle.",
        checkQuestion:
          "In a 3-4-5 right-angled triangle, which length is the hypotenuse?",
        spokenQuestion:
          "In a three, four, five right-angled triangle, which side is the hypotenuse?",
        canonicalAnswer: "5",
        board: {
          headline: "Prerequisite 0.1 — Spotting the Hypotenuse",
          lens: "visual",
          steps: [
            {
              label: "Longest side opposite 90°",
              latex: "3^2 + 4^2 = 9 + 16 = 25 = 5^2",
            },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Pythagoras: Add for Hypotenuse, Subtract for Shorter Side",
        summary: "a² + b² = c² vs a² = c² − b².",
      },
      {
        code: "1.2",
        title: "SOHCAHTOA Side & Angle Finding",
        summary:
          "Use sin, cos, tan for sides; use inverse sin⁻¹, cos⁻¹, tan⁻¹ for angles!",
      },
      {
        code: "1.3",
        title: "Exact Trig Values (Paper 1 Non-Calc)",
        summary: "30°, 45°, 60° finger/triangle trick.",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Picture leaning a five-metre ladder against a vertical brick wall so its foot sits three metres out along flat ground. Wall and ground meet at ninety degrees! Three squared is nine, plus wall height squared, equals five squared which is twenty-five — so the ladder reaches four metres up the wall.",
        displayText:
          "A 5 m ladder set 3 m from a vertical wall reaches √(25 − 9) = 4 m up the wall.",
        followUpQuestion:
          "If you pull the foot of the ladder further out from the wall, does it reach higher or lower?",
        board: {
          headline: "Story Lens — The Leaning Ladder",
          lens: "story",
          steps: [
            {
              label: "Shorter side → subtract squares",
              latex: "h^2 = 5^2 - 3^2 = 25 - 9 = 16",
            },
            { label: "Square root", latex: "h = \\sqrt{16} = 4\\text{ m}" },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Look at the right-angled triangle diagram on the board. Pythagoras isn't really about lines — it is about physical SQUARES built off each edge! A three-by-three square of nine tiles plus a four-by-four square of sixteen tiles pours cleanly into the five-by-five square of twenty-five tiles on the hypotenuse.",
        displayText:
          "9 tiles + 16 tiles = 25 tiles. And when an angle θ appears, label Opposite, Adjacent, and Hypotenuse to pick Sin, Cos, or Tan!",
        followUpQuestion:
          "Looking at angle θ at the bottom-right corner, is the vertical height Opposite or Adjacent?",
        board: {
          headline: "Visual Lens — Right-Angled Triangle & SOHCAHTOA",
          lens: "visual",
          steps: [
            {
              label: "Pythagoras (3 sides, no angle)",
              latex: "a^2 + b^2 = c^2",
            },
            {
              label: "SOH · CAH · TOA (with angle θ)",
              latex:
                "\\sin\\theta = \\frac{O}{H}, \\quad \\cos\\theta = \\frac{A}{H}, \\quad \\tan\\theta = \\frac{O}{A}",
            },
          ],
          visual: {
            kind: "triangle-trig",
            title: "Right-Angled Triangle Labelling",
            baseLabel: "Adjacent (4 cm)",
            heightLabel: "Opposite (3 cm)",
            hypotenuseLabel: "Hypotenuse (5 cm)",
            angleLabel: "θ",
            highlightSide: "hypotenuse",
            formulaNote:
              "No angle involved? Pythagoras! Angle involved? SOHCAHTOA!",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Students always ask: how do I choose between Pythagoras and Trigonometry in a mixed exam? Count what is involved! Three sides and NO angle other than ninety degrees means Pythagoras. Two sides AND an acute angle means SOHCAHTOA!",
        displayText:
          "Instant Decision Rule: 3 sides → Pythagoras. 2 sides + 1 angle → SOHCAHTOA.",
        followUpQuestion:
          "You know Opposite = 6 cm and Adjacent = 8 cm, and want angle θ. Which ratio uses O and A?",
        board: {
          headline: "Why It Works — Instant Decision Tree",
          lens: "pattern",
          steps: [
            {
              label: "Find Hypotenuse",
              latex: "c = \\sqrt{a^2 + b^2} \\quad (\\text{ADD})",
            },
            {
              label: "Find Shorter Side",
              latex: "a = \\sqrt{c^2 - b^2} \\quad (\\text{SUBTRACT})",
            },
            {
              label: "Find Angle θ",
              latex: "\\theta = \\tan^{-1}\\!\\left(\\frac{O}{A}\\right)",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "Two quick Edexcel mark savers: check your calculator displays a tiny D at the top for Degrees, never R for Radians! And on Non-Calculator Paper One, remember sin thirty degrees equals one half, and tan forty-five degrees equals one.",
        displayText:
          "Check calculator 'D' mode! Know exact Paper 1 values: sin 30° = 1/2, cos 60° = 1/2, tan 45° = 1.",
        followUpQuestion:
          "If Hypotenuse = 12 cm and angle = 30° on Paper 1, what is the Opposite side using sin 30° = 1/2?",
        board: {
          headline: "Edexcel 1MA1 Exam Method",
          lens: "exam",
          steps: [
            {
              label: "Paper 1 Exact",
              latex:
                "O = H \\times \\sin 30^\\circ = 12 \\times \\frac{1}{2} = 6\\text{ cm}",
            },
            {
              label: "Sanity check",
              latex: "\\text{Hypotenuse MUST be longer than both legs!}",
            },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "A right-angled triangle has legs of six centimetres and eight centimetres. First step: what do six squared plus eight squared add up to?",
        displayText:
          "Guided Turn: Legs are 6 cm and 8 cm. Step 1: Work out 6² + 8².",
        followUpQuestion: "What does 6² + 8² equal?",
        board: {
          headline: "Socratic Check — Find the Hypotenuse",
          lens: "socratic",
          steps: [{ label: "Step 1", latex: "6^2 + 8^2 = 36 + 64 = \\; ?" }],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Find the Hypotenuse",
        questionText:
          "A right-angled triangle has perpendicular sides of 5 cm and 12 cm. Work out the length of the hypotenuse.",
        spokenQuestion:
          "A right-angled triangle has shorter sides of five centimetres and twelve centimetres. Find the hypotenuse.",
        canonicalAnswer: "13",
        acceptedVariants: ["13cm"],
        unit: "cm",
        hintSpoken:
          "Five squared is twenty-five, plus twelve squared is one hundred and forty-four. Take the square root of one hundred and sixty-nine.",
        workedSolutionSpoken:
          "Twenty-five plus one hundred and forty-four gives one hundred and sixty-nine, whose square root is thirteen centimetres.",
        workedSolutionBoard: {
          headline: "Worked Solution — 5-12-13 Triangle",
          lens: "exam",
          steps: [
            {
              label: "c² = 5² + 12²",
              latex: "c = \\sqrt{25 + 144} = \\sqrt{169} = 13\\text{ cm}",
            },
          ],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Shorter Side Pythagoras",
        questionText:
          "A right-angled triangle has hypotenuse 15 cm and base 9 cm. Work out the vertical height.",
        spokenQuestion:
          "A right-angled triangle has hypotenuse fifteen centimetres and base nine centimetres. Work out the height.",
        canonicalAnswer: "12",
        acceptedVariants: ["12cm"],
        unit: "cm",
        hintSpoken:
          "Subtract squares for a shorter side: fifteen squared minus nine squared, then square root.",
        workedSolutionSpoken:
          "Two hundred and twenty-five minus eighty-one equals one hundred and forty-four, and root one hundred and forty-four is twelve centimetres.",
        workedSolutionBoard: {
          headline: "Worked Solution — Subtract Squares",
          lens: "exam",
          steps: [
            {
              label: "a² = 15² − 9²",
              latex: "a = \\sqrt{225 - 81} = \\sqrt{144} = 12\\text{ cm}",
            },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Exact Trig on Paper 1",
        questionText:
          "In a right-angled triangle, the hypotenuse is 14 cm and one angle is 30°. Work out the length of the side opposite the 30° angle (remember sin 30° = 0.5).",
        spokenQuestion:
          "Non-calculator stretch: a right-angled triangle has hypotenuse fourteen centimetres and angle thirty degrees. Find the side opposite thirty degrees.",
        canonicalAnswer: "7",
        acceptedVariants: ["7cm"],
        unit: "cm",
        hintSpoken:
          "Opposite equals Hypotenuse times sin thirty degrees, and sin thirty degrees is exact one half!",
        workedSolutionSpoken:
          "Opposite equals fourteen times sin thirty degrees, which is fourteen times one half, giving seven centimetres.",
        workedSolutionBoard: {
          headline: "Worked Solution — Paper 1 Exact Sin 30°",
          lens: "exam",
          steps: [
            {
              label: "SOH",
              latex:
                "\\text{Opp} = 14 \\times \\sin 30^\\circ = 14 \\times \\frac{1}{2} = 7\\text{ cm}",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "circles-and-sectors",
    edexcelCode: "G18",
    strand: "geometry",
    title: "Circles, Arc Length & Sector Area",
    subtitle: "πr², 2πr, pizza-slice fractions & exact answers in terms of π",
    tier: "crossover",
    gradeRange: "Grades 3–7",
    calculator: "both",
    estimatedMinutes: 7,
    prerequisites: [
      {
        code: "0.1",
        title: "Radius vs Diameter",
        summary:
          "Radius is half the diameter — always halve diameter BEFORE squaring!",
        spokenExplanation:
          "If a circle's diameter across the middle is ten centimetres, its radius from the centre is five centimetres.",
        checkQuestion: "A circle has diameter 12 cm. What is its radius?",
        spokenQuestion:
          "A circle has diameter twelve centimetres. What is its radius?",
        canonicalAnswer: "6",
        acceptedVariants: ["6cm"],
        board: {
          headline: "Prerequisite 0.1 — Halve Diameter First!",
          lens: "pattern",
          steps: [
            {
              label: "r = d ÷ 2",
              latex: "d = 12\\text{ cm} \\implies r = 6\\text{ cm}",
            },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Area (πr²) vs Circumference (πd)",
        summary: "Cherry Pie Delicious (C = πd), Apple Pies Are Too (A = πr²).",
      },
      {
        code: "1.2",
        title: "Sectors & Perimeter of a Sector",
        summary:
          "Fraction θ/360 of the circle — plus BOTH straight radii for perimeter!",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "A sector is literally a slice of pizza! A ninety-degree slice is ninety out of three hundred and sixty — one quarter of the whole pizza. And if an ant walks around the PERIMETER of that pizza slice, it walks the curved crust PLUS the two straight cuts meeting at the tip!",
        displayText:
          "Sector = pizza slice (θ/360 of the circle). Sector perimeter = curved crust + 2 straight radii!",
        followUpQuestion:
          "What fraction of a full circle is a 60° pizza slice?",
        board: {
          headline: "Story Lens — The Pizza Slice & Its Crust",
          lens: "story",
          steps: [
            {
              label: "Sector Area",
              latex: "\\frac{\\theta}{360} \\times \\pi r^2",
            },
            {
              label: "Total Perimeter",
              latex:
                "\\underbrace{\\frac{\\theta}{360} \\times 2\\pi r}_{\\text{curved crust}} + \\underbrace{2r}_{\\text{2 straight cuts!}}",
            },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Look at the fraction bar of three hundred and sixty degrees: sixty degrees is just one sixth of the circle, one hundred and twenty degrees is one third, and ninety degrees is one quarter.",
        displayText:
          "Visualise θ/360 as a clean fraction first before touching π!",
        followUpQuestion: "What simplified fraction is 120° out of 360°?",
        board: {
          headline: "Visual Lens — Angle as a Fraction of 360°",
          lens: "visual",
          steps: [
            {
              label: "Simplify θ/360 first",
              latex:
                "\\frac{60^\\circ}{360^\\circ} = \\frac{1}{6}, \\quad \\frac{90^\\circ}{360^\\circ} = \\frac{1}{4}, \\quad \\frac{120^\\circ}{360^\\circ} = \\frac{1}{3}",
            },
          ],
          visual: {
            kind: "fraction-wall",
            title: "Sector Angles as Fractions of a Full 360° Turn",
            bars: [
              {
                label: "60° (= 1/6 circle)",
                numerator: 1,
                denominator: 6,
                color: "coral",
              },
              {
                label: "120° (= 2/6 = 1/3)",
                numerator: 2,
                denominator: 6,
                color: "violet",
              },
              {
                label: "180° (= 3/6 = Semicircle)",
                numerator: 3,
                denominator: 6,
                color: "emerald",
              },
            ],
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Notice the units tell you which formula is Area versus Length! Area is measured in square centimetres, so Area MUST be the formula with r SQUARED: pi r squared!",
        displayText:
          "Units giveaway: Area is cm² → needs r² (πr²). Circumference is cm → power 1 (2πr = πd).",
        followUpQuestion:
          "In terms of π, what is the area of a circle with radius 5 cm?",
        board: {
          headline: "Why It Works — Dimensional Check",
          lens: "pattern",
          steps: [
            {
              label: "cm² needs r²",
              latex:
                "A = \\pi r^2 \\implies \\pi \\times 5^2 = 25\\pi\\text{ cm}^2",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "When Edexcel says 'Give your answer in terms of pi', treat pi like x in algebra and DO NOT press the decimal button — write twenty-five pi and bank full marks with zero rounding risk!",
        displayText:
          "'In terms of π' = Paper 1 gift! Treat π like an algebraic letter (e.g. 25π).",
        followUpQuestion:
          "For a semicircle of diameter 10 cm, why do students lose 1 mark on perimeter if they write 5π?",
        board: {
          headline: "Edexcel 1MA1 Exam Trap — Semicircle Perimeter",
          lens: "exam",
          steps: [
            {
              label: "Curved arc + flat diameter",
              latex: "P = \\frac{1}{2}\\pi(10) + 10 = 5\\pi + 10",
            },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "A quarter-circle has radius six centimetres. In terms of pi, what is the area of the FULL circle before we divide by four?",
        displayText:
          "Guided Turn: Quarter-circle of radius 6 cm. Step 1: Full circle area = kπ — what is k?",
        followUpQuestion:
          "What is 6² (the coefficient of π for the full circle)?",
        board: {
          headline: "Socratic Check — Quarter Circle Area",
          lens: "socratic",
          steps: [
            {
              label: "Full circle r = 6",
              latex: "\\pi \\times 6^2 = \\; ?\\pi",
            },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Exact Circle Area",
        questionText:
          "A circle has radius 7 cm. Work out its area in terms of π, giving just the number k in kπ.",
        spokenQuestion:
          "A circle has radius seven centimetres. Its area is k pi square centimetres — what is k?",
        canonicalAnswer: "49",
        hintSpoken: "Area is pi r squared, and seven squared is forty-nine.",
        workedSolutionSpoken:
          "Pi times seven squared equals forty-nine pi, so k is forty-nine.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [
            {
              label: "πr²",
              latex: "\\pi \\times 7^2 = 49\\pi \\implies k = 49",
            },
          ],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Sector Area",
        questionText:
          "A sector has angle 60° and radius 6 cm. Work out its area as kπ — give the number k.",
        spokenQuestion:
          "A sixty-degree sector has radius six centimetres. Its area is k pi — find k.",
        canonicalAnswer: "6",
        hintSpoken:
          "Sixty over three hundred and sixty is one sixth, times thirty-six pi.",
        workedSolutionSpoken:
          "One sixth of thirty-six pi equals six pi, so k equals six.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [
            {
              label: "1/6 of 36π",
              latex: "\\frac{60}{360} \\times \\pi \\times 6^2 = 6\\pi",
            },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Total Perimeter of Semicircle (π ≈ 3.14)",
        questionText:
          "Work out the TOTAL perimeter of a semicircle of diameter 10 cm, using π = 3.14.",
        spokenQuestion:
          "Using pi equals three point one four, work out the total perimeter of a semicircle of diameter ten centimetres.",
        canonicalAnswer: "25.7",
        acceptedVariants: ["25.7cm"],
        hintSpoken:
          "Curved half-circumference is half of three point one four times ten — fifteen point seven — PLUS the flat ten-centimetre diameter!",
        workedSolutionSpoken:
          "Half of ten pi is fifteen point seven, plus the straight diameter of ten gives twenty-five point seven centimetres.",
        workedSolutionBoard: {
          headline: "Worked Solution — Don't Forget the Diameter!",
          lens: "exam",
          steps: [
            {
              label: "Arc + Diameter",
              latex:
                "\\frac{1}{2}(3.14 \\times 10) + 10 = 15.7 + 10 = 25.7\\text{ cm}",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "probability-trees",
    edexcelCode: "P8",
    strand: "probability",
    title: "Probability Trees & Conditional Events",
    subtitle:
      "AND (×) along branches, OR (+) down outcomes & without replacement",
    tier: "crossover",
    gradeRange: "Grades 4–8",
    calculator: "both",
    estimatedMinutes: 8,
    prerequisites: [
      {
        code: "0.1",
        title: "Complementary Probabilities Sum to 1",
        summary:
          "Every pair of branches splitting from one node MUST add up to 1.",
        spokenExplanation:
          "If the probability of rain is three tenths, the probability of no rain on the partner branch must be seven tenths.",
        checkQuestion: "If P(Win) = 0.35, what is P(Not Win)?",
        spokenQuestion:
          "If the probability of winning is nought point three five, what is the probability of not winning?",
        canonicalAnswer: "0.65",
        acceptedVariants: ["13/20"],
        board: {
          headline: "Prerequisite 0.1 — Branches Add to 1",
          lens: "pattern",
          steps: [{ label: "1 − p", latex: "1 - 0.35 = 0.65" }],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Independent Tree Diagrams",
        summary: "Multiply along branches for AND; add end outcomes for OR.",
      },
      {
        code: "1.2",
        title: "Conditional Probability Without Replacement (Higher)",
        summary: "Denominator drops by 1 on the second pick!",
      },
      {
        code: "1.3",
        title: "'At Least One' Shortcut",
        summary: "1 − P(None) saves adding three separate branches!",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Imagine eating a sweet from a bag of three red and two blue sweets — you do NOT spit it back in! For your second pick, only four sweets remain in the bag, and whichever colour you ate went down by one!",
        displayText:
          "Eating a sweet ('taken at random and not replaced') shrinks the bag total from 5 to 4 on Pick 2!",
        followUpQuestion:
          "If Pick 1 was Red from 3 Red and 2 Blue (eating it), what is P(Red on Pick 2)?",
        board: {
          headline: "Story Lens — Eating Sweets (Without Replacement)",
          lens: "story",
          steps: [
            { label: "Pick 1 Red", latex: "\\frac{3}{5}" },
            {
              label: "Pick 2 Red (1 eaten!)",
              latex:
                "\\frac{2}{4} \\implies P(RR) = \\frac{3}{5} \\times \\frac{2}{4} = \\frac{6}{20}",
            },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Visualise Probability as splitting an Area Grid! Taking three fifths of the rows and two quarters of the columns shades six out of twenty squares — showing visually why AND means multiply, never add!",
        displayText:
          "Why AND multiplies: 3/5 of the rows × 2/4 of the columns = 6/20 of the outcome grid.",
        followUpQuestion:
          "Why would adding 3/5 + 2/4 = 1.1 be impossible for a probability?",
        board: {
          headline: "Visual Lens — Why 'AND' Multiplies Fractions",
          lens: "visual",
          steps: [
            {
              label: "Probability ≤ 1 always!",
              latex:
                "\\frac{3}{5} \\times \\frac{2}{4} = \\frac{6}{20} = \\frac{3}{10}",
            },
          ],
          visual: {
            kind: "fraction-wall",
            title: "Complementary Check: P(At Least 1) + P(None) = 1 Whole",
            bars: [
              {
                label: "P(Both Blue = None Red) = 2/20",
                numerator: 2,
                denominator: 20,
                color: "violet",
              },
              {
                label: "P(At least 1 Red) = 18/20",
                numerator: 18,
                denominator: 20,
                color: "emerald",
              },
            ],
            resultNote:
              "1 − P(None) = 1 − 2/20 = 18/20 (= 9/10) in one subtraction!",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Keep fractions UNSIMPLIFIED until the very last line on conditional trees! Leaving six twentieths plus six twentieths over the same denominator twenty makes adding branches effortless!",
        displayText:
          "Pro Exam Trick: DO NOT simplify branch fractions mid-working — they automatically share the same denominator (e.g. /20)!",
        followUpQuestion:
          "In 3 Red, 2 Blue without replacement, what are the two routes to getting 'one of each colour'?",
        board: {
          headline: "Why It Works — Keep Common Denominators Until the End",
          lens: "pattern",
          steps: [
            {
              label: "Red then Blue",
              latex: "\\frac{3}{5} \\times \\frac{2}{4} = \\frac{6}{20}",
            },
            {
              label: "Blue then Red",
              latex: "\\frac{2}{5} \\times \\frac{3}{4} = \\frac{6}{20}",
            },
            {
              label: "OR → Add!",
              latex:
                "\\frac{6}{20} + \\frac{6}{20} = \\frac{12}{20} = \\frac{3}{5}",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "Check whether the question says 'replaced' or 'takes two counters at the same time'. Taking two at the same time is IDENTICAL to taking one after the other without replacement!",
        displayText:
          "'Takes two counters at random' = WITHOUT replacement! Denominator drops by 1.",
        followUpQuestion:
          "If P(pass test) = 0.8 independently twice, what is P(pass both)?",
        board: {
          headline: "Edexcel 1MA1 Exam Phrase Decoder",
          lens: "exam",
          steps: [
            {
              label: "'Two sweets at random'",
              latex:
                "\\equiv \\text{Without replacement } (n \\rightarrow n-1)",
            },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "A bag holds four green and one yellow counter. Two are taken WITHOUT replacement. What is the probability BOTH counters are green?",
        displayText:
          "Guided Turn: 4 green, 1 yellow (5 total). Pick 2 without replacement. Find P(Green AND Green).",
        followUpQuestion: "Give P(both green) as a fraction or decimal.",
        board: {
          headline: "Socratic Check — Both Green Without Replacement",
          lens: "socratic",
          steps: [
            {
              label: "Multiply along GG",
              latex: "\\frac{4}{5} \\times \\frac{3}{4} = \\; ?",
            },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Independent Events",
        questionText:
          "The probability a train is late is 0.2. Assuming Monday and Tuesday are independent, work out the probability it is late on BOTH days.",
        spokenQuestion:
          "The probability a train is late is nought point two. What is the probability it is late on both Monday and Tuesday?",
        canonicalAnswer: "0.04",
        acceptedVariants: ["1/25"],
        hintSpoken:
          "Multiply nought point two by nought point two — watch your decimal place!",
        workedSolutionSpoken:
          "Nought point two times nought point two equals nought point nought four.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [{ label: "AND → ×", latex: "0.2 \\times 0.2 = 0.04" }],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Without Replacement",
        questionText:
          "A bag has 4 red and 2 blue marbles (6 total). Two marbles are taken without replacement. Work out P(both red) as a simplified fraction.",
        spokenQuestion:
          "A bag has four red and two blue marbles. Two are picked without replacement. Find the probability both are red.",
        canonicalAnswer: "2/5",
        acceptedVariants: ["0.4", "12/30"],
        hintSpoken: "Four sixths on pick one, times three fifths on pick two.",
        workedSolutionSpoken:
          "Four over six times three over five gives twelve over thirty, simplifying to two fifths.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [
            {
              label: "RR branch",
              latex:
                "\\frac{4}{6} \\times \\frac{3}{5} = \\frac{12}{30} = \\frac{2}{5}",
            },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 'One of Each Colour' Conditional",
        questionText:
          "A box contains 3 milk chocolates and 2 dark chocolates. Jo eats 2 chocolates at random. Work out the probability she eats one of each type.",
        spokenQuestion:
          "A box holds three milk and two dark chocolates. Jo eats two at random. Find the probability she eats one of each type.",
        canonicalAnswer: "3/5",
        acceptedVariants: ["0.6", "12/20"],
        hintSpoken:
          "Add Milk-then-Dark (three fifths times two quarters) plus Dark-then-Milk (two fifths times three quarters)!",
        workedSolutionSpoken:
          "Milk then dark is six twentieths, plus dark then milk is another six twentieths, giving twelve twentieths, or three fifths.",
        workedSolutionBoard: {
          headline: "Worked Solution — Both Routes (MD + DM)",
          lens: "exam",
          steps: [
            {
              label: "MD + DM",
              latex:
                "\\frac{3}{5}\\times\\frac{2}{4} + \\frac{2}{5}\\times\\frac{3}{4} = \\frac{12}{20} = \\frac{3}{5}",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "statistics-grouped-mean-histograms",
    edexcelCode: "S4",
    strand: "statistics",
    title: "Estimated Mean, Box Plots & Histograms",
    subtitle:
      "Midpoint × frequency tables, interquartile range & frequency density",
    tier: "crossover",
    gradeRange: "Grades 3–8",
    calculator: "calc",
    estimatedMinutes: 7,
    prerequisites: [
      {
        code: "0.1",
        title: "Class Interval Midpoints",
        summary: "Add the two interval endpoints and divide by 2.",
        spokenExplanation:
          "Halfway between twenty and thirty is twenty plus thirty divided by two, which is twenty-five.",
        checkQuestion: "What is the midpoint of the interval 10 < t ≤ 20?",
        spokenQuestion:
          "What is the midpoint of the class interval ten to twenty?",
        canonicalAnswer: "15",
        board: {
          headline: "Prerequisite 0.1 — Finding Midpoints",
          lens: "pattern",
          steps: [
            { label: "Average endpoints", latex: "\\frac{10 + 20}{2} = 15" },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Estimated Mean from Grouped Tables",
        summary: "∑(midpoint × f) ÷ ∑f — NEVER divide by the number of rows!",
      },
      {
        code: "1.2",
        title: "Box Plots & IQR Comparisons",
        summary:
          "Compare BOTH medians (average) AND IQRs (consistency) in context!",
      },
      {
        code: "1.3",
        title: "Histograms (Higher)",
        summary:
          "Frequency Density = Frequency ÷ Class Width; Bar Area = Frequency.",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Why is the mean from a grouped table only an ESTIMATE? Because if eight runners finished between ten and twenty minutes, we don't know their exact stopwatch times — so our fairest guess is pretending all eight finished right in the middle at fifteen minutes!",
        displayText:
          "1-mark Edexcel favourite: 'Why is your mean an estimate?' → Because exact data values aren't known, so we use class midpoints.",
        followUpQuestion:
          "If there are 4 rows in the table and 40 runners total, do we divide ∑fx by 4 or by 40?",
        board: {
          headline: "Story Lens — Why It's an Estimate & What to Divide By",
          lens: "story",
          steps: [
            {
              label: "Estimated Mean",
              latex:
                "\\bar{x} = \\frac{\\sum (\\text{midpoint} \\times f)}{\\sum f}",
            },
          ],
          examTip:
            "Biggest GCSE Statistics blunder: dividing by the number of table rows (e.g. 4) instead of total frequency ∑f (e.g. 40)!",
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "On a Higher-tier Histogram with unequal class widths, the AREA of each rectangle represents the frequency, so the vertical height is Frequency Density: frequency divided by class width!",
        displayText:
          "Histogram Rectangle Area = Class Width × Frequency Density = Frequency!",
        followUpQuestion:
          "If class width is 10 and frequency is 35, what height (frequency density) do you plot?",
        board: {
          headline: "Visual Lens — Midpoint Table & Histogram Area",
          lens: "visual",
          steps: [
            {
              label: "Higher Histogram",
              latex:
                "\\text{Frequency Density} = \\frac{\\text{Frequency}}{\\text{Class Width}}",
            },
          ],
          visual: {
            kind: "area-grid",
            title: "Grouped Mean Table Layout",
            rowHeaders: ["0 < t ≤ 10", "10 < t ≤ 30"],
            colHeaders: ["Midpoint (x)", "Freq (f)", "x × f"],
            cells: [
              ["5", "6", "30"],
              ["20", "14", "280"],
            ],
            caption:
              "Total fx = 310, Total f = 20 → Estimated Mean = 310 ÷ 20 = 15.5.",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Always eyeball-check your estimated mean! If all data sits between zero and thirty, your mean MUST land between zero and thirty. If you get seventy-seven point five, you accidentally divided by four rows instead of twenty people!",
        displayText:
          "Built-in radar: the mean MUST sit inside the data range [min, max]!",
        followUpQuestion:
          "When comparing two box plots for 2 marks, which TWO things must you compare?",
        board: {
          headline:
            "Why It Works — Range Sanity Check & 2-Mark Box Plot Template",
          lens: "pattern",
          steps: [
            {
              label: "Mark 1 (Median in context)",
              latex: "\\text{'Group A had a higher median score...'}",
            },
            {
              label: "Mark 2 (IQR = consistency)",
              latex:
                "\\text{'Group B had a smaller IQR, so scores were more consistent.'}",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "In Box Plot comparisons, NEVER just say 'the IQR is smaller' — write 'more consistent' or 'less spread out' in the real-life context of the question to win the communication mark!",
        displayText:
          "Smaller IQR = MORE consistent / less varied. Always mention the topic (e.g. 'train delays', 'test marks').",
        followUpQuestion:
          "Lower quartile = 22, Upper quartile = 39. What is the IQR?",
        board: {
          headline: "Edexcel 1MA1 Statistics Mark-Scheme Checklist",
          lens: "exam",
          steps: [
            {
              label: "Interquartile Range",
              latex: "\\text{IQR} = Q_3 - Q_1 = 39 - 22 = 17",
            },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "In a Higher histogram, an interval from twenty to twenty-five has frequency thirty. First: what is the class width, and what is the frequency density?",
        displayText:
          "Guided Turn: Interval 20 < x ≤ 25 has frequency 30. Work out the Frequency Density.",
        followUpQuestion: "Say or type the Frequency Density.",
        board: {
          headline: "Socratic Check — Frequency Density",
          lens: "socratic",
          steps: [
            { label: "FD = f ÷ width", latex: "\\frac{30}{25 - 20} = \\; ?" },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Interquartile Range",
        questionText:
          "A box plot has Lower Quartile 18 and Upper Quartile 43. Work out the Interquartile Range (IQR).",
        spokenQuestion:
          "A box plot has lower quartile eighteen and upper quartile forty-three. Find the interquartile range.",
        canonicalAnswer: "25",
        hintSpoken:
          "Subtract the lower quartile from the upper quartile: forty-three minus eighteen.",
        workedSolutionSpoken: "Forty-three minus eighteen equals twenty-five.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [{ label: "UQ − LQ", latex: "43 - 18 = 25" }],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Estimated Mean",
        questionText:
          "In a grouped table of 20 students, ∑(midpoint × frequency) = 310. Work out the estimated mean.",
        spokenQuestion:
          "For twenty students, the sum of midpoint times frequency is three hundred and ten. Work out the estimated mean.",
        canonicalAnswer: "15.5",
        hintSpoken:
          "Divide three hundred and ten by the total frequency twenty.",
        workedSolutionSpoken:
          "Three hundred and ten divided by twenty equals fifteen point five.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [{ label: "∑fx ÷ ∑f", latex: "310 \\div 20 = 15.5" }],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Higher Histogram Frequency from Area",
        questionText:
          "On a histogram, the bar from 10 to 25 has Frequency Density 2.4. Work out the frequency represented by this bar.",
        spokenQuestion:
          "On a histogram, the bar from ten to twenty-five has frequency density two point four. Find the frequency.",
        canonicalAnswer: "36",
        hintSpoken:
          "Frequency is bar area: class width fifteen multiplied by height two point four.",
        workedSolutionSpoken:
          "Class width is twenty-five minus ten equals fifteen. Fifteen times two point four gives frequency thirty-six.",
        workedSolutionBoard: {
          headline: "Worked Solution — Area = Frequency",
          lens: "exam",
          steps: [
            {
              label: "Width × FD",
              latex: "(25 - 10) \\times 2.4 = 15 \\times 2.4 = 36",
            },
          ],
        },
      },
    ],
  },
];
