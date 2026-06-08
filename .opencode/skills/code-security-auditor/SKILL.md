---
name: code-security-auditor
description: >
  Use before major releases or PRs touching auth, data access, or API routes.
  Reviews authentication, ownership validation, guest accounts, database queries,
  and environment secrets in the TeachingChatbot codebase.
---

# Code Security Auditor

Use this skill when reviewing security-sensitive changes in TeachingChatbot.

Target areas:
- Authentication (`app/(auth)/`)
- Student profiles and ownership (`lib/db/queries/student.ts`)
- Guest accounts (`app/api/auth/guest`)
- Chat API routes (`app/(chat)/api/chat/`)
- Database queries (`lib/db/queries/`)
- Error handling and secrets exposure (`lib/errors.ts`)
- Environment variable validation (`lib/ai/providers.ts`, `.env.example`)

## Checklist

### Authentication
- Are all API routes protected by `auth()`?
- Is the user's `id` verified against the resource owner before any mutation?
- Do guest users have appropriate restrictions?

### Ownership
- After fetching a resource, is `resource.userId === session.user.id` checked?
- Are batch operations scoped to the authenticated user?

### Data Access
- Do database queries use parameterised inputs?
- Are there any SQL injection vectors?
- Are soft-delete / expiry queries properly scoped?

### Secrets
- Are API keys read from env vars only?
- Are there any accidental secrets in logs, error messages, or streamed responses?
- Is the `.env.example` free of real secrets?

### Rate Limiting
- Are API routes rate-limited where appropriate?
- Do guest users have stricter limits than registered users?

## Output

Report findings as:
- **CRITICAL** — must fix before merging
- **HIGH** — should fix before merging
- **MEDIUM** — worth fixing
- **LOW** — nice to have
