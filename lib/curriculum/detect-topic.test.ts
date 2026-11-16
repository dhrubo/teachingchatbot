import { describe, expect, it } from "vitest";
import { detectEdexcelTopic } from "./detect-topic";

describe("detectEdexcelTopic", () => {
  const sampleQuestionsBySlug: ReadonlyArray<{
    slug: string;
    question: string;
  }> = [
    {
      slug: "compound-interest",
      question:
        "How do I work out £800 invested at 5% compound interest per year for 3 years?",
    },
    {
      slug: "reverse-percentages",
      question:
        "A jacket costs £68 in a 15% off sale. What was the original price before the sale?",
    },
    {
      slug: "fractions-operations",
      question: "How do I add 2/3 + 1/4 and write it as a simplified fraction?",
    },
    {
      slug: "ratio-sharing",
      question: "Share £120 in the ratio 3 : 5 between Ali and Ben.",
    },
    {
      slug: "indices-and-standard-form",
      question: "How do I calculate (3 × 10^4) × (2 × 10^5) in standard form?",
    },
    {
      slug: "surds",
      question: "How do I simplify √50 and rationalise the denominator?",
    },
    {
      slug: "solving-linear-equations",
      question:
        "Solve the linear equation 5x - 3 = 2x + 12 with unknowns on both sides.",
    },
    {
      slug: "quadratics-expanding-factorising",
      question: "How do I factorise the quadratic x^2 + 7x + 12 = 0?",
    },
    {
      slug: "simultaneous-equations",
      question: "Solve the simultaneous equations 2x + y = 11 and x - y = 4.",
    },
    {
      slug: "sequences-nth-term",
      question: "Find the nth term of the sequence 5, 8, 11, 14.",
    },
    {
      slug: "pythagoras-and-sohcahtoa",
      question:
        "Use Pythagoras or SOHCAHTOA to find the hypotenuse of a right-angled triangle.",
    },
    {
      slug: "circles-and-sectors",
      question:
        "Find the area of a sector of a circle with radius 6 cm in terms of pi.",
    },
    {
      slug: "probability-trees",
      question:
        "Two counters are picked without replacement. Draw a probability tree diagram.",
    },
    {
      slug: "statistics-grouped-mean-histograms",
      question:
        "How do I calculate frequency density for a histogram and estimated mean from a grouped table?",
    },
  ];

  it("accurately identifies all 14 Edexcel 1MA1 topics with high confidence", () => {
    for (const { slug, question } of sampleQuestionsBySlug) {
      const result = detectEdexcelTopic(question);
      expect(result.topic.slug).toBe(slug);
      expect(result.confidence).toBe("high");
      expect(result.matchedSignals.length).toBeGreaterThan(0);
    }
  });

  it("uses sensible fallback heuristics for generic percentage or algebraic inputs", () => {
    const pctResult = detectEdexcelTopic("What is 12% of 250?");
    expect(pctResult.topic.slug).toBe("compound-interest");
    expect(pctResult.confidence).toBe("medium");

    const eqResult = detectEdexcelTopic("x = 14");
    expect(eqResult.topic.slug).toBe("solving-linear-equations");
    expect(eqResult.confidence).toBe("medium");
  });
});
