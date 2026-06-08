# OpenCode & Superpowers for TeachingChatbot

This project uses [OpenCode](https://opencode.ai) with [Obra Superpowers](https://github.com/obra/superpowers) to provide a structured, quality-focused development workflow.

## Installed Skills

### From Superpowers (bundled)

These workflows activate automatically based on the task:

| Skill | When It Activates |
|---|---|
| `using-superpowers` | Every session — primary dispatcher that routes tasks |
| `brainstorming` | Before writing code — refines requirements through questions |
| `writing-plans` | After design approval — breaks work into bite-sized tasks |
| `executing-plans` | During implementation — batch execution with checkpoints |
| `subagent-driven-development` | Complex tasks — dispatches fresh subagents per task |
| `test-driven-development` | During implementation — RED-GREEN-REFACTOR cycle |
| `systematic-debugging` | When fixing bugs — reproduce → observe → hypothesise → verify → fix → test |
| `requesting-code-review` | Between tasks — reviews against plan before proceeding |
| `receiving-code-review` | When responding to feedback |
| `using-git-worktrees` | Before starting new features — isolated branches |
| `finishing-a-development-branch` | When tasks complete — merge/PR decision |
| `verification-before-completion` | After fixes — ensures the issue is actually resolved |
| `writing-skills` | When creating new skills |

### Project-Specific Skills (in `.opencode/skills/`)

| Skill | How to Load | Purpose |
|---|---|---|
| `code-security-auditor` | `skill tool load code-security-auditor` | Security review before releases |
| `staff-engineer-review` | `skill tool load staff-engineer-review` | Architecture review for big changes |
| `webapp-testing` | `skill tool load webapp-testing` | Validate UI flows and mobile responsiveness |
| `changelog-generator` | `skill tool load changelog-generator` | Generate release notes from agents.md + git log |
| `tutor-lesson-designer` | `skill tool load tutor-lesson-designer` | Design lesson structure for new topics |
| `tutor-quiz-generator` | `skill tool load tutor-quiz-generator` | Generate quiz questions for challenge cards |
| `curriculum-mapper` | `skill tool load curriculum-mapper` | Map topics to GCSE domains and prerequisites |
| `parent-report-generator` | `skill tool load parent-report-generator` | Generate parent-facing progress reports |

## Recommended Daily Workflow

For contributors using OpenCode with this repository:

1. **Start a session** — OpenCode auto-loads `using-superpowers`
2. **Understand the task** — Superpowers routing directs you to the right workflow
3. **Brainstorm** (if needed) — Superpowers `brainstorming` refines the design
4. **Debug first** (if fixing a bug) — Superpowers `systematic-debugging`: reproduce → observe → hypothesise → fix
5. **Write tests** — Superpowers `test-driven-development` (RED-GREEN-REFACTOR)
6. **Implement** — Superpowers `executing-plans` or `subagent-driven-development`
7. **Test the UI** — Load `webapp-testing` to validate flows
8. **Review** — Superpowers `requesting-code-review` auto-review between tasks
9. **Generate changelog** — Load `changelog-generator` before creating a PR or release

## When to Use Project-Specific Skills

| Situation | Load This Skill |
|---|---|
| Fixing a security issue | `code-security-auditor` |
| Changing the database schema | `staff-engineer-review` |
| Changing AI provider config | `staff-engineer-review` |
| Adding a new UI component | `webapp-testing` |
| Creating a release | `changelog-generator` |
| Adding a new maths topic | `tutor-lesson-designer` |
| Writing quiz questions | `tutor-quiz-generator` |
| Mapping topic to GCSE domain | `curriculum-mapper` |
| Generating a parent report | `parent-report-generator` |

## Loading a Skill

Tell OpenCode:

```
use skill tool to load code-security-auditor
```

Or use the native skill tool if available.

## Free-Tier Considerations

This skill stack is designed to work with free-tier models (Gemini 2.5 Flash Lite, Groq Llama, etc.):

- Skills provide structured instructions that reduce model guesswork
- Step-by-step workflows keep context windows manageable
- Local skills avoid network round-trips for skill content
- The `changelog-generator` skill recommends keeping commit ranges small
- Superpowers' `executing-plans` breaks work into 2-5 minute tasks

## Configuration

The OpenCode configuration lives in `.opencode/opencode.json`:

```json
{
  "plugin": ["superpowers@git+https://github.com/obra/superpowers.git"],
  "skills": {
    "paths": [".opencode/skills"]
  }
}
```

Project skills in `.opencode/skills/` take priority over Superpowers built-in skills.
