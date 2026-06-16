# Seed All Curriculum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and run a database seeder script `/scripts/seed-all-curriculum.ts` that idempotently seeds all 13 Year 8/9 GCSE Maths topics and 6 GCSE Science (Biology, Chemistry, Physics) topics into the database tables `Mission`, `Lesson`, and `ConceptCard`, each with exactly 3 high-quality concept cards.

**Architecture:** A standalone Node.js TypeScript script using `dotenv`, `postgres` (postgres-js), and `drizzle-orm` to perform transaction-based or clean batch upserts. We will first delete/clean existing default lessons/cards for the targeted missions, insert/upsert the missions, insert the lessons, and then bulk-insert the concept cards.

**Tech Stack:** TypeScript, Drizzle ORM, postgres-js, tsx.

---

### Task 1: Create Seeder Script

**Files:**
- Create: `scripts/seed-all-curriculum.ts`

- [ ] **Step 1: Write the database seeder script `scripts/seed-all-curriculum.ts`**

We will write the complete code with comprehensive, high-quality, typed curriculum content for all 13 Maths and 6 Science topics, ensuring each topic has a lesson and exactly 3 concept cards.

```typescript
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { mission, lesson, conceptCard } from "../lib/db/schema";

config({ path: ".env.local" });

interface CardData {
  title: string;
  body: string;
  visual?: string;
  example?: string;
  misconception?: string;
}

interface LessonData {
  slug: string;
  title: string;
  summary: string;
  cards: CardData[];
}

interface MissionData {
  slug: string;
  title: string;
  description: string;
  yearGroup: number;
  subject: "maths" | "science";
  gcseDomain: string;
  order: number;
  lessons: LessonData[];
}

const MATHS_MISSIONS: MissionData[] = [
  {
    slug: "number-skills",
    title: "Number Skills",
    description: "Master foundational number operations, rounding, standard form, and density.",
    yearGroup: 8,
    subject: "maths",
    gcseDomain: "Number",
    order: 10,
    lessons: [
      {
        slug: "number-skills-lesson-1",
        title: "Introduction to Number Skills",
        summary: "Develop essential skills in rounding, decimal places, and estimating values.",
        cards: [
          {
            title: "Rounding and Decimal Places",
            body: "Rounding makes numbers simpler but keeps their value close to what they were. To round, look at the first digit after your cut-off: if it is 5 or more, round up; otherwise, round down.",
            visual: "3.14159 rounded to 2 d.p. -> 3.14",
            example: "Round 8.67 to 1 decimal place. Look at 7: it's >= 5, so 8.6 becomes 8.7.",
            misconception: "Thinking that rounding 8.14 up to 8.2 is correct because 4 rounds up."
          },
          {
            title: "Significant Figures",
            body: "Significant figures are digits that carry meaning contributing to a number's precision. The first significant figure is the first non-zero digit. All digits after it are significant.",
            visual: "0.00345 -> 1st sig fig is 3. Rounded to 2 sig figs -> 0.0035",
            example: "Round 45,382 to 2 significant figures. The 1st is 4, 2nd is 5. Next digit 3 < 5, so round to 45,000.",
            misconception: "Counting leading zeros as significant digits."
          },
          {
            title: "Standard Form",
            body: "Standard form is a convenient way to write very large or very small numbers using powers of 10. It is written as A × 10^n, where A is a number between 1 and 10, and n is an integer.",
            visual: "350,000 = 3.5 × 10^5  |  0.0002 = 2.0 × 10^-4",
            example: "Write 6,200 in standard form: move the decimal point 3 places left -> 6.2 × 10^3.",
            misconception: "Allowing A to be greater than or equal to 10 (e.g. writing 35 × 10^4 instead of 3.5 × 10^5)."
          }
        ]
      }
    ]
  },
  {
    slug: "fractions",
    title: "Fractions",
    description: "Simplify, add, subtract, multiply, and divide standard and mixed fractions.",
    yearGroup: 8,
    subject: "maths",
    gcseDomain: "Number",
    order: 20,
    lessons: [
      {
        slug: "fractions-lesson-1",
        title: "Mastering Fractions",
        summary: "Learn to add, multiply, and convert mixed numbers and standard fractions.",
        cards: [
          {
            title: "Equivalent Fractions & Simplifying",
            body: "Equivalent fractions represent the same portion of a whole. To simplify a fraction, divide both the numerator and the denominator by their highest common factor (HCF) until they cannot be divided further.",
            visual: "12/18 = (12÷6)/(18÷6) = 2/3",
            example: "Simplify 15/25. Divide both by HCF 5 to get 3/5.",
            misconception: "Subtracting from both numerator and denominator instead of dividing."
          },
          {
            title: "Adding and Subtracting Fractions",
            body: "To add or subtract fractions, they must have the same denominator (a common denominator). Multiply numerator and denominator of each fraction to make them equivalent with the Lowest Common Multiple.",
            visual: "1/4 + 1/3 -> 3/12 + 4/12 = 7/12",
            example: "Compute 1/2 + 1/5. The LCM of 2 and 5 is 10. Fractions become 5/10 + 2/10 = 7/10.",
            misconception: "Adding the numerators and adding the denominators directly (e.g., 1/2 + 1/3 = 2/5)."
          },
          {
            title: "Multiplying & Dividing Fractions",
            body: "Multiplying fractions is straightforward: multiply the numerators together, and multiply the denominators together. To divide, multiply the first fraction by the reciprocal (flipped version) of the second fraction.",
            visual: "a/b × c/d = (ac)/(bd)  |  a/b ÷ c/d = a/b × d/c",
            example: "Multiply 2/3 by 3/4. (2×3)/(3×4) = 6/12 = 1/2.",
            misconception: "Finding a common denominator before multiplying or dividing fractions."
          }
        ]
      }
    ]
  },
  {
    slug: "percentages",
    title: "Percentages",
    description: "Master percentage calculations, reverse percentages, and decimal multipliers.",
    yearGroup: 8,
    subject: "maths",
    gcseDomain: "Number",
    order: 30,
    lessons: [
      {
        slug: "percentages-lesson-1",
        title: "Introduction to Percentages",
        summary: "Learn decimal multipliers, reverse percentages, and multi-step percentage change.",
        cards: [
          {
            title: "Percent means out of 100",
            body: "Percent is a way of showing a part of a whole split into 100 equal pieces. To convert a percentage to a decimal, divide by 100.",
            visual: "25% = 25/100 = 0.25",
            example: "75% of a group of 200 people represents 150 people.",
            misconception: "Assuming percentages can never exceed 100%."
          },
          {
            title: "Decimal Multipliers",
            body: "Using decimal multipliers is the fastest way to calculate percentage changes. To increase by 15%, multiply by 1.15. To decrease by 15%, multiply by 0.85.",
            visual: "Original Value × Multiplier = New Value",
            example: "Increase £80 by 20%: £80 × 1.20 = £96.",
            misconception: "Multiplying by 0.20 instead of 1.20 for a 20% increase."
          },
          {
            title: "Reverse Percentages",
            body: "Reverse percentage problems ask you to find the original value after a percentage change has occurred. Always divide the final value by the decimal multiplier.",
            visual: "Original Value = New Value ÷ Multiplier",
            example: "An item costs £120 after a 20% increase. Multiplier = 1.20. Original = 120 ÷ 1.20 = £100.",
            misconception: "Trying to find the original value by subtracting 20% of the new value from itself."
          }
        ]
      }
    ]
  },
  {
    slug: "ratio-proportion",
    title: "Ratio & Proportion",
    description: "Simplify and divide ratios, work with 1:n format, and solve direct proportion problems.",
    yearGroup: 8,
    subject: "maths",
    gcseDomain: "Ratio, proportion and rates of change",
    order: 40,
    lessons: [
      {
        slug: "ratio-proportion-lesson-1",
        title: "Understanding Ratio and Proportion",
        summary: "Learn to share quantities in ratios, simplify ratios, and solve direct proportion questions.",
        cards: [
          {
            title: "What is a Ratio?",
            body: "A ratio compares two or more quantities, showing how much of one part exists relative to another. The order of numbers in a ratio matters.",
            visual: "Blue:Red = 3:2 (3 parts blue for every 2 parts red)",
            example: "If there are 15 blue and 10 red sweets, the ratio of blue to red is 15:10, which simplifies to 3:2.",
            misconception: "Confusing the ratio 3:2 with 2:3 by switching the order."
          },
          {
            title: "Sharing in a Ratio",
            body: "To share an amount in a ratio: 1) Add the parts together to find total parts, 2) Divide the total amount by the total parts to find the value of one part, 3) Multiply each part of the ratio by that value.",
            visual: "Share £100 in 3:2. Total parts = 5. One part = £20. 3 parts = £60, 2 parts = £40.",
            example: "Share 24 marbles in 1:2. Total parts = 3. One part = 8. Share is 8 and 16 marbles.",
            misconception: "Dividing the total amount directly by each part of the ratio."
          },
          {
            title: "Direct Proportion",
            body: "Two quantities are in direct proportion if they increase or decrease at the same rate. This means their ratio remains constant.",
            visual: "If 4 cakes cost £12, then 1 cake costs £3, and 5 cakes cost £15.",
            example: "If 3 tickets cost £18, 1 ticket costs 18 ÷ 3 = £6. Therefore, 10 tickets cost 10 × 6 = £60.",
            misconception: "Applying additive thinking (e.g. 4 cakes cost £12, so 5 cakes must cost £13)."
          }
        ]
      }
    ]
  },
  {
    slug: "algebra-basics",
    title: "Algebra Basics",
    description: "Understand algebraic expressions, expand brackets, factorise, and solve linear equations.",
    yearGroup: 8,
    subject: "maths",
    gcseDomain: "Algebra",
    order: 50,
    lessons: [
      {
        slug: "algebra-basics-lesson-1",
        title: "Introduction to Algebra",
        summary: "Learn expanding, factorising, and solving simple linear equations.",
        cards: [
          {
            title: "Expanding Single Brackets",
            body: "To expand a bracket, multiply the term on the outside by every term inside the bracket.",
            visual: "a(b + c) = ab + ac",
            example: "Expand 3(x + 4). Multiply 3 by x and 3 by 4 to get 3x + 12.",
            misconception: "Multiplying only the first term (e.g. 3(x + 4) = 3x + 4)."
          },
          {
            title: "Factorising Single Brackets",
            body: "Factorising is the opposite of expanding. Find the highest common factor (HCF) of all the terms, write it outside the bracket, and divide each term by the HCF to fill the inside.",
            visual: "4x + 8 = 4(x + 2)",
            example: "Factorise 6x - 9. HCF of 6x and 9 is 3. Write 3 outside: 3(2x - 3).",
            misconception: "Failing to extract the highest common factor (e.g., writing 2(3x - 6) instead of 6(x - 2) for 6x - 12)."
          },
          {
            title: "Solving Linear Equations",
            body: "To solve an equation, perform the inverse (opposite) operation on both sides of the equals sign to isolate the variable.",
            visual: "2x + 5 = 15  ->  subtract 5  ->  2x = 10  ->  divide by 2  ->  x = 5",
            example: "Solve 3y - 2 = 10. Add 2 to both sides: 3y = 12. Divide by 3: y = 4.",
            misconception: "Performing an operation on only one side of the equation."
          }
        ]
      }
    ]
  },
  {
    slug: "straight-line-graphs",
    title: "Straight-Line Graphs",
    description: "Plot coordinates, complete tables of values, find gradient, and draw linear graphs.",
    yearGroup: 8,
    subject: "maths",
    gcseDomain: "Graphs",
    order: 60,
    lessons: [
      {
        slug: "straight-line-graphs-lesson-1",
        title: "Plotting and Drawing Graphs",
        summary: "Understand coordinates, tables of values, and linear equations of the form y = mx + c.",
        cards: [
          {
            title: "Plotting Coordinates",
            body: "Coordinates tell us where a point is on a grid. They are written as (x, y). The x-coordinate tells us how far right or left to go, and the y-coordinate tells us how far up or down.",
            visual: "(x, y) -> along the corridor, up the stairs",
            example: "To plot (3, -2), start at origin (0,0), move 3 units right, and 2 units down.",
            misconception: "Swapping x and y coordinates (e.g., going 2 units right and 3 units down for (3, -2))."
          },
          {
            title: "Completing Tables of Values",
            body: "A table of values maps x-coordinates to y-coordinates based on a line's equation. Substitute the given x-values into the equation to compute y.",
            visual: "Equation: y = 2x + 1  |  If x = 3, y = 2(3) + 1 = 7",
            example: "For equation y = 3x - 2, if x = 4, then y = 3(4) - 2 = 10.",
            misconception: "Multiplying incorrectly when x is negative (e.g. 2(-3) + 1 = -5 but getting 5)."
          },
          {
            title: "The Equation y = mx + c",
            body: "Any straight line has an equation in the form y = mx + c, where m is the gradient (steepness) and c is the y-intercept (where the line crosses the y-axis).",
            visual: "Gradient m = Change in y ÷ Change in x",
            example: "In the line y = 3x - 4, the gradient is 3, and the y-intercept is at (0, -4).",
            misconception: "Assuming m is the gradient even if the equation is not in the form y = mx + c (e.g., in y + 2x = 5, gradient is -2, not 1)."
          }
        ]
      }
    ]
  },
  {
    slug: "angles-geometry",
    title: "Angles & Geometry",
    description: "Learn angle rules in parallel lines, polygons, and naming 2D shape properties.",
    yearGroup: 8,
    subject: "maths",
    gcseDomain: "Geometry & Measures",
    order: 70,
    lessons: [
      {
        slug: "angles-geometry-lesson-1",
        title: "Angle Rules and Geometrical Reasoning",
        summary: "Master angle facts, angles in polygons, and angle rules in parallel lines.",
        cards: [
          {
            title: "Fundamental Angle Rules",
            body: "Essential angle rules: 1) Angles on a straight line add up to 180°, 2) Angles around a point add up to 360°, 3) Angles in a triangle add up to 180°.",
            visual: "Straight line: a + b = 180°  |  Around a point: a + b + c = 360°",
            example: "If two angles on a straight line are x and 70°, then x = 180° - 70° = 110°.",
            misconception: "Thinking angles in a quadrilateral add up to 180° instead of 360°."
          },
          {
            title: "Angles in Parallel Lines",
            body: "When a line crosses parallel lines: 1) Alternate angles are equal (Z-angles), 2) Corresponding angles are equal (F-angles), 3) Allied/Co-interior angles add up to 180° (C-angles).",
            visual: "Alternate (Z) = equal  |  Corresponding (F) = equal",
            example: "If an angle is 65°, its alternate angle on parallel lines is also 65°.",
            misconception: "Applying these rules to lines that are not parallel."
          },
          {
            title: "Angles in Polygons",
            body: "For any polygon with n sides, the sum of its interior angles is (n - 2) × 180°. The exterior angles of any polygon always add up to 360°.",
            visual: "Sum of interior angles = (n - 2) × 180°",
            example: "A pentagon has 5 sides. Sum of interior angles = (5 - 2) × 180° = 3 × 180° = 540°.",
            misconception: "Dividing 360° by the interior angle to find the number of sides in a regular polygon."
          }
        ]
      }
    ]
  },
  {
    slug: "probability",
    title: "Probability",
    description: "Understand probability scales, frequency trees, and computing basic outcomes.",
    yearGroup: 8,
    subject: "maths",
    gcseDomain: "Probability",
    order: 80,
    lessons: [
      {
        slug: "probability-lesson-1",
        title: "Probability Foundations",
        summary: "Master the probability scale, calculate basic probabilities, and fill in frequency trees.",
        cards: [
          {
            title: "The Probability Scale",
            body: "Probability is the chance of an event happening. It is measured on a scale from 0 (impossible) to 1 (certain). It can be written as a fraction, decimal, or percentage.",
            visual: "Impossible (0) ----- Even Chance (0.5) ----- Certain (1)",
            example: "The probability of rolling a 7 on a standard 6-sided die is 0 (impossible).",
            misconception: "Giving a probability value greater than 1 or less than 0 (e.g., '120%' or '1.5')."
          },
          {
            title: "Calculating Probability",
            body: "To find the probability of a single event: Divide the number of successful outcomes by the total number of possible outcomes.",
            visual: "P(Event) = Number of successful outcomes ÷ Total outcomes",
            example: "A bag has 3 red and 7 blue balls. Probability of picking red is 3 / (3+7) = 3/10 = 0.3.",
            misconception: "Writing probabilities as ratios (e.g. probability of red is 3:7 instead of 3/10)."
          },
          {
            title: "Frequency Trees",
            body: "A frequency tree is a diagram showing how a total frequency is split into different categories. The branches split out, and the numbers on the ends of branches must add up to the number they split from.",
            visual: "Total (100) ---> Boys (60) / Girls (40)",
            example: "If 100 students are split into Boys and Girls, and there are 60 Boys, there must be 100 - 60 = 40 Girls.",
            misconception: "Putting probabilities on the branches of a frequency tree instead of actual counts."
          }
        ]
      }
    ]
  },
  {
    slug: "area-perimeter",
    title: "Area & Perimeter",
    description: "Calculate perimeter and area of squares, rectangles, triangles, and circles.",
    yearGroup: 8,
    subject: "maths",
    gcseDomain: "Geometry & Measures",
    order: 90,
    lessons: [
      {
        slug: "area-perimeter-lesson-1",
        title: "Perimeter and Area of 2D Shapes",
        summary: "Learn perimeter and area formulas for rectangles, triangles, and circles.",
        cards: [
          {
            title: "Perimeter",
            body: "Perimeter is the total distance around the edge of a 2D shape. Find it by adding all the outer side lengths together. Units are always 1D (e.g. cm, m).",
            visual: "Perimeter of Rectangle = 2 × (length + width)",
            example: "A rectangle has length 6cm and width 4cm. Perimeter = 6 + 6 + 4 + 4 = 20cm.",
            misconception: "Including inner lines when calculating the perimeter of compound shapes."
          },
          {
            title: "Area of Rectangles and Triangles",
            body: "Area measures the space inside a 2D shape. Rectangle Area = base × height. Triangle Area = 0.5 × base × height. Units are squared (e.g., cm², m²).",
            visual: "Area of Triangle = ½ × base × perpendicular height",
            example: "A triangle has base 8cm and height 5cm. Area = 0.5 × 8 × 5 = 20cm².",
            misconception: "Using the slanted height of a triangle instead of its perpendicular height."
          },
          {
            title: "Area of a Circle",
            body: "The area of a circle is calculated using the formula πr², where r is the radius (distance from the centre to the edge). If given the diameter, divide it by 2 first to get the radius.",
            visual: "Area = π × r²  (where radius r = diameter d ÷ 2)",
            example: "A circle has radius 5cm. Area = π × 5² = 25π ≈ 78.5cm².",
            misconception: "Squaring the diameter directly, or squaring the product of π and r (e.g., doing (πr)²)."
          }
        ]
      }
    ]
  },
  {
    slug: "indices-standard-form",
    title: "Indices & Standard Form",
    description: "Understand the laws of indices, positive/negative powers, and advanced standard form.",
    yearGroup: 9,
    subject: "maths",
    gcseDomain: "Number",
    order: 100,
    lessons: [
      {
        slug: "indices-standard-form-lesson-1",
        title: "Laws of Indices and Powers",
        summary: "Master index notation and apply multiplication, division, and power-of-power rules.",
        cards: [
          {
            title: "Laws of Indices",
            body: "Rules of powers: 1) Multiplication rule: add powers, 2) Division rule: subtract powers, 3) Power of a power rule: multiply powers.",
            visual: "x^a × x^b = x^(a+b)  |  x^a ÷ x^b = x^(a-b)  |  (x^a)^b = x^(ab)",
            example: "Simplify y^5 × y^3. Add the powers: 5 + 3 = 8, so y^8.",
            misconception: "Multiplying the indices during a multiplication rule (e.g., writing x^3 × x^2 = x^6 instead of x^5)."
          },
          {
            title: "Negative and Zero Indices",
            body: "Any non-zero base raised to the power of 0 is equal to 1. A negative power represents the reciprocal (1 over that base raised to the positive power).",
            visual: "x^0 = 1  |  x^-a = 1 ÷ x^a",
            example: "Evaluate 5^-2. Reciprocal is 1 ÷ 5^2 = 1/25 = 0.04.",
            misconception: "Assuming a negative power makes the final number negative (e.g. thinking 3^-2 = -9)."
          },
          {
            title: "Standard Form Calculations",
            body: "To add or subtract in standard form, convert them to normal numbers first or write them with the same power of 10. To multiply or divide, calculate the numbers and add/subtract powers of 10.",
            visual: "(A × 10^a) × (B × 10^b) = (A × B) × 10^(a+b)",
            example: "Multiply (2 × 10^3) by (3 × 10^4). Multiply 2 by 3 = 6. Add powers: 3 + 4 = 7. Answer: 6 × 10^7.",
            misconception: "Leaving the final answer with a base outside the 1 to 10 range (e.g., 20 × 10^5)."
          }
        ]
      }
    ]
  },
  {
    slug: "volume-surface-area",
    title: "Volume & Surface Area",
    description: "Calculate volume and surface area of 3D prisms including cuboids and cylinders.",
    yearGroup: 9,
    subject: "maths",
    gcseDomain: "Geometry & Measures",
    order: 110,
    lessons: [
      {
        slug: "volume-surface-area-lesson-1",
        title: "Volume and Surface Area of Prisms",
        summary: "Understand formulas for volumes and surface areas of cuboids and cylinders.",
        cards: [
          {
            title: "Volume of a Prism",
            body: "A prism is a 3D shape with a constant cross-section. The volume of any prism is the area of its cross-section (base area) multiplied by its length (height).",
            visual: "Volume = Area of Cross-Section × Length",
            example: "A triangular prism has cross-section area 15cm² and length 10cm. Volume = 15 × 10 = 150cm³.",
            misconception: "Forgetting to divide by 2 when calculating the triangular cross-section area."
          },
          {
            title: "Surface Area of a Cuboid",
            body: "The surface area of a 3D shape is the total area of all its outer faces added together. A cuboid has 6 rectangular faces, which exist in 3 identical pairs.",
            visual: "Surface Area = 2 × (lw + wh + lh)",
            example: "A cuboid has length 5cm, width 3cm, height 4cm. Area = 2 × (15 + 12 + 20) = 2 × 47 = 94cm².",
            misconception: "Calculating only 3 faces and forgetting to multiply by 2."
          },
          {
            title: "Volume and Surface Area of a Cylinder",
            body: "A cylinder is a special prism with a circular cross-section. Volume = πr²h. Surface area = 2πr² (two circles) + 2πrh (curved rectangular wrapper).",
            visual: "Volume = πr²h  |  Surface Area = 2πr² + 2πrh",
            example: "A cylinder has radius 3cm and height 10cm. Volume = π × 3² × 10 = 90π ≈ 282.7cm³.",
            misconception: "Using diameter instead of radius in the formulas."
          }
        ]
      }
    ]
  },
  {
    slug: "simultaneous-equations",
    title: "Simultaneous Equations",
    description: "Solve pairs of simultaneous linear equations using the elimination method.",
    yearGroup: 9,
    subject: "maths",
    gcseDomain: "Algebra",
    order: 120,
    lessons: [
      {
        slug: "simultaneous-equations-lesson-1",
        title: "Solving Simultaneous Equations",
        summary: "Learn to eliminate variables and solve simultaneous linear equations step by step.",
        cards: [
          {
            title: "What are Simultaneous Equations?",
            body: "Simultaneous equations are a set of two or more equations containing multiple variables. To find the solution, we must find values for the variables that satisfy both equations at the same time.",
            visual: "Equation 1: x + y = 10  |  Equation 2: x - y = 4  ->  x = 7, y = 3",
            example: "If x + y = 5 and x - y = 1, then x = 3 and y = 2.",
            misconception: "Finding a solution that works for only one of the equations but not both."
          },
          {
            title: "Elimination Method",
            body: "To solve simultaneous equations using elimination: 1) Multiply one or both equations so that one of the variables has the same coefficient in both, 2) Add or subtract the equations to eliminate that variable.",
            visual: "Same Signs Subtract (SSS)  |  Different Signs Add (DSA)",
            example: "Solve 2x + y = 11 and 2x - y = 5. Different signs for y (+ and -) -> Add them: 4x = 16 -> x = 4.",
            misconception: "Adding equations when the coefficients have the same sign, which does not eliminate the variable."
          },
          {
            title: "Substitution and Finding the Second Variable",
            body: "Once you have found the value of one variable, substitute it back into either of the original equations to solve for the second variable. Always verify both answers in the other equation.",
            visual: "Substitute x = 4 into 2x + y = 11  ->  2(4) + y = 11  ->  8 + y = 11  ->  y = 3",
            example: "If x = 2 and 3x + y = 10, then 3(2) + y = 10 -> 6 + y = 10 -> y = 4.",
            misconception: "Forgetting to find the value of the second variable after finding the first."
          }
        ]
      }
    ]
  },
  {
    slug: "pythagoras",
    title: "Pythagoras",
    description: "Master Pythagoras' Theorem to calculate missing side lengths in right-angled triangles.",
    yearGroup: 9,
    subject: "maths",
    gcseDomain: "Geometry & Measures",
    order: 130,
    lessons: [
      {
        slug: "pythagoras-lesson-1",
        title: "Pythagoras' Theorem",
        summary: "Understand right-angled triangles and apply a² + b² = c² to find sides.",
        cards: [
          {
            title: "Right-Angled Triangles and the Hypotenuse",
            body: "Pythagoras' Theorem only works on right-angled triangles. The longest side is called the hypotenuse. It is always directly opposite the right angle.",
            visual: "Hypotenuse 'c' is the slanted side opposite the 90° angle.",
            example: "In a triangle with sides 3cm, 4cm, and 5cm, the side of 5cm is the hypotenuse.",
            misconception: "Labeling a short side adjacent to the right angle as the hypotenuse."
          },
          {
            title: "Finding the Hypotenuse",
            body: "To find the length of the hypotenuse (c): square the lengths of the two shorter sides (a and b), add them together, and then find the square root of the result.",
            visual: "c = √(a² + b²)",
            example: "Sides a = 6cm, b = 8cm. c² = 6² + 8² = 36 + 64 = 100. c = √100 = 10cm.",
            misconception: "Adding the side lengths first and then squaring (e.g., (6+8)² instead of 6² + 8²)."
          },
          {
            title: "Finding a Shorter Side",
            body: "To find the length of a shorter side (a or b): square the hypotenuse (c) and the known shorter side, subtract the smaller square from the larger square, and square root the result.",
            visual: "a = √(c² - b²)",
            example: "Hypotenuse c = 13cm, side b = 12cm. a² = 13² - 12² = 169 - 144 = 25. a = √25 = 5cm.",
            misconception: "Adding the squares instead of subtracting when finding a shorter side."
          }
        ]
      }
    ]
  }
];

const SCIENCE_MISSIONS: MissionData[] = [
  {
    slug: "cells-respiration",
    title: "Cells & Respiration",
    description: "Study eukaryotic and prokaryotic cell structures, specialized cell functions, and cellular respiration.",
    yearGroup: 8,
    subject: "science",
    gcseDomain: "biology",
    order: 200,
    lessons: [
      {
        slug: "cells-respiration-lesson-1",
        title: "Cell Structure and Respiration",
        summary: "Understand animal and plant cell organelles, and the chemical reactions of respiration.",
        cards: [
          {
            title: "The Building Blocks of Life",
            body: "All living organisms are made up of cells. Animal and plant cells are eukaryotic, meaning they contain a nucleus with DNA. Bacteria are prokaryotic and are much smaller, with DNA floating in the cytoplasm.",
            visual: "Eukaryotes (Animal/Plant, have Nucleus) vs Prokaryotes (Bacteria, no Nucleus)",
            example: "Human red blood cells and onion skin cells are eukaryotic. E. coli is prokaryotic.",
            misconception: "Thinking bacteria have a nucleus."
          },
          {
            title: "Organelles and Their Functions",
            body: "Different parts of a cell (organelles) have specific roles: 1) Nucleus: controls the cell, contains DNA, 2) Cell Membrane: controls what goes in/out, 3) Mitochondria: releases energy through respiration.",
            visual: "Plant Cells also have: Cell Wall (support), Chloroplasts (photosynthesis), Vacuole (sap).",
            example: "Chloroplasts contain green chlorophyll to absorb light energy from the sun.",
            misconception: "Confusing cell wall (found only in plants/fungi/bacteria) with cell membrane (found in all cells)."
          },
          {
            title: "Respiration: Releasing Energy",
            body: "Respiration is a chemical reaction that occurs inside mitochondria to release energy from glucose. Aerobic respiration uses oxygen, producing carbon dioxide, water, and energy.",
            visual: "Glucose + Oxygen -> Carbon Dioxide + Water (+ Energy)",
            example: "During exercise, your respiration rate increases to supply more energy to muscle cells.",
            misconception: "Thinking respiration is the same as breathing (breathing is gas exchange; respiration is chemical)."
          }
        ]
      }
    ]
  },
  {
    slug: "elements-compounds",
    title: "Elements & Compounds",
    description: "Explore the Periodic Table, distinguish elements, mixtures, and compounds, and write basic chemical formulas.",
    yearGroup: 8,
    subject: "science",
    gcseDomain: "chemistry",
    order: 210,
    lessons: [
      {
        slug: "elements-compounds-lesson-1",
        title: "Elements, Compounds and Mixtures",
        summary: "Learn to distinguish elements, compounds, and mixtures, and read chemical symbols.",
        cards: [
          {
            title: "Elements",
            body: "An element is a pure substance made of only one type of atom. It cannot be broken down chemically into anything simpler. Elements are represented by symbols on the Periodic Table.",
            visual: "Carbon (C), Helium (He), Oxygen (O₂ - two of the same atom chemically joined)",
            example: "A block of pure gold contains only gold (Au) atoms.",
            misconception: "Thinking oxygen gas (O₂) is a compound because it has a '2' (it is still an element because all atoms are identical)."
          },
          {
            title: "Compounds",
            body: "A compound is a substance made of two or more different elements chemically bonded together in fixed proportions. Compounds have different properties from the elements they are made from.",
            visual: "Water (H₂O) -> two Hydrogen atoms and one Oxygen atom chemically bonded.",
            example: "Sodium chloride (salt, NaCl) is safe to eat, even though it's made of explosive sodium metal and poisonous chlorine gas.",
            misconception: "Thinking compounds can be separated easily by filtering (they can only be separated by chemical reactions)."
          },
          {
            title: "Mixtures",
            body: "A mixture contains different substances (elements or compounds) that are mixed together but not chemically joined. They can be easily separated by physical methods like filtration or distillation.",
            visual: "Saltwater -> Salt (NaCl) particles and Water (H₂O) particles floating together.",
            example: "Air is a mixture of gases including Nitrogen, Oxygen, Carbon Dioxide, and Argon.",
            misconception: "Assuming mixtures are pure substances because they look uniform (like air or brass)."
          }
        ]
      }
    ]
  },
  {
    slug: "forces-magnets",
    title: "Forces & Magnets",
    description: "Calculate contact/non-contact forces, investigate friction, and explore magnetic poles and fields.",
    yearGroup: 8,
    subject: "science",
    gcseDomain: "physics",
    order: 220,
    lessons: [
      {
        slug: "forces-magnets-lesson-1",
        title: "Introduction to Forces and Magnetism",
        summary: "Identify forces, use force diagrams, and study magnets and magnetic fields.",
        cards: [
          {
            title: "What is a Force?",
            body: "A force is a push or pull acting on an object due to its interaction with another object. Forces can change an object's speed, direction, or shape. They are measured in Newtons (N).",
            visual: "Represented by arrows. Long arrow = large force. Direction of arrow = direction of force.",
            example: "Gravity pulling you down, friction slowing a skateboard, air resistance pushing against a cyclist.",
            misconception: "Thinking an object moving at a constant speed must have a net force pushing it forward (balanced forces mean constant speed)."
          },
          {
            title: "Friction and Resistance",
            body: "Friction is a contact force that opposes motion when two surfaces slide or rub past each other. It releases heat. Air resistance and water resistance are types of friction called drag.",
            visual: "Object slides Right ---> Friction pushes Left <---",
            example: "Brake pads pushing against bicycle wheels to slow them down.",
            misconception: "Assuming friction is always bad (we need friction to walk without slipping and to stop cars)."
          },
          {
            title: "Magnets and Magnetic Fields",
            body: "Magnetism is a non-contact force. Magnets have two poles: North and South. Like poles repel (push away); opposite poles attract (pull together). A magnetic field is the area around a magnet where its force acts.",
            visual: "North -> South magnetic field line arrows.",
            example: "Two North poles brought together will push each other apart.",
            misconception: "Thinking all metals are magnetic (only iron, nickel, and cobalt are magnetic)."
          }
        ]
      }
    ]
  },
  {
    slug: "photosynthesis-ecosystems",
    title: "Photosynthesis & Ecosystems",
    description: "Learn how chloroplasts perform photosynthesis, and map food chains and webs in ecosystems.",
    yearGroup: 9,
    subject: "science",
    gcseDomain: "biology",
    order: 230,
    lessons: [
      {
        slug: "photosynthesis-ecosystems-lesson-1",
        title: "Photosynthesis and Food Webs",
        summary: "Understand the chemical equation of photosynthesis, leaf structures, and food webs.",
        cards: [
          {
            title: "Photosynthesis",
            body: "Photosynthesis is the chemical reaction plants use to make food (glucose). It occurs in chloroplasts using light energy absorbed by chlorophyll.",
            visual: "Carbon Dioxide + Water (+ Light Energy) -> Glucose + Oxygen",
            example: "Plants take in water through roots, and carbon dioxide through pores in leaves (stomata).",
            misconception: "Thinking plants perform photosynthesis but do not respire (plants respire all the time; they only photosynthesise in light)."
          },
          {
            title: "Food Chains and Trophic Levels",
            body: "A food chain shows the transfer of energy from one organism to another in an ecosystem. It always starts with a producer (plant) which gets energy from the sun.",
            visual: "Grass (Producer) -> Rabbit (Primary Consumer) -> Fox (Secondary Consumer)",
            example: "Arrows in a food chain show the direction of energy flow (from eaten to eater).",
            misconception: "Thinking the arrow in a food chain points to what eats what (it points to where the energy goes)."
          },
          {
            title: "Food Webs and Interdependence",
            body: "A food web consists of many interconnected food chains in an ecosystem. Organisms are interdependent, meaning a change in the population of one species affects many others.",
            visual: "Complex web of overlapping arrows showing multiple food sources.",
            example: "If disease kills the rabbits, foxes might eat more mice, causing the mouse population to fall.",
            misconception: "Thinking that a change in one population only affects its direct predator or prey."
          }
        ]
      }
    ]
  },
  {
    slug: "chemical-reactions",
    title: "Chemical Reactions",
    description: "Identify reactants and products, classify reactions (combustion, neutralisation), and write equations.",
    yearGroup: 9,
    subject: "science",
    gcseDomain: "chemistry",
    order: 240,
    lessons: [
      {
        slug: "chemical-reactions-lesson-1",
        title: "Classifying Chemical Reactions",
        summary: "Master reactants and products, word equations, and chemical reaction types.",
        cards: [
          {
            title: "Signs of a Chemical Reaction",
            body: "During a chemical reaction, bonds are broken and formed to create new substances. Signs include: 1) Colour change, 2) Temperature change (exothermic gets hot; endothermic gets cold), 3) Fizzing/bubbles (gas production).",
            visual: "Reactants (Starting substances) -> Products (New substances formed)",
            example: "Mixing vinegar and baking soda causes bubbling because carbon dioxide gas is made.",
            misconception: "Assuming boiling water is a chemical reaction because it bubbles (boiling is a physical state change; the water molecules are still H₂O)."
          },
          {
            title: "Combustion & Thermal Decomposition",
            body: "Combustion is burning a fuel in oxygen, releasing heat (exothermic). Thermal decomposition is breaking down a substance by heating it (endothermic).",
            visual: "Fuel + Oxygen -> Carbon Dioxide + Water  |  Metal Carbonate -> Metal Oxide + Carbon Dioxide",
            example: "Heating copper carbonate (green powder) turns it into black copper oxide and releases CO₂ gas.",
            misconception: "Thinking that thermal decomposition requires oxygen to burn (it only requires heat to break bonds)."
          },
          {
            title: "Acids, Alkalis and Neutralisation",
            body: "Acids have a pH < 7. Alkalis have a pH > 7. When an acid reacts with an alkali (or base), they neutralise each other to produce a salt and water, bringing the pH closer to 7.",
            visual: "Acid + Alkali -> Salt + Water  |  pH Scale: Acid (1-6) -- Neutral (7) -- Alkali (8-14)",
            example: "Hydrochloric acid + Sodium hydroxide -> Sodium chloride (salt) + Water.",
            misconception: "Assuming all acids are highly dangerous and corrosive (lemon juice and vinegar are weak, safe acids we eat)."
          }
        ]
      }
    ]
  },
  {
    slug: "energy-waves",
    title: "Energy & Waves",
    description: "Study energy stores and transfers, conservation of energy, and transverse/longitudinal waves.",
    yearGroup: 9,
    subject: "science",
    gcseDomain: "physics",
    order: 250,
    lessons: [
      {
        slug: "energy-waves-lesson-1",
        title: "Energy Conservation and Wave Behaviour",
        summary: "Identify energy stores/transfers, and compare transverse and longitudinal waves.",
        cards: [
          {
            title: "Conservation of Energy",
            body: "The Law of Conservation of Energy states that energy cannot be created or destroyed, only stored or transferred from one form to another. Total energy always remains constant.",
            visual: "Total Energy Input = Useful Energy Output + Wasted Energy Output",
            example: "An electric light bulb transfers electrical energy into useful light energy and wasted heat energy.",
            misconception: "Thinking energy is 'used up' or disappears when a machine stops working."
          },
          {
            title: "Transverse Waves",
            body: "In a transverse wave, the vibrations are perpendicular (at 90 degrees) to the direction of energy transfer. They have crests (peaks) and troughs.",
            visual: "Vibrations up/down while energy transfers left/right. Examples: Light, water waves.",
            example: "A cork bobbing up and down on water ripples shows transverse motion.",
            misconception: "Thinking the water molecules themselves travel along the wave (only the energy travels)."
          },
          {
            title: "Longitudinal Waves",
            body: "In a longitudinal wave, the vibrations are parallel (in the same direction) to the direction of energy transfer. They have compressions (squashed regions) and rarefactions (stretched regions).",
            visual: "Vibrations left/right while energy transfers left/right. Examples: Sound, seismic P-waves.",
            example: "Sound waves traveling through air squeeze and stretch air molecules to carry the sound to your ears.",
            misconception: "Thinking sound waves can travel through a vacuum (sound requires a medium/particles to vibrate)."
          }
        ]
      }
    ]
  }
];

const ALL_MISSIONS = [...MATHS_MISSIONS, ...SCIENCE_MISSIONS];

async function main() {
  console.log("Starting full curriculum database seeding...");

  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL environment variable is missing!");
    process.exit(1);
  }

  const client = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(client);

  let missionsSeeded = 0;
  let lessonsSeeded = 0;
  let cardsSeeded = 0;

  try {
    for (const missionData of ALL_MISSIONS) {
      console.log(`Processing mission: ${missionData.title} (slug: ${missionData.slug})`);

      // 1. Upsert Mission
      const [insertedMission] = await db
        .insert(mission)
        .values({
          slug: missionData.slug,
          title: missionData.title,
          description: missionData.description,
          yearGroup: missionData.yearGroup,
          subject: missionData.subject,
          gcseDomain: missionData.gcseDomain,
          order: missionData.order,
          estimatedMinutes: 30,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: mission.slug,
          set: {
            title: missionData.title,
            description: missionData.description,
            yearGroup: missionData.yearGroup,
            subject: missionData.subject,
            gcseDomain: missionData.gcseDomain,
            order: missionData.order,
          },
        })
        .returning();

      missionsSeeded++;

      for (const lessonData of missionData.lessons) {
        console.log(`  Processing lesson: ${lessonData.title} (slug: ${lessonData.slug})`);

        // 2. Upsert Lesson
        const [insertedLesson] = await db
          .insert(lesson)
          .values({
            missionId: insertedMission.id,
            slug: lessonData.slug,
            title: lessonData.title,
            summary: lessonData.summary,
            order: 10,
            difficultyBand: "core",
            estimatedMinutes: 15,
          })
          .onConflictDoUpdate({
            target: lesson.slug,
            set: {
              missionId: insertedMission.id,
              title: lessonData.title,
              summary: lessonData.summary,
            },
          })
          .returning();

        lessonsSeeded++;

        // 3. Idempotently delete existing concept cards for this lesson and bulk insert new ones
        await db.delete(conceptCard).where(eq(conceptCard.lessonId, insertedLesson.id));

        for (let i = 0; i < lessonData.cards.length; i++) {
          const card = lessonData.cards[i];
          await db.insert(conceptCard).values({
            lessonId: insertedLesson.id,
            order: i + 1,
            title: card.title,
            body: card.body,
            visual: card.visual || null,
            example: card.example || null,
            misconception: card.misconception || null,
          });
          cardsSeeded++;
        }
      }
    }

    console.log("\nSeeding successfully complete!");
    console.log(`- Seeded ${missionsSeeded} Missions`);
    console.log(`- Seeded ${lessonsSeeded} Lessons`);
    console.log(`- Seeded ${cardsSeeded} Concept Cards`);

  } catch (error) {
    console.error("Database seeding encountered an error:", error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Seeder failed:", error);
  process.exit(1);
});
```

---

### Task 2: Run and Verify Curriculum Seeder

**Files:**
- Modify: None (verification task)

- [ ] **Step 1: Execute seeder script**

Run: `npx tsx scripts/seed-all-curriculum.ts`
Expected: Clear console output showing that all 13 Maths and 6 Science missions, their corresponding default lessons, and exactly 3 concept cards each were successfully upserted into the database.

- [ ] **Step 2: Check project compile health**

Run: `npx tsc --noEmit`
Expected: Zero compilation or type-checking errors.

- [ ] **Step 3: Run unit tests**

Run: `pnpm test:unit`
Expected: All 108 existing unit tests continue to pass cleanly with no regressions.
