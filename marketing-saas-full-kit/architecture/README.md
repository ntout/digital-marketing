# AI Agent Reading Guide

> Start here. This file tells you which documents to read and in what order
> before writing any code for this project.

---

## Read these files before every session

### Always required (read first)
1. **`CONTEXT.md`** — data models, roles, story implementation order
2. **`architecture/ARCHITECTURE.md`** — system overview, service boundaries, repo structure, key rules

### Read based on what you are implementing

| Task | Also read |
|------|-----------|
| Any API route or service | `architecture/API-STANDARDS.md` |
| Any AI agent job or guardrails | `architecture/AI-AGENT-RULES.md` |
| Any React component or Next.js page | `architecture/FRONTEND-STANDARDS.md` |
| Any AWS CDK stack or Dockerfile | `architecture/AWS-INFRASTRUCTURE.md` |
| A specific user story | `stories/US-{###}-*.md` + `prompts/US-{###}.md` |

---

## File map

```
CONTEXT.md                          ← data models, roles, story order (read first)
architecture/
  ARCHITECTURE.md                   ← system design, service rules, repo layout
  AWS-INFRASTRUCTURE.md             ← AWS services, specs, naming, networking
  API-STANDARDS.md                  ← route structure, middleware, response format
  AI-AGENT-RULES.md                 ← guardrails, dispatcher, job pattern, limits
  FRONTEND-STANDARDS.md             ← Next.js, components, TanStack Query, auth
stories/
  README.md                         ← story index and dependency graph
  US-001-workspace-auth.md
  US-002-team-roles.md
  US-003-platform-connections.md
  US-004-data-ingestion.md
  US-005-unified-dashboard.md
  US-006-trend-charts.md
  US-007-campaign-breakdown.md
  US-008-anomaly-alerts.md
  US-009-reports.md
  US-010-inapp-campaign-editing.md
  US-011-ad-copy-editing.md
  US-012-bulk-campaign-actions.md
  US-013-ai-action-log.md
  US-014-ai-autonomy-controls.md
  US-015-ai-approval-queue.md
  US-016-ai-budget-optimization.md
  US-017-ai-cross-channel-reallocation.md
  US-018-ai-creative-fatigue.md
  US-019-ai-insights.md
  US-020-ai-attribution.md
prompts/
  HOW-TO-USE.md
  US-001.md → US-020.md            ← ready-to-paste Codex prompts per story
```

---

## Non-negotiable rules (memorize these)

1. **Every query is scoped to `workspaceId`** — derive it from `req.user`, never from request params or body.
2. **All external platform API calls go through `PlatformApiService`** — never call Meta/Google/TikTok APIs directly.
3. **Every AI action goes through `AiGuardrails.check()` first** — if `allowed: false`, exit immediately.
4. **Every AI action goes through `AiActionDispatcher.dispatch()`** — never write to `CampaignChangeLog` directly from an AI job.
5. **No silent AI actions** — every path through the dispatcher creates a database record.
6. **OAuth tokens are encrypted at rest** — use `packages/utils/src/encrypt.ts`. Never store plaintext tokens.
7. **No secrets in environment variables in production** — read from AWS Secrets Manager via `packages/utils/src/secrets.ts`.
8. **Tests first** — write tests for every acceptance criterion before writing implementation code.
9. **API service and Worker service are separate ECS tasks** — they do not call each other via HTTP. Communication is via Redis queue only.
10. **Two Prisma clients** — `dbWrite` for mutations, `dbRead` (replica) for analytics queries. Never mix them.
