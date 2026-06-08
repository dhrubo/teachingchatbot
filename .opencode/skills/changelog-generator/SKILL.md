---
name: changelog-generator
description: >
  Use before creating a release or milestone. Generates release notes from
  agents.md and git commit history in the TeachingChatbot repository.
---

# Changelog Generator

Use this skill to generate release notes, milestone summaries, or PR descriptions.

## Input Sources

1. **`agents.md`** — the project's phase-by-phase changelog (primary source)
2. **Git log** — `git log --oneline <range>` for recent commits
3. **PR descriptions** — if available from `gh` CLI

## Output Format

```markdown
## vX.Y.Z (YYYY-MM-DD)

### 🚀 Features
- 

### 🎯 Teaching Improvements
- 

### 🐛 Bug Fixes
- 

### ⚡ Performance
- 

### 🧹 Chores
- 

### 📖 Documentation
- 
```

## Categories for TeachingChatbot

| Category | Example |
|---|---|
| 🚀 Features | New tools, new UI components |
| 🎯 Teaching Improvements | Prompt changes, quiz improvements, curriculum updates |
| 🐛 Bug Fixes | Topic switching, onboarding, quiz bugs |
| ⚡ Performance | Model routing, DB query optimisation |
| 🔒 Security | Auth, ownership validation |
| 🧹 Chores | Dependency updates, cleanup, refactoring |
| 📖 Documentation | README, docs/, contributing guide |

## Process

1. Read `agents.md` for the phase descriptions since the last release
2. Run `git log --oneline --no-decorate <last-release-tag>..HEAD`
3. Cross-reference commits with phase descriptions
4. Group by category
5. Output formatted markdown

## Tips for Free-Tier Models

- Keep commit ranges small (< 30 commits)
- Use `agents.md` as the primary source — it's already summarised
- Git log is secondary for exact timestamps and commit SHAs
