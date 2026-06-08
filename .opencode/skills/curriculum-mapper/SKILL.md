---
name: curriculum-mapper
description: >
  Use when relating a topic to GCSE domains, prerequisites, or difficulty.
  Maps any Year 8/9 maths topic to its GCSE domain, prerequisites,
  recommended next topics, and difficulty level.
---

# Curriculum Mapper

Use this skill to understand how a topic fits into the broader curriculum.

## Input

```
Topic: <name>
```

## Output

```yaml
topic: <name>
gcse_domain: <one of the six AQA GCSE domains>
prerequisites:
  - <topic>
  - <topic>
recommended_next:
  - <topic>
  - <topic>
difficulty: easy | medium | hard
year_group: 8 | 9
common_in:
  - foundation | higher | both
```

## GCSE Domains

The six AQA GCSE domains used in TopicProgress:

1. **Number** — fractions, decimals, percentages, ratio, proportion, indices, standard form
2. **Algebra** — expressions, equations, inequalities, sequences, graphs, quadratics
3. **Ratio, Proportion & Rates of Change** — ratio, direct/inverse proportion, compound measures
4. **Geometry & Measures** — angles, shapes, Pythagoras, trigonometry, area, volume
5. **Probability** — probability trees, frequency trees, combined events
6. **Statistics** — averages, charts, scatter graphs, correlation

## Source of Truth

Always use `lib/ai/curriculum.ts` for topic definitions and domain mappings.
Do not invent topics or domains that aren't in the curriculum file.
