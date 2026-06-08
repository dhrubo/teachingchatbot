---
name: tutor-lesson-designer
description: >
  Use when adding or updating a topic's lesson structure. Generates lesson plan
  with misconceptions, hints, challenge progression, and XP recommendations
  for the TeachingChatbot tutor.
---

# Tutor Lesson Designer

Use this skill to design lesson content for a topic in the Year 8/9 maths curriculum.

## Input

```
Topic: <name>
Year Group: 8 | 9
Difficulty: easy | medium | hard
Prerequisites: <optional>
```

## Output

### Lesson Plan

```yaml
topic: <name>
year: <8|9>
gcse_domain: <from curriculum.ts>
difficulty: <easy|medium|hard>
prerequisites: <list>

learning_objectives:
  - <objective>
  - <objective>

common_misconceptions:
  - <misconception>
  - <misconception>

teaching_steps:
  - step: 1
    concept: <core idea>
    example: <worked example>
    visual: <shape/bar/arrow description>
  - step: 2
    concept: <scaffolding>
    example: <worked example>
  - step: 3
    concept: <application>
    example: <real-world context>

challenge_progression:
  easy:
    question: <simple recall>
    answer_type: numeric | multiple_choice
  medium:
    question: <multi-step>
    answer_type: numeric | multiple_choice
  hard:
    question: <application>
    answer_type: numeric | text
  boss:
    question: <problem-solving>
    answer_type: numeric | text

xp_recommendations:
  easy: 10
  medium: 20
  hard: 35
  boss: 50
```

## Reference

Use `lib/ai/curriculum.ts` for topic → GCSE domain mappings.
