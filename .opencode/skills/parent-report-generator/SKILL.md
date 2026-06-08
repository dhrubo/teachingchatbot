---
name: parent-report-generator
description: >
  Use when generating progress reports for parents. Produces weekly summaries,
  strengths/weaknesses analysis, confidence indicators, and next-study
  recommendations using StudentProfile, TopicProgress, and Goals data.
---

# Parent Report Generator

Use this skill to generate parent-facing progress reports.

## Data Sources

- `StudentProfile` — name, schoolYear, examDate, xp, streak, badges, confidenceNotes
- `TopicProgress` — per-topic status, confidence, score (0-5), attempt counts, gcseDomain
- `StudentGoal` — goals, planSteps, progressPercent, status

## Report Sections

### Weekly Summary
```
Student: <name>
Week ending: <date>
Topics covered: <count>
Questions answered: <count>
XP earned this week: <amount>
Streak: <days>
Badges: <badges earned this week>
```

### Strengths
Topics where:
- Score >= 4
- Confidence >= 4
- Status is "mastered"

### Areas to Improve
Topics where:
- Score <= 2
- Confidence <= 2
- Status is "struggling" or "not_started"

### Confidence Indicators
For each topic:
```
<topic>: score <0-5> / confidence <0-5> / attempts <N>
```

### Next Study Recommendations
Based on:
- Unmastered topics in the same GCSE domain
- In-progress goals
- Upcoming exam date

## Output Format

Produce plain-language markdown suitable for sharing with a parent.
Avoid technical jargon.

```markdown
## Weekly Report for <name>

### Summary
...

### Strengths
- ...

### Areas to Improve
- ...

### Recommendations for Next Week
- ...
```
