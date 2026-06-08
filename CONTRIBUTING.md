# Contributing to TeachingChatbot

Thank you for contributing! This project is designed to be developed using **free AI tools** — no paid subscriptions required.

## Code of Conduct

Be kind, constructive, and respectful. This project welcomes contributors of all skill levels.

## Development Philosophy

- **Plan before coding** — understand the problem before writing code
- **Debug before changing** — identify the root cause before fixing
- **Test before merging** — verify correctness before committing
- **Review before shipping** — review architecture, security, and quality

## Prerequisites

- Node.js 20+
- pnpm 9+
- A Gemini API key (free: https://aistudio.google.com/apikey)
- OpenCode (recommended) or your preferred editor

## Recommended Workflow

If you're using **OpenCode**, skills guide you through every step:

```
1. using-superpowers         → Understand the task type
2. brainstorming (if needed) → Refine the design
3. root-cause-analysis       → Identify the actual cause
4. systematic-debugging      → Fix step by step
5. test-driven-development   → Write tests, then implement
6. webapp-testing            → Validate UI flows
7. code-review               → Review before merging
8. changelog-generator       → Generate release notes
```

See `docs/opencode.md` for detailed skill instructions.

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd teachingchatbot

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Add GOOGLE_GENERATIVE_AI_API_KEY, POSTGRES_URL, AUTH_SECRET

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

## Running Tests

```bash
# Unit tests
pnpm test:unit

# E2E tests (requires Playwright)
pnpm test

# Watch mode
pnpm test:unit:watch
```

## Making Changes

### 1. Understand First

Before making changes:
- Read the relevant code
- Check `agents.md` for project history
- Search for related tests
- Check `docs/` for product rules

### 2. Small, Focused Commits

Each commit should:
- Address one logical change
- Include or update tests
- Follow existing code style
- Update documentation if needed

### 3. Code Style

- TypeScript strict mode is enabled
- Use existing patterns (don't introduce new styling conventions)
- Follow Drizzle ORM patterns for database queries
- Keep AI tools model-agnostic

### 4. Testing

- Add tests for new functionality
- Update tests for changed functionality
- Run `pnpm test:unit` before committing

## Project Structure

```
app/                  — Next.js App Router pages and API routes
  (chat)/             — Chat interface and API
  (auth)/             — Authentication
artifacts/            — Artifact document handlers
components/           — React components
docs/                 — Documentation
hooks/                — React hooks
lib/
  ai/                 — AI provider config, prompts, tools, curriculum
  db/                 — Database schema, queries, migrations
tests/                — Test files
.opencode/            — OpenCode configuration and custom skills
```

## Review Process

1. Open a pull request with a clear title and description
2. Reference any related issues
3. Ensure CI passes
4. A maintainer will review within a few days

## Adding Skills

Project-specific OpenCode skills live in `.opencode/skills/`.

Each skill needs:
- A directory named after the skill
- A `SKILL.md` file with YAML frontmatter

See `docs/opencode.md` for guidance, or load the `writing-skills` Superpower.

## Questions?

- Open an issue for bug reports and feature requests
- See `docs/developer.md` for data model reference
- See `docs/product.md` for product rules and limits

Thank you for helping make maths tutoring better for everyone! 🎓
