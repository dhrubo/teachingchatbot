import type { EdexcelTopic } from "./types";

export const ALGEBRA_TOPICS: EdexcelTopic[] = [
  {
    slug: "solving-linear-equations",
    edexcelCode: "A17",
    strand: "algebra",
    title: "Solving Linear Equations",
    subtitle: "Balance method, brackets & unknowns on both sides",
    tier: "foundation",
    gradeRange: "Grades 3–5",
    calculator: "both",
    estimatedMinutes: 7,
    featured: true,
    prerequisites: [
      {
        code: "0.1",
        title: "Inverse Operations",
        summary:
          "Addition & subtraction undo each other; multiplication & division undo each other.",
        spokenExplanation:
          "To undo plus five, subtract five. To undo times three, divide by three.",
        checkQuestion: "Solve x + 9 = 14.",
        spokenQuestion:
          "Quick warm-up: if x plus nine equals fourteen, what is x?",
        canonicalAnswer: "5",
        board: {
          headline: "Prerequisite 0.1 — Inverse Operations",
          lens: "pattern",
          steps: [
            { label: "Subtract 9 from both sides", latex: "x = 14 - 9 = 5" },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Two-Step Equations (ax + b = c)",
        summary: "Undo the +/- term first, then divide by the coefficient.",
      },
      {
        code: "1.2",
        title: "Unknowns on Both Sides (5x − 2 = 2x + 10)",
        summary:
          "Eliminate the smaller x term first to avoid negative coefficients.",
      },
      {
        code: "1.3",
        title: "Equations with Brackets & Fractions",
        summary:
          "Expand brackets or multiply through by the denominator first.",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Think of x as identical mystery coin bags on an old market scale. Three identical bags plus five loose £1 coins weigh the exact same as twenty loose £1 coins. Take five loose coins off BOTH pans so the scale stays level: now three bags match fifteen coins, so each bag holds five!",
        displayText:
          "3 mystery bags + 5 coins = 20 coins. Remove 5 coins from both pans → 3 bags = 15 → 1 bag = 5.",
        followUpQuestion:
          "What would happen to the scale if you took 5 coins off the left pan only?",
        board: {
          headline: "Story Lens — Mystery Coin Bags on Scales",
          lens: "story",
          steps: [
            {
              label: "Remove 5 coins both sides",
              latex: "3x + 5 = 20 \\xrightarrow{-5} 3x = 15",
            },
            { label: "Share across 3 bags", latex: "x = 15 \\div 3 = 5" },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Look at the Balance Scale on the board. An equals sign literally means both pans balance. Whenever we apply the same badge operation to both sides — minus two x from both pans, then plus two to both pans — the beam never tilts!",
        displayText:
          "Keep the balance beam horizontal: apply identical operations to both pans until x stands alone.",
        followUpQuestion:
          "On 5x − 2 = 2x + 10, why is subtracting 2x nicer than subtracting 5x?",
        board: {
          headline: "Visual Lens — Equilibrium Balance Scale",
          lens: "visual",
          steps: [
            {
              label: "Subtract smaller x (-2x)",
              latex: "5x - 2 = 2x + 10 \\implies 3x - 2 = 10",
            },
            { label: "Add 2, then ÷ 3", latex: "3x = 12 \\implies x = 4" },
          ],
          visual: {
            kind: "equation-balance",
            title: "Balancing 5x − 2 = 2x + 10",
            leftSide: "5x − 2",
            rightSide: "2x + 10",
            operationBadge: "−2x from both sides",
            caption:
              "Eliminating the smaller x term (2x) keeps the remaining 3x positive!",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Why do we subtract five BEFORE dividing by three in three x plus five equals twenty? Think about putting on socks then shoes: to undo it at night, you take off shoes FIRST, then socks! BIDMAS wrapped x in times three then plus five, so we unwrap in reverse order.",
        displayText:
          "Socks-and-shoes rule: unwrap operations in reverse BIDMAS order.",
        followUpQuestion:
          "In (x + 4) ÷ 2 = 7, which operation was applied LAST and gets undone FIRST?",
        board: {
          headline: "Why It Works — Unwrapping in Reverse Order",
          lens: "pattern",
          steps: [
            {
              label: "Forward machine",
              latex: "x \\xrightarrow{\\times 3} 3x \\xrightarrow{+5} 20",
            },
            {
              label: "Reverse machine",
              latex: "5 \\xleftarrow{\\div 3} 15 \\xleftarrow{-5} 20",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "Edexcel awards a method mark for each valid balance move, and you can ALWAYS guarantee full marks in thirty seconds by substituting your x back into both sides of the original equation to check they match!",
        displayText:
          "Self-marking superpower: substitute your answer into LHS and RHS — if they match, your marks are 100% locked in.",
        followUpQuestion:
          "Check x = 4 in 5x − 2 and 2x + 10 — what number do both sides give?",
        board: {
          headline: "Edexcel 1MA1 Exam Method + Self-Check",
          lens: "exam",
          steps: [
            {
              label: "Expand first if brackets",
              latex: "3(2x - 1) = 21 \\implies 6x - 3 = 21",
            },
            { label: "Solve", latex: "6x = 24 \\implies x = 4" },
            {
              label: "Check",
              latex: "3(2(4) - 1) = 3(7) = 21 \\; \\checkmark",
            },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Let's solve four x minus seven equals thirteen together. What is our very first step to isolate the four x term?",
        displayText:
          "Guided Turn: Solve 4x − 7 = 13. Step 1: After adding 7 to both sides, what does 4x equal?",
        followUpQuestion: "What number does 4x equal?",
        board: {
          headline: "Socratic Check — Solve 4x − 7 = 13",
          lens: "socratic",
          steps: [{ label: "Add 7 both sides", latex: "4x = 13 + 7 = \\; ?" }],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Two-Step Equation",
        questionText: "Solve 3x − 4 = 17.",
        spokenQuestion: "Solve three x minus four equals seventeen.",
        canonicalAnswer: "7",
        acceptedVariants: ["x=7"],
        hintSpoken:
          "Add four to seventeen to get twenty-one, then divide by three.",
        workedSolutionSpoken:
          "Adding four gives three x equals twenty-one, and dividing by three gives x equals seven.",
        workedSolutionBoard: {
          headline: "Worked Solution — 3x − 4 = 17",
          lens: "exam",
          steps: [{ label: "+4 then ÷3", latex: "3x = 21 \\implies x = 7" }],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Unknowns on Both Sides",
        questionText: "Solve 6x + 3 = 2x + 23.",
        spokenQuestion:
          "Solve six x plus three equals two x plus twenty-three.",
        canonicalAnswer: "5",
        acceptedVariants: ["x=5"],
        hintSpoken:
          "Subtract two x from both sides first so four x plus three equals twenty-three.",
        workedSolutionSpoken:
          "Subtracting two x leaves four x plus three equals twenty-three. Subtract three to get twenty, then divide by four to get five.",
        workedSolutionBoard: {
          headline: "Worked Solution — 6x + 3 = 2x + 23",
          lens: "exam",
          steps: [
            { label: "-2x both sides", latex: "4x + 3 = 23" },
            { label: "-3 then ÷4", latex: "4x = 20 \\implies x = 5" },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Brackets & Fractional Equation",
        questionText: "Solve (2x + 5) / 3 = x + 1.",
        spokenQuestion:
          "Solve two x plus five, all divided by three, equals x plus one.",
        canonicalAnswer: "2",
        acceptedVariants: ["x=2"],
        hintSpoken:
          "Multiply BOTH sides by three first so two x plus five equals three bracket x plus one.",
        workedSolutionSpoken:
          "Multiplying by three gives two x plus five equals three x plus three. Subtracting two x and subtracting three gives x equals two.",
        workedSolutionBoard: {
          headline: "Worked Solution — Clear the Fraction First",
          lens: "exam",
          steps: [
            { label: "×3 both sides", latex: "2x + 5 = 3(x + 1) = 3x + 3" },
            { label: "Rearrange", latex: "5 - 3 = 3x - 2x \\implies x = 2" },
          ],
        },
      },
    ],
  },
  {
    slug: "quadratics-expanding-factorising",
    edexcelCode: "A18",
    strand: "algebra",
    title: "Expanding & Factorising Quadratics",
    subtitle: "2×2 area grids, sum-and-product pairs & solving x² + bx + c = 0",
    tier: "crossover",
    gradeRange: "Grades 4–8",
    calculator: "both",
    estimatedMinutes: 8,
    featured: true,
    prerequisites: [
      {
        code: "0.1",
        title: "Sum & Product Number Puzzle",
        summary: "Find two numbers that multiply to c and add to b.",
        spokenExplanation:
          "To factorise x squared plus seven x plus twelve, think of two numbers that multiply to twelve and add to seven: three and four!",
        checkQuestion:
          "Find the larger of the two numbers that multiply to 15 and add to 8.",
        spokenQuestion:
          "Two numbers multiply to fifteen and add to eight. What is the larger one?",
        canonicalAnswer: "5",
        board: {
          headline: "Prerequisite 0.1 — Multiply to c, Add to b",
          lens: "pattern",
          steps: [
            {
              label: "3 × 5 = 15, 3 + 5 = 8",
              latex: "(x + 3)(x + 5) = x^2 + 8x + 15",
            },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Expanding Double Brackets",
        summary: "Multiply all 4 pairs cleanly via a 2×2 grid or FOIL.",
      },
      {
        code: "1.2",
        title: "Factorising Monic & Difference of Two Squares",
        summary: "x² + bx + c and x² − a² = (x + a)(x − a).",
      },
      {
        code: "1.3",
        title: "Solving Quadratics = 0",
        summary: "Zero-product property flips the bracket signs for the roots!",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Imagine extending a square patio of side x by three metres one way and four metres the other way. Your new garden rectangle splits into four neat rooms: an x-by-x square, a three-x strip, a four-x strip, and a three-by-four corner of area twelve!",
        displayText:
          "A patio of width (x + 3) and length (x + 4) splits into 4 rectangles whose areas add to x² + 7x + 12.",
        followUpQuestion:
          "Where does the 7x come from when we combine the four rooms?",
        board: {
          headline: "Story Lens — Extending a Patio",
          lens: "story",
          steps: [
            {
              label: "Combine 4 rooms",
              latex: "x^2 + 3x + 4x + 12 = x^2 + 7x + 12",
            },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Look at the two-by-two Area Grid on the board. Unlike curved claw arrows where people forget a term or drop a minus sign, four boxes guarantee all four products appear every single time — and factorising is just filling the outside headers back in!",
        displayText:
          "The 2×2 Area Grid makes dropping a term impossible and works equally well forwards (expanding) and backwards (factorising).",
        followUpQuestion:
          "What goes in the bottom-right corner cell if the headers were (x − 3) and (x + 5)?",
        board: {
          headline: "Visual Lens — 2×2 Algebra Area Grid",
          lens: "visual",
          steps: [
            { label: "Grid total", latex: "(x + 3)(x + 4) = x^2 + 7x + 12" },
          ],
          visual: {
            kind: "area-grid",
            title: "Expanding (x + 3)(x + 4)",
            rowHeaders: ["x", "+3"],
            colHeaders: ["x", "+4"],
            cells: [
              ["x²", "+4x"],
              ["+3x", "+12"],
            ],
            caption: "Diagonal x-terms combine: +4x + 3x = +7x.",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "When solving bracket x plus three times bracket x plus four equals zero, why do the signs flip to negative three and negative four? Because if two numbers multiply to zero, one of the BRACKETS must equal zero! Setting x plus three equal to zero gives x equals minus three.",
        displayText:
          "Zero-Product Rule: if A × B = 0, then A = 0 or B = 0 — that's why (x + 3) = 0 gives x = −3!",
        followUpQuestion: "If (x − 6)(x + 2) = 0, what is the positive root?",
        board: {
          headline: "Why It Works — Zero-Product Property",
          lens: "pattern",
          steps: [
            { label: "Factorised = 0", latex: "(x + 3)(x + 4) = 0" },
            {
              label: "Each bracket = 0",
              latex:
                "x + 3 = 0 \\implies x = -3 \\quad \\text{or} \\quad x = -4",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "Read the Edexcel command word carefully! 'Factorise' stops at the double brackets. 'Solve' means make sure one side equals zero first, factorise, AND write both x values!",
        displayText:
          "'Factorise' → leave as (x + p)(x + q). 'Solve' → rearrange to = 0 first, then write x = −p or x = −q.",
        followUpQuestion:
          "Spot Difference of Two Squares: how does x² − 49 factorise?",
        board: {
          headline: "Edexcel 1MA1 Exam Method",
          lens: "exam",
          steps: [
            {
              label: "Difference of 2 squares",
              latex: "x^2 - 49 = (x + 7)(x - 7)",
            },
            {
              label: "Solve = 0 first!",
              latex:
                "x^2 + 5x = 14 \\implies x^2 + 5x - 14 = 0 \\implies (x+7)(x-2)=0",
            },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Let's factorise x squared minus five x plus six. Since they multiply to positive six and add to negative five, what must the signs of both numbers be?",
        displayText:
          "Guided Turn: Factorise x² − 5x + 6. Find the two negative numbers that multiply to +6 and add to −5 (give either magnitude, e.g. -2).",
        followUpQuestion: "Give one of the two numbers (e.g. -2 or -3).",
        board: {
          headline: "Socratic Check — x² − 5x + 6",
          lens: "socratic",
          steps: [
            { label: "Multiply to +6, add to -5", latex: "(x - ?)(x - ?)" },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Coefficient Check",
        questionText:
          "When (x + 5)(x − 2) is expanded to x² + bx + c, what is the value of b?",
        spokenQuestion:
          "When bracket x plus five times bracket x minus two is expanded, what is the coefficient of x?",
        canonicalAnswer: "3",
        hintSpoken: "Five x minus two x combines to three x.",
        workedSolutionSpoken:
          "Expanding gives x squared plus five x minus two x minus ten, so b equals three.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [
            {
              label: "Expand",
              latex: "x^2 + 5x - 2x - 10 = x^2 + 3x - 10 \\implies b = 3",
            },
          ],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Solve by Factorising",
        questionText: "Find the positive solution to x² − 3x − 18 = 0.",
        spokenQuestion:
          "Find the positive solution to x squared minus three x minus eighteen equals zero.",
        canonicalAnswer: "6",
        acceptedVariants: ["x=6"],
        hintSpoken:
          "Minus six and plus three multiply to minus eighteen and add to minus three.",
        workedSolutionSpoken:
          "Factorising gives x minus six times x plus three equals zero, so the positive root is six.",
        workedSolutionBoard: {
          headline: "Worked Solution — x² − 3x − 18 = 0",
          lens: "exam",
          steps: [
            {
              label: "Factorise",
              latex: "(x - 6)(x + 3) = 0 \\implies x = 6 \\text{ or } x = -3",
            },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Higher Non-Monic Quadratic",
        questionText: "Find the integer solution to 2x² + 5x − 12 = 0.",
        spokenQuestion:
          "Higher stretch: find the integer solution to two x squared plus five x minus twelve equals zero.",
        canonicalAnswer: "-4",
        acceptedVariants: ["x=-4"],
        hintSpoken:
          "Factorise into two x minus three, times x plus four, equals zero.",
        workedSolutionSpoken:
          "Two x minus three times x plus four equals zero gives x equals three halves or x equals negative four, so the integer root is negative four.",
        workedSolutionBoard: {
          headline: "Worked Solution — 2x² + 5x − 12 = 0",
          lens: "exam",
          steps: [
            {
              label: "Factorise",
              latex:
                "(2x - 3)(x + 4) = 0 \\implies x = 1.5 \\text{ or } x = -4",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "simultaneous-equations",
    edexcelCode: "A19",
    strand: "algebra",
    title: "Simultaneous Equations",
    subtitle: "Elimination, substitution & café word problems",
    tier: "crossover",
    gradeRange: "Grades 5–8",
    calculator: "both",
    estimatedMinutes: 8,
    prerequisites: [
      {
        code: "0.1",
        title: "Same Sign Subtract, Opposite Sign Add",
        summary:
          "Match coefficients of one variable, then add or subtract equations.",
        spokenExplanation:
          "If one equation has plus two y and the other has minus two y, adding them wipes y out immediately!",
        checkQuestion:
          "Add (3x + 2y = 14) and (x − 2y = 2): what does 4x equal?",
        spokenQuestion:
          "If three x plus two y is fourteen, and x minus two y is two, adding both equations gives four x equals what?",
        canonicalAnswer: "16",
        board: {
          headline: "Prerequisite 0.1 — Opposite Signs Add!",
          lens: "pattern",
          steps: [
            {
              label: "Add equations",
              latex: "(3x + x) + (2y - 2y) = 14 + 2 \\implies 4x = 16",
            },
          ],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Linear Elimination (SSS / DAA)",
        summary: "Scale one or both equations so a coefficient matches.",
      },
      {
        code: "1.2",
        title: "Linear + Quadratic Substitution (Higher)",
        summary: "Substitute y = mx + c into x² + y² = r² for Grade 8–9 marks.",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Three coffees and two teas cost eleven pounds. One coffee and two teas cost five pounds. Compare the two trays: the only difference is TWO extra coffees on tray one, costing six extra pounds! So one coffee MUST cost three pounds!",
        displayText:
          "Compare the two café trays: 2 extra coffees explain the £6 price jump → 1 coffee = £3!",
        followUpQuestion:
          "Once 1 coffee = £3, how much is 1 tea from '1 coffee + 2 teas = £5'?",
        board: {
          headline: "Story Lens — Comparing Two Café Trays",
          lens: "story",
          steps: [
            {
              label: "Tray 1 − Tray 2",
              latex: "(3c + 2t) - (1c + 2t) = £11 - £5",
            },
            {
              label: "2 extra coffees",
              latex: "2c = £6 \\implies c = £3, \\; t = £1",
            },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Visually, each linear equation is a straight line on a coordinate grid, and the simultaneous solution is the single crossover point where both lines meet!",
        displayText:
          "Comparing stacked equations on a balance lets you subtract equal weights from both sides.",
        followUpQuestion:
          "If two lines are parallel, how many simultaneous solutions exist?",
        board: {
          headline: "Visual Lens — Stacked Balance Subtraction",
          lens: "visual",
          steps: [{ label: "Intersection", latex: "(c, t) = (3, 1)" }],
          visual: {
            kind: "equation-balance",
            title: "Subtracting Equal Trays",
            leftSide: "3c + 2t = 11",
            rightSide: "1c + 2t = 5",
            operationBadge: "Subtract → 2c = 6",
            caption:
              "Matching the 2t terms lets us cancel t in one clean subtraction.",
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Remember D-A-S-S: Different signs Add, Same signs Subtract. Test with tiny numbers on the side if you ever hesitate with minus signs!",
        displayText:
          "DASS rule: Different signs Add (+2y and −2y), Same signs Subtract (+2y and +2y).",
        followUpQuestion:
          "For +3y in equation 1 and +3y in equation 2, do we add or subtract?",
        board: {
          headline: "Why It Works — DASS Sign Rule",
          lens: "pattern",
          steps: [
            {
              label: "Opposite (+2y, -2y)",
              latex: "(+2y) + (-2y) = 0 \\quad (\\text{ADD})",
            },
            {
              label: "Same (+2y, +2y)",
              latex: "(+2y) - (+2y) = 0 \\quad (\\text{SUBTRACT})",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "Label your equations one and two clearly. After finding x and y, substitute into the OTHER equation you didn't just use — if it works, you know with certainty you scored full marks!",
        displayText:
          "Substitute into Equation (1) to find y, then check inside Equation (2) to verify!",
        followUpQuestion:
          "Why doesn't checking in Equation (1) catch an arithmetic slip made while finding y?",
        board: {
          headline: "Edexcel 1MA1 Exam Method",
          lens: "exam",
          steps: [
            {
              label: "(1) 2x + 3y = 13, (2) 5x - y = 7",
              latex: "(2) \\times 3 \\implies 15x - 3y = 21",
            },
            {
              label: "Add to (1)",
              latex: "17x = 34 \\implies x = 2, \\; y = 3",
            },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Let's solve two x plus y equals nine, and x minus y equals three. Since we have plus y and minus y, if we add both equations, what does three x equal?",
        displayText: "Guided Turn: 2x + y = 9 and x − y = 3. Add them: 3x = ?",
        followUpQuestion: "What does 3x equal?",
        board: {
          headline: "Socratic Check",
          lens: "socratic",
          steps: [
            {
              label: "Add",
              latex: "(2x + y) + (x - y) = 9 + 3 \\implies 3x = \\; ?",
            },
          ],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Ready-Matched Elimination",
        questionText: "Solve x + y = 10 and x − y = 4. Give the value of x.",
        spokenQuestion: "If x plus y is ten, and x minus y is four, what is x?",
        canonicalAnswer: "7",
        acceptedVariants: ["x=7"],
        hintSpoken: "Add both equations so two x equals fourteen.",
        workedSolutionSpoken:
          "Adding gives two x equals fourteen, so x equals seven.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [{ label: "Add", latex: "2x = 14 \\implies x = 7" }],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Edexcel Scaling Question",
        questionText:
          "Solve 3x + 2y = 19 and 2x − y = 8. Work out the value of x.",
        spokenQuestion:
          "Solve three x plus two y equals nineteen, and two x minus y equals eight. Find x.",
        canonicalAnswer: "5",
        acceptedVariants: ["x=5"],
        hintSpoken:
          "Double the second equation to four x minus two y equals sixteen, then add!",
        workedSolutionSpoken:
          "Doubling the second gives four x minus two y equals sixteen. Adding gives seven x equals thirty-five, so x equals five.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [
            { label: "Scale (2) × 2", latex: "4x - 2y = 16" },
            { label: "Add", latex: "7x = 35 \\implies x = 5" },
          ],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Word Problem Formation",
        questionText:
          "4 adult tickets and 2 child tickets cost £46. 2 adult tickets and 3 child tickets cost £33. Work out the cost of 1 adult ticket.",
        spokenQuestion:
          "Four adult and two child tickets cost forty-six pounds. Two adult and three child tickets cost thirty-three pounds. Find the cost of one adult ticket.",
        canonicalAnswer: "9",
        acceptedVariants: ["£9"],
        hintSpoken:
          "Halve the first equation to get two adult plus one child equals twenty-three, then compare with the second!",
        workedSolutionSpoken:
          "Halving the first gives two adult plus one child equals twenty-three. Comparing with two adult plus three child equals thirty-three shows two child tickets cost ten pounds, so one child is five pounds and one adult is nine pounds.",
        workedSolutionBoard: {
          headline: "Worked Solution — Ticket Simultaneous",
          lens: "exam",
          steps: [
            { label: "Halve (1)", latex: "2a + c = 23" },
            {
              label: "(2) − (1a)",
              latex: "2c = 10 \\implies c = £5 \\implies a = £9",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "sequences-nth-term",
    edexcelCode: "A25",
    strand: "algebra",
    title: "Sequences & Finding the nth Term",
    subtitle:
      "Linear dn + c rules, term membership tests & quadratic sequences",
    tier: "crossover",
    gradeRange: "Grades 3–8",
    calculator: "both",
    estimatedMinutes: 7,
    prerequisites: [
      {
        code: "0.1",
        title: "Common Difference",
        summary: "Subtract consecutive terms to find the step size d.",
        spokenExplanation:
          "In five, eight, eleven, fourteen, the sequence jumps up by plus three every step.",
        checkQuestion: "Find the next term in 5, 8, 11, 14, ...",
        spokenQuestion:
          "What is the next number in five, eight, eleven, fourteen?",
        canonicalAnswer: "17",
        board: {
          headline: "Prerequisite 0.1 — Term-to-Term Jump",
          lens: "pattern",
          steps: [{ label: "+3 each step", latex: "14 + 3 = 17" }],
        },
      },
    ],
    mainCurriculum: [
      {
        code: "1.1",
        title: "Linear nth Term (dn + Zero-th Term)",
        summary: "Compare against the d-times table or step back to term 0.",
      },
      {
        code: "1.2",
        title: "'Is 100 in This Sequence?' Proof",
        summary: "Solve dn + c = 100; n must be a positive whole number!",
      },
      {
        code: "1.3",
        title: "Quadratic Sequences an² + bn + c (Higher)",
        summary: "Halve the second difference to find a first!",
      },
    ],
    lenses: {
      story: {
        lens: "story",
        spokenText:
          "Picture hiring an e-scooter: a two-pound unlock fee before you even move, plus three pounds per minute. After one minute it costs five pounds, after two minutes eight pounds, after n minutes three n plus two!",
        displayText:
          "Unlock fee (term 0 = +2) + £3 per step (3n) builds 5, 8, 11, 14 → 3n + 2.",
        followUpQuestion:
          "Using 3n + 2, how much would the 100th term be without listing all 100 numbers?",
        board: {
          headline: "Story Lens — Start Fee + Step Rate",
          lens: "story",
          steps: [
            {
              label: "nth term",
              latex: "T_n = 3n + 2 \\implies T_{100} = 302",
            },
          ],
        },
      },
      visual: {
        lens: "visual",
        spokenText:
          "Hop backwards one step before the first term on the number line! Five, eight, eleven jumps by plus three, so one hop backwards lands on the secret zero-th term: plus two. Put the jump three in front of n, and attach plus two!",
        displayText:
          "Hop one step left of Term 1 to uncover Term 0 (+2): Rule = (jump)n + (Term 0) = 3n + 2.",
        followUpQuestion:
          "For 7, 11, 15, 19, what is the secret Term 0 one step to the left of 7?",
        board: {
          headline: "Visual Lens — Hop Back to Term 0",
          lens: "visual",
          steps: [
            {
              label: "Step back",
              latex:
                "\\mathbf{+2} \\xleftarrow{-3} 5 \\xrightarrow{+3} 8 \\xrightarrow{+3} 11 \\implies 3n + 2",
            },
          ],
          visual: {
            kind: "number-line",
            title: "Stepping Back from Term 1 (5) to Term 0 (2)",
            min: 0,
            max: 12,
            tickStep: 2,
            points: [
              { value: 2, label: "T₀=2", style: "hollow" },
              { value: 5, label: "T₁=5" },
              { value: 8, label: "T₂=8" },
              { value: 11, label: "T₃=11" },
            ],
            jumps: [
              { from: 2, to: 5, label: "+3" },
              { from: 5, to: 8, label: "+3" },
              { from: 8, to: 11, label: "+3" },
            ],
          },
        },
      },
      pattern: {
        lens: "pattern",
        spokenText:
          "Line the sequence up directly underneath the three times table: three, six, nine, twelve. Every term in five, eight, eleven, fourteen sits exactly TWO higher than the three times table — so it is three n plus two!",
        displayText:
          "3n = 3, 6, 9, 12. Sequence = 5, 8, 11, 14 (shifted +2 above 3n) → 3n + 2.",
        followUpQuestion:
          "How does 1, 5, 9, 13 compare to the 4n table (4, 8, 12, 16)?",
        board: {
          headline: "Why It Works — Shifted Times Table",
          lens: "pattern",
          steps: [
            { label: "3n table", latex: "3, \\quad 6, \\quad 9, \\quad 12" },
            {
              label: "Add +2",
              latex: "5, \\quad 8, \\quad 11, \\quad 14 \\implies 3n + 2",
            },
          ],
        },
      },
      exam: {
        lens: "exam",
        spokenText:
          "When Edexcel asks 'Is 85 a term in 3n + 2?', solve three n plus two equals eighty-five. That gives three n equals eighty-three, which is twenty-seven point six recurring — NOT an integer, so write 'No, because n is not a whole number'!",
        displayText:
          "Membership proof: set rule = target, solve for n, state whether n is a whole number (integer).",
        followUpQuestion:
          "For Higher quadratic sequences, if the 2nd difference is 6, what is the coefficient of n²?",
        board: {
          headline: "Edexcel 1MA1 Exam Method",
          lens: "exam",
          steps: [
            {
              label: "Membership check",
              latex:
                "3n + 2 = 85 \\implies 3n = 83 \\implies n = 27.\\dot{6} \\notin \\mathbb{Z}",
            },
            {
              label: "Higher Quadratic",
              latex:
                "\\text{2nd diff} = 2a \\implies a = \\frac{\\text{2nd diff}}{2}",
            },
          ],
        },
      },
      socratic: {
        lens: "socratic",
        spokenText:
          "Find the nth term of nine, thirteen, seventeen, twenty-one. First: what is the common difference jumping from term to term?",
        displayText: "Guided Turn: 9, 13, 17, 21... Step 1: Common difference?",
        followUpQuestion: "Say or type the common difference.",
        board: {
          headline: "Socratic Check — 9, 13, 17, 21",
          lens: "socratic",
          steps: [{ label: "Step 1", latex: "13 - 9 = \\; ?" }],
        },
      },
    },
    testQuestions: [
      {
        difficulty: 3,
        label: "3/10 Find the 20th Term",
        questionText:
          "The nth term of a sequence is 4n − 3. Work out the 20th term.",
        spokenQuestion:
          "The nth term of a sequence is four n minus three. Work out the twentieth term.",
        canonicalAnswer: "77",
        hintSpoken:
          "Substitute n equals twenty: four times twenty minus three.",
        workedSolutionSpoken:
          "Four times twenty is eighty, minus three equals seventy-seven.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [{ label: "n = 20", latex: "4(20) - 3 = 77" }],
        },
      },
      {
        difficulty: 6,
        label: "6/10 Constant Term in dn + c",
        questionText:
          "A linear sequence begins 7, 12, 17, 22... Its nth term is 5n + c. Find c.",
        spokenQuestion:
          "A sequence starts seven, twelve, seventeen, twenty-two. Its nth term is five n plus c. What is c?",
        canonicalAnswer: "2",
        hintSpoken: "Hop one step of five backwards before seven!",
        workedSolutionSpoken:
          "Five times one is five, and we need seven for the first term, so c equals two.",
        workedSolutionBoard: {
          headline: "Worked Solution",
          lens: "exam",
          steps: [{ label: "Term 0", latex: "7 - 5 = 2 \\implies 5n + 2" }],
        },
      },
      {
        difficulty: 9,
        label: "9/10 Higher Quadratic Sequence",
        questionText:
          "A quadratic sequence begins 4, 9, 18, 31, 48... Work out the coefficient a in an² + bn + c.",
        spokenQuestion:
          "Higher stretch: a quadratic sequence starts four, nine, eighteen, thirty-one, forty-eight. Find the coefficient of n squared.",
        canonicalAnswer: "2",
        hintSpoken:
          "First differences are five, nine, thirteen, seventeen. Find the second difference and halve it!",
        workedSolutionSpoken:
          "First differences are five, nine, thirteen, seventeen, so the second difference is four. Halving four gives a equals two.",
        workedSolutionBoard: {
          headline: "Worked Solution — 2nd Difference",
          lens: "exam",
          steps: [
            { label: "1st diffs", latex: "5, \\; 9, \\; 13, \\; 17" },
            { label: "2nd diff = 4", latex: "a = 4 \\div 2 = 2" },
          ],
        },
      },
    ],
  },
];
