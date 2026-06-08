---
name: tutor-quiz-generator
description: >
  Use when generating new quiz questions for the teaching chatbot. Creates easy,
  medium, hard, and boss-level questions matching the existing challenge card
  format. Understands Year 8/9 curriculum and GCSE domain mapping.
---

# Tutor Quiz Generator

Use this skill to generate challenge questions for any topic.

## Input

```
Topic: <name>
Year Group: 8 | 9
Count: <number per difficulty>
```

## Output Format

Each question must match the `askQuestion` tool's expected format:

```json
{
  "topic": "<topic>",
  "question": "<question text>",
  "hint": "<hint if student struggles>",
  "options": ["A", "B", "C", "D"],
  "type": "multiple_choice" | "numeric" | "text",
  "correctAnswer": "<correct answer>",
  "difficulty": "easy" | "medium" | "hard" | "boss",
  "xp": <10-50>,
  "gcseDomain": "<from curriculum.ts>"
}
```

## Difficulty Guidelines

| Level | Description | XP |
|---|---|---|
| Easy | Direct recall of one concept | 10 |
| Medium | Multi-step with scaffolding | 20 |
| Hard | Application to unfamiliar context | 35 |
| Boss | Problem-solving combining multiple skills | 50 |

## Question Types

- **multiple_choice** — 4 options, one correct, plausible distractors based on common misconceptions
- **numeric** — expects a number (can use fractions, decimals, negatives)
- **text** — short written answer (for explanations)

## Curriculum Reference

Consult `lib/ai/curriculum.ts` for:
- Year 8 topics and subtopics
- Year 9 topics and subtopics
- GCSE domain mappings

## Tips for Free-Tier Models

- Keep questions concise (1-2 sentences)
- Use round numbers where possible
- Avoid deeply nested multi-step problems
- Plausible wrong answers should reflect real misconceptions
